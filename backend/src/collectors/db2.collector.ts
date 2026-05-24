import * as k8s from '@kubernetes/client-node';
import config from '../config';
import logger from '../utils/logger';
import { DB2Health, HealthStatus } from '../types';

export class DB2Collector {
  private k8sApi: k8s.CoreV1Api;
  private k8sExec: k8s.Exec;
  private kc: k8s.KubeConfig;

  constructor() {
    this.kc = new k8s.KubeConfig();
    
    if (config.openshift.kubeconfigPath) {
      this.kc.loadFromFile(config.openshift.kubeconfigPath);
    } else {
      try {
        this.kc.loadFromCluster();
      } catch (error) {
        this.kc.loadFromDefault();
      }
    }
    
    this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
    this.k8sExec = new k8s.Exec(this.kc);
  }

  /**
   * Collect DB2 health information
   */
  async collectDB2Health(): Promise<DB2Health> {
    try {
      logger.debug('Collecting DB2 health');

      // Get DB2 pod
      const podName = await this.getDB2PodName();
      if (!podName) {
        return this.createErrorHealth('No DB2 pod found');
      }

      // Check if DB2 engine is running
      const engineRunning = await this.checkDB2Engine(podName);

      // Test database connection
      const connectionStatus = await this.testDB2Connection(podName);

      // Get database state
      const databaseState = await this.getDatabaseState(podName);

      // Get active connections (simplified for now)
      const activeConnections = await this.getActiveConnections(podName);

      // Get lock waits (simplified for now)
      const lockWaits = 0; // Will implement later with proper DB2 queries

      // Determine health status
      const status = this.determineDB2HealthStatus(
        engineRunning,
        connectionStatus,
        databaseState
      );

      // Generate insights
      const { explanation, recommendation } = this.generateDB2Insights(
        status,
        engineRunning,
        connectionStatus,
        databaseState,
        activeConnections
      );

      const db2Health: DB2Health = {
        status,
        engineRunning,
        connectionStatus,
        databaseState,
        activeConnections,
        lockWaits,
        explanation,
        recommendation,
        lastChecked: new Date()
      };

      logger.info('DB2 health collected', {
        status,
        engineRunning,
        connectionStatus,
        databaseState
      });

      return db2Health;

    } catch (error) {
      logger.error('Error collecting DB2 health', { error });
      return this.createErrorHealth('Failed to collect DB2 health information');
    }
  }

  /**
   * Get DB2 pod name
   */
  private async getDB2PodName(): Promise<string | null> {
    try {
      const podsResponse = await this.k8sApi.listNamespacedPod(
        config.db2.namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        config.db2.podLabel
      );

      if (podsResponse.body.items && podsResponse.body.items.length > 0) {
        return podsResponse.body.items[0].metadata?.name || null;
      }

      return null;
    } catch (error) {
      logger.error('Error getting DB2 pod name', { error });
      return null;
    }
  }

  /**
   * Check if DB2 engine is running
   */
  private async checkDB2Engine(podName: string): Promise<boolean> {
    try {
      // Check if db2sysc process is running
      const command = ['sh', '-c', 'ps aux | grep db2sysc | grep -v grep'];
      const result = await this.execInPod(podName, command);
      
      return result.includes('db2sysc');
    } catch (error) {
      logger.error('Error checking DB2 engine', { error, podName });
      return false;
    }
  }

  /**
   * Test DB2 connection
   */
  private async testDB2Connection(podName: string): Promise<boolean> {
    try {
      // Try to connect to database
      const command = [
        'su', '-', config.db2.user, '-c',
        `db2 connect to ${config.db2.database}`
      ];
      const result = await this.execInPod(podName, command);
      
      return result.includes('Database Connection Information') || 
             result.includes('SQL1024N');  // Already connected
    } catch (error) {
      logger.error('Error testing DB2 connection', { error, podName });
      return false;
    }
  }

  /**
   * Get database state
   */
  private async getDatabaseState(podName: string): Promise<string> {
    try {
      const command = [
        'su', '-', config.db2.user, '-c',
        `db2 list active databases`
      ];
      const result = await this.execInPod(podName, command);
      
      if (result.includes('Active')) {
        return 'Active';
      } else if (result.includes('No data')) {
        return 'Inactive';
      } else {
        return 'Unknown';
      }
    } catch (error) {
      logger.error('Error getting database state', { error, podName });
      return 'Unknown';
    }
  }

  /**
   * Get active connections count
   */
  private async getActiveConnections(podName: string): Promise<number> {
    try {
      const command = [
        'su', '-', config.db2.user, '-c',
        `db2 list applications | grep -c ${config.db2.database}`
      ];
      const result = await this.execInPod(podName, command);
      
      const count = parseInt(result.trim(), 10);
      return isNaN(count) ? 0 : count;
    } catch (error) {
      logger.debug('Error getting active connections', { error, podName });
      return 0;
    }
  }

  /**
   * Execute command in pod
   */
  private async execInPod(podName: string, command: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      let output = '';
      let errorOutput = '';

      this.k8sExec.exec(
        config.db2.namespace,
        podName,
        'db2', // container name
        command,
        process.stdout,
        process.stderr,
        process.stdin,
        false,
        (status) => {
          if (status.status === 'Success') {
            resolve(output);
          } else {
            reject(new Error(errorOutput || 'Command execution failed'));
          }
        }
      ).then((conn) => {
        conn.on('data', (data: Buffer) => {
          output += data.toString();
        });
        conn.on('error', (data: Buffer) => {
          errorOutput += data.toString();
        });
      }).catch(reject);
    });
  }

  /**
   * Determine DB2 health status
   */
  private determineDB2HealthStatus(
    engineRunning: boolean,
    connectionStatus: boolean,
    databaseState: string
  ): HealthStatus {
    if (!engineRunning) {
      return HealthStatus.CRITICAL;
    }

    if (!connectionStatus) {
      return HealthStatus.CRITICAL;
    }

    if (databaseState === 'Unknown') {
      return HealthStatus.WARNING;
    }

    if (databaseState === 'Inactive') {
      return HealthStatus.WARNING;
    }

    return HealthStatus.HEALTHY;
  }

  /**
   * Generate beginner-friendly insights
   */
  private generateDB2Insights(
    status: HealthStatus,
    engineRunning: boolean,
    connectionStatus: boolean,
    databaseState: string,
    activeConnections: number
  ): { explanation: string; recommendation: string } {
    let explanation = '';
    let recommendation = '';

    switch (status) {
      case HealthStatus.HEALTHY:
        explanation = `DB2 is running perfectly! The database engine is active, connections are working, and the database is ready to use. Currently ${activeConnections} active connection(s).`;
        recommendation = 'No action needed. Everything is working as expected.';
        break;

      case HealthStatus.WARNING:
        if (databaseState === 'Inactive') {
          explanation = 'DB2 engine is running, but the database is not active. This means the database needs to be activated before it can be used.';
          recommendation = 'Activate the database by connecting to it. Run: db2 activate database SAMPLE';
        } else if (databaseState === 'Unknown') {
          explanation = 'DB2 engine is running, but we cannot determine the database state. This might be a temporary issue.';
          recommendation = 'Try connecting to the database manually to verify it works. Check DB2 diagnostic logs if the issue persists.';
        }
        break;

      case HealthStatus.CRITICAL:
        if (!engineRunning) {
          explanation = 'DB2 engine is not running! The database process (db2sysc) is not active. No database operations are possible.';
          recommendation = 'Start the DB2 engine. Log into the pod and run: db2start. If it fails, check the db2diag.log for errors.';
        } else if (!connectionStatus) {
          explanation = 'DB2 engine is running, but we cannot connect to the database. This could be a configuration issue or the database is in a bad state.';
          recommendation = 'Check database configuration. Try: db2 list db directory. Verify the database exists and is not corrupted.';
        }
        break;

      case HealthStatus.UNKNOWN:
        explanation = 'Unable to determine DB2 health. There might be a communication issue with the pod.';
        recommendation = 'Check if the DB2 pod is running and accessible.';
        break;
    }

    return { explanation, recommendation };
  }

  /**
   * Create error health object
   */
  private createErrorHealth(message: string): DB2Health {
    return {
      status: HealthStatus.UNKNOWN,
      engineRunning: false,
      connectionStatus: false,
      databaseState: 'Unknown',
      activeConnections: 0,
      lockWaits: 0,
      explanation: message,
      recommendation: 'Check the DB2 pod and OpenShift connection.',
      lastChecked: new Date()
    };
  }
}

export default new DB2Collector();

// Made with Bob
