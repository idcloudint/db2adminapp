// Health Status Types
export enum HealthStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  CRITICAL = 'critical',
  UNKNOWN = 'unknown'
}

export interface PodHealth {
  status: HealthStatus;
  podName: string;
  namespace: string;
  phase: string;
  restartCount: number;
  ready: boolean;
  age: string;
  events: PodEvent[];
  explanation: string;
  recommendation: string;
  lastChecked: string;
}

export interface PodEvent {
  type: string;
  reason: string;
  message: string;
  count: number;
  firstTimestamp: string;
  lastTimestamp: string;
}

export interface DB2Health {
  status: HealthStatus;
  engineRunning: boolean;
  connectionStatus: boolean;
  databaseState: string;
  activeConnections: number;
  lockWaits: number;
  explanation: string;
  recommendation: string;
  lastChecked: string;
}

export interface StorageHealth {
  status: HealthStatus;
  pvcStatus: {
    name: string;
    capacity: string;
    used: string;
    usedPercentage: number;
    status: string;
  };
  tablespaces: any[];
  transactionLogs: {
    totalLogSpace: number;
    usedLogSpace: number;
    usedPercentage: number;
    status: HealthStatus;
  };
  explanation: string;
  recommendation: string;
  lastChecked: string;
}

export interface BackupHealth {
  status: HealthStatus;
  lastBackupTime: string | null;
  backupAge: string;
  backupValid: boolean;
  backupSize: string;
  explanation: string;
  recommendation: string;
  lastChecked: string;
}

export interface HealthSummary {
  overallStatus: HealthStatus;
  pod: PodHealth;
  db2: DB2Health;
  storage: StorageHealth;
  backup: BackupHealth;
  incidents: any[];
  timestamp: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface WebSocketMessage {
  type: 'health_update' | 'incident_created' | 'incident_updated' | 'heartbeat';
  payload: any;
  timestamp: string;
}

// Made with Bob
