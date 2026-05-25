import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import * as tar from 'tar';
import logger from '../utils/logger';
import config from '../config';
import {
  LogCollectionRequest,
  LogCollectionJob,
  LogComponent,
  CollectionHistory,
  NFSConfig
} from '../types/log-collector.types';

const execAsync = promisify(exec);
const fsPromises = fs.promises;

class LogCollectorService {
  private collectionJobs: Map<string, LogCollectionJob> = new Map();
  private collectionHistory: CollectionHistory[] = [];
  private readonly outputDir = '/tmp/db2-logs';
  
  // NFS configuration (would be loaded from config)
  private nfsConfig: NFSConfig = {
    server: process.env.NFS_SERVER || 'nfs-server.example.com',
    path: process.env.NFS_PATH || '/exports/db2-logs',
    mountPoint: process.env.NFS_MOUNT || '/mnt/nfs/db2-logs',
    enabled: process.env.NFS_ENABLED === 'true'
  };

  constructor() {
    // Ensure output directory exists
    this.ensureOutputDirectory();
  }

  /**
   * Ensure output directory exists
   */
  private async ensureOutputDirectory(): Promise<void> {
    try {
      await fsPromises.mkdir(this.outputDir, { recursive: true });
    } catch (error: any) {
      logger.error('Failed to create output directory', { error: error.message });
    }
  }

  /**
   * Start log collection
   */
  async startCollection(request: LogCollectionRequest): Promise<LogCollectionJob> {
    const jobId = uuidv4();
    const startTime = new Date();

    const job: LogCollectionJob = {
      jobId,
      status: 'queued',
      progress: 0,
      startTime,
      components: request.includeComponents.map(component => ({
        component,
        status: 'pending'
      }))
    };

    this.collectionJobs.set(jobId, job);

    logger.info('Starting log collection', { 
      jobId, 
      components: request.includeComponents,
      caseNumber: request.caseNumber 
    });

    // Start collection in background
    this.performCollection(jobId, request).catch(error => {
      logger.error('Log collection failed', { jobId, error: error.message });
      job.status = 'error';
      job.error = error.message;
    });

    return job;
  }

  /**
   * Perform the actual log collection
   */
  private async performCollection(
    jobId: string,
    request: LogCollectionRequest
  ): Promise<void> {
    const job = this.collectionJobs.get(jobId);
    if (!job) return;

    try {
      job.status = 'collecting';
      const collectionDir = path.join(this.outputDir, jobId);
      await fsPromises.mkdir(collectionDir, { recursive: true });

      const totalComponents = request.includeComponents.length;
      let completedComponents = 0;

      // Collect each component
      for (const component of request.includeComponents) {
        const componentStatus = job.components.find(c => c.component === component);
        if (!componentStatus) continue;

        componentStatus.status = 'collecting';
        
        try {
          await this.collectComponent(component, collectionDir, request);
          componentStatus.status = 'complete';
          completedComponents++;
          job.progress = Math.round((completedComponents / totalComponents) * 100);
        } catch (error: any) {
          componentStatus.status = 'error';
          componentStatus.error = error.message;
          logger.error('Component collection failed', { 
            jobId, 
            component, 
            error: error.message 
          });
        }
      }

      // Compress the collected logs
      job.status = 'compressing';
      const archiveName = `db2-logs-${jobId}-${Date.now()}.tar.gz`;
      const archivePath = path.join(this.outputDir, archiveName);
      
      await tar.create(
        {
          gzip: true,
          file: archivePath,
          cwd: this.outputDir
        },
        [jobId]
      );

      const stats = await fsPromises.stat(archivePath);
      job.outputFile = archiveName;

      // Upload to NFS if enabled
      if (this.nfsConfig.enabled) {
        job.status = 'uploading';
        await this.uploadToNFS(archivePath, archiveName);
        job.nfsPath = path.join(this.nfsConfig.mountPoint, archiveName);
      }

      // Generate download URL
      job.downloadUrl = `/api/logs/download/${archiveName}`;
      job.status = 'complete';
      job.endTime = new Date();

      // Add to history
      this.collectionHistory.unshift({
        jobId,
        timestamp: job.startTime,
        components: request.includeComponents,
        status: 'complete',
        fileSize: stats.size,
        nfsPath: job.nfsPath
      });

      // Keep only last 100 collections
      if (this.collectionHistory.length > 100) {
        this.collectionHistory = this.collectionHistory.slice(0, 100);
      }

      logger.info('Log collection completed', { 
        jobId, 
        archiveName, 
        size: stats.size 
      });

    } catch (error: any) {
      job.status = 'error';
      job.error = error.message;
      job.endTime = new Date();
      logger.error('Log collection failed', { jobId, error: error.message });
    }
  }

  /**
   * Collect a specific component
   */
  private async collectComponent(
    component: LogComponent,
    outputDir: string,
    request: LogCollectionRequest
  ): Promise<void> {
    const componentDir = path.join(outputDir, component);
    await fsPromises.mkdir(componentDir, { recursive: true });

    switch (component) {
      case 'db2diag':
        await this.collectDB2Diag(componentDir, request);
        break;
      case 'db2support':
        await this.collectDB2Support(componentDir);
        break;
      case 'db_config':
        await this.collectDBConfig(componentDir);
        break;
      case 'instance_config':
        await this.collectInstanceConfig(componentDir);
        break;
      case 'backup_history':
        await this.collectBackupHistory(componentDir);
        break;
      case 'hadr_status':
        await this.collectHADRStatus(componentDir);
        break;
      case 'package_cache':
        await this.collectPackageCache(componentDir);
        break;
      case 'lock_waits':
        await this.collectLockWaits(componentDir);
        break;
      case 'sql_errors':
        await this.collectSQLErrors(componentDir);
        break;
    }
  }

  /**
   * Collect DB2 diagnostic log
   */
  private async collectDB2Diag(outputDir: string, _request: LogCollectionRequest): Promise<void> {
    try {
      const { stdout } = await execAsync('db2diag -A', {
        timeout: 60000,
        env: { ...process.env, DB2INSTANCE: config.db2.user }
      });
      
      await fsPromises.writeFile(
        path.join(outputDir, 'db2diag.log'),
        stdout
      );
    } catch (error: any) {
      logger.error('Failed to collect db2diag', { error: error.message });
      throw error;
    }
  }

  /**
   * Collect DB2 support information
   */
  private async collectDB2Support(outputDir: string): Promise<void> {
    try {
      const { stdout } = await execAsync('db2support . -d SAMPLE -s', {
        timeout: 300000, // 5 minutes
        env: { ...process.env, DB2INSTANCE: config.db2.user }
      });
      
      await fsPromises.writeFile(
        path.join(outputDir, 'db2support.txt'),
        stdout
      );
    } catch (error: any) {
      logger.error('Failed to collect db2support', { error: error.message });
      throw error;
    }
  }

  /**
   * Collect database configuration
   */
  private async collectDBConfig(outputDir: string): Promise<void> {
    try {
      const { stdout } = await execAsync('db2 get db cfg for SAMPLE', {
        timeout: 30000,
        env: { ...process.env, DB2INSTANCE: config.db2.user }
      });
      
      await fsPromises.writeFile(
        path.join(outputDir, 'db_config.txt'),
        stdout
      );
    } catch (error: any) {
      logger.error('Failed to collect db config', { error: error.message });
      throw error;
    }
  }

  /**
   * Collect instance configuration
   */
  private async collectInstanceConfig(outputDir: string): Promise<void> {
    try {
      const { stdout } = await execAsync('db2 get dbm cfg', {
        timeout: 30000,
        env: { ...process.env, DB2INSTANCE: config.db2.user }
      });
      
      await fsPromises.writeFile(
        path.join(outputDir, 'instance_config.txt'),
        stdout
      );
    } catch (error: any) {
      logger.error('Failed to collect instance config', { error: error.message });
      throw error;
    }
  }

  /**
   * Collect backup history
   */
  private async collectBackupHistory(outputDir: string): Promise<void> {
    try {
      const { stdout } = await execAsync(
        'db2 "SELECT * FROM SYSIBMADM.DB_HISTORY WHERE OPERATION=\'B\' ORDER BY START_TIME DESC FETCH FIRST 50 ROWS ONLY"',
        {
          timeout: 30000,
          env: { ...process.env, DB2INSTANCE: config.db2.user }
        }
      );
      
      await fsPromises.writeFile(
        path.join(outputDir, 'backup_history.txt'),
        stdout
      );
    } catch (error: any) {
      logger.error('Failed to collect backup history', { error: error.message });
      throw error;
    }
  }

  /**
   * Collect HADR status
   */
  private async collectHADRStatus(outputDir: string): Promise<void> {
    try {
      const { stdout } = await execAsync('db2pd -hadr -db SAMPLE', {
        timeout: 30000,
        env: { ...process.env, DB2INSTANCE: config.db2.user }
      });
      
      await fsPromises.writeFile(
        path.join(outputDir, 'hadr_status.txt'),
        stdout
      );
    } catch (error: any) {
      logger.error('Failed to collect HADR status', { error: error.message });
      throw error;
    }
  }

  /**
   * Collect package cache statistics
   */
  private async collectPackageCache(outputDir: string): Promise<void> {
    try {
      const { stdout } = await execAsync(
        'db2 "SELECT * FROM TABLE(MON_GET_PKG_CACHE_STMT(NULL,NULL,NULL,-2)) ORDER BY TOTAL_CPU_TIME DESC FETCH FIRST 100 ROWS ONLY"',
        {
          timeout: 30000,
          env: { ...process.env, DB2INSTANCE: config.db2.user }
        }
      );
      
      await fsPromises.writeFile(
        path.join(outputDir, 'package_cache.txt'),
        stdout
      );
    } catch (error: any) {
      logger.error('Failed to collect package cache', { error: error.message });
      throw error;
    }
  }

  /**
   * Collect lock wait information
   */
  private async collectLockWaits(outputDir: string): Promise<void> {
    try {
      const { stdout } = await execAsync(
        'db2 "SELECT * FROM TABLE(MON_GET_CONNECTION(NULL,-2)) WHERE LOCK_WAIT_TIME > 0 ORDER BY LOCK_WAIT_TIME DESC"',
        {
          timeout: 30000,
          env: { ...process.env, DB2INSTANCE: config.db2.user }
        }
      );
      
      await fsPromises.writeFile(
        path.join(outputDir, 'lock_waits.txt'),
        stdout
      );
    } catch (error: any) {
      logger.error('Failed to collect lock waits', { error: error.message });
      throw error;
    }
  }

  /**
   * Collect recent SQL errors
   */
  private async collectSQLErrors(outputDir: string): Promise<void> {
    try {
      const { stdout } = await execAsync('db2diag -rc 3 -H 24', {
        timeout: 30000,
        env: { ...process.env, DB2INSTANCE: config.db2.user }
      });
      
      await fsPromises.writeFile(
        path.join(outputDir, 'sql_errors.txt'),
        stdout
      );
    } catch (error: any) {
      logger.error('Failed to collect SQL errors', { error: error.message });
      throw error;
    }
  }

  /**
   * Upload to NFS server
   */
  private async uploadToNFS(sourcePath: string, fileName: string): Promise<void> {
    try {
      // Ensure NFS mount point exists
      await fsPromises.mkdir(this.nfsConfig.mountPoint, { recursive: true });

      // Copy file to NFS
      const destPath = path.join(this.nfsConfig.mountPoint, fileName);
      await fsPromises.copyFile(sourcePath, destPath);

      logger.info('File uploaded to NFS', { fileName, destPath });
    } catch (error: any) {
      logger.error('Failed to upload to NFS', { error: error.message });
      throw error;
    }
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): LogCollectionJob | null {
    return this.collectionJobs.get(jobId) || null;
  }

  /**
   * Get collection history
   */
  getHistory(): CollectionHistory[] {
    return this.collectionHistory;
  }

  /**
   * Get NFS configuration
   */
  getNFSConfig(): NFSConfig {
    return this.nfsConfig;
  }

  /**
   * Update NFS configuration
   */
  updateNFSConfig(config: Partial<NFSConfig>): void {
    this.nfsConfig = { ...this.nfsConfig, ...config };
  }
}

export default new LogCollectorService();

// Made with Bob
