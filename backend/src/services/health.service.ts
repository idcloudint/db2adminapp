import openshiftCollector from '../collectors/openshift.collector';
import db2Collector from '../collectors/db2.collector';
import logger from '../utils/logger';
import { 
  HealthSummary, 
  HealthStatus, 
  PodHealth, 
  DB2Health,
  StorageHealth,
  BackupHealth
} from '../types';

export class HealthService {
  private latestHealth: HealthSummary | null = null;

  /**
   * Get overall health summary
   */
  async getHealthSummary(): Promise<HealthSummary> {
    try {
      logger.debug('Getting health summary');

      // Collect health from all sources
      const pod = await openshiftCollector.collectPodHealth();
      const db2 = await db2Collector.collectDB2Health();
      
      // Placeholder for storage and backup (will implement later)
      const storage = this.getPlaceholderStorage();
      const backup = this.getPlaceholderBackup();

      // Determine overall status
      const overallStatus = this.determineOverallStatus(pod, db2, storage, backup);

      const summary: HealthSummary = {
        overallStatus,
        pod,
        db2,
        storage,
        backup,
        incidents: [], // Will implement incident tracking later
        timestamp: new Date()
      };

      this.latestHealth = summary;
      logger.info('Health summary generated', { overallStatus });

      return summary;

    } catch (error) {
      logger.error('Error getting health summary', { error });
      throw error;
    }
  }

  /**
   * Get latest cached health
   */
  getLatestHealth(): HealthSummary | null {
    return this.latestHealth;
  }

  /**
   * Determine overall health status
   */
  private determineOverallStatus(
    pod: PodHealth,
    db2: DB2Health,
    storage: StorageHealth,
    backup: BackupHealth
  ): HealthStatus {
    const statuses = [pod.status, db2.status, storage.status, backup.status];

    // If any component is critical, overall is critical
    if (statuses.includes(HealthStatus.CRITICAL)) {
      return HealthStatus.CRITICAL;
    }

    // If any component is warning, overall is warning
    if (statuses.includes(HealthStatus.WARNING)) {
      return HealthStatus.WARNING;
    }

    // If any component is unknown, overall is unknown
    if (statuses.includes(HealthStatus.UNKNOWN)) {
      return HealthStatus.UNKNOWN;
    }

    // All healthy
    return HealthStatus.HEALTHY;
  }

  /**
   * Placeholder for storage health (will implement later)
   */
  private getPlaceholderStorage(): StorageHealth {
    return {
      status: HealthStatus.UNKNOWN,
      pvcStatus: {
        name: 'N/A',
        capacity: 'N/A',
        used: 'N/A',
        usedPercentage: 0,
        status: 'Unknown'
      },
      tablespaces: [],
      transactionLogs: {
        totalLogSpace: 0,
        usedLogSpace: 0,
        usedPercentage: 0,
        status: HealthStatus.UNKNOWN
      },
      explanation: 'Storage monitoring not yet implemented',
      recommendation: 'Storage monitoring will be available soon',
      lastChecked: new Date()
    };
  }

  /**
   * Placeholder for backup health (will implement later)
   */
  private getPlaceholderBackup(): BackupHealth {
    return {
      status: HealthStatus.UNKNOWN,
      lastBackupTime: null,
      backupAge: 'N/A',
      backupValid: false,
      backupSize: 'N/A',
      explanation: 'Backup monitoring not yet implemented',
      recommendation: 'Backup monitoring will be available soon',
      lastChecked: new Date()
    };
  }
}

export default new HealthService();

// Made with Bob
