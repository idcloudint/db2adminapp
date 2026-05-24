// Health Status Types
export enum HealthStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  CRITICAL = 'critical',
  UNKNOWN = 'unknown'
}

export enum Severity {
  P0 = 'P0', // Critical - System down
  P1 = 'P1', // High - Major functionality impaired
  P2 = 'P2', // Medium - Minor functionality impaired
  P3 = 'P3'  // Low - Cosmetic or minor issues
}

// Pod Health Types
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
  lastChecked: Date;
}

export interface PodEvent {
  type: string;
  reason: string;
  message: string;
  count: number;
  firstTimestamp: Date;
  lastTimestamp: Date;
}

// DB2 Health Types
export interface DB2Health {
  status: HealthStatus;
  engineRunning: boolean;
  connectionStatus: boolean;
  databaseState: string;
  activeConnections: number;
  lockWaits: number;
  explanation: string;
  recommendation: string;
  lastChecked: Date;
}

// Storage Health Types
export interface StorageHealth {
  status: HealthStatus;
  pvcStatus: PVCStatus;
  tablespaces: TablespaceInfo[];
  transactionLogs: TransactionLogInfo;
  explanation: string;
  recommendation: string;
  lastChecked: Date;
}

export interface PVCStatus {
  name: string;
  capacity: string;
  used: string;
  usedPercentage: number;
  status: string;
}

export interface TablespaceInfo {
  name: string;
  type: string;
  totalPages: number;
  usablePages: number;
  usedPages: number;
  freePages: number;
  usedPercentage: number;
  state: string;
}

export interface TransactionLogInfo {
  totalLogSpace: number;
  usedLogSpace: number;
  usedPercentage: number;
  status: HealthStatus;
}

// Backup Health Types
export interface BackupHealth {
  status: HealthStatus;
  lastBackupTime: Date | null;
  backupAge: string;
  backupValid: boolean;
  backupSize: string;
  explanation: string;
  recommendation: string;
  lastChecked: Date;
}

// Overall Health Summary
export interface HealthSummary {
  overallStatus: HealthStatus;
  pod: PodHealth;
  db2: DB2Health;
  storage: StorageHealth;
  backup: BackupHealth;
  incidents: Incident[];
  timestamp: Date;
}

// Incident Types
export interface Incident {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  explanation: string;
  recommendation: string;
  evidence: Evidence[];
  status: 'open' | 'investigating' | 'resolved';
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export interface Evidence {
  type: 'log' | 'event' | 'metric' | 'command_output';
  source: string;
  content: string;
  timestamp: Date;
}

// Daily Report Types
export interface DailyReport {
  date: string;
  summary: string;
  healthChecks: HealthCheckResult[];
  incidents: Incident[];
  recommendations: string[];
  metrics: DailyMetrics;
  generatedAt: Date;
}

export interface HealthCheckResult {
  component: string;
  status: HealthStatus;
  message: string;
  timestamp: Date;
}

export interface DailyMetrics {
  avgRestartCount: number;
  avgActiveConnections: number;
  maxStorageUsage: number;
  incidentCount: number;
  criticalIncidents: number;
}

// Dictionary Types
export interface DictionaryTerm {
  term: string;
  category: 'openshift' | 'db2' | 'storage' | 'backup' | 'general';
  shortDefinition: string;
  detailedExplanation: string;
  examples: string[];
  relatedTerms: string[];
}

// Configuration Types
export interface AppConfig {
  port: number;
  nodeEnv: string;
  db2: DB2Config;
  openshift: OpenShiftConfig;
  collection: CollectionConfig;
  logging: LoggingConfig;
  cors: CorsConfig;
  websocket: WebSocketConfig;
}

export interface DB2Config {
  namespace: string;
  podLabel: string;
  service: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export interface OpenShiftConfig {
  kubeconfigPath?: string;
}

export interface CollectionConfig {
  intervalPod: number;
  intervalDB2: number;
  intervalStorage: number;
  intervalBackup: number;
}

export interface LoggingConfig {
  level: string;
  file: string;
}

export interface CorsConfig {
  origin: string;
}

export interface WebSocketConfig {
  heartbeatInterval: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

// WebSocket Message Types
export interface WebSocketMessage {
  type: 'health_update' | 'incident_created' | 'incident_updated' | 'heartbeat';
  payload: any;
  timestamp: Date;
}

// Made with Bob
