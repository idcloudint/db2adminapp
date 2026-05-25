// IBM Support Log Collector Types

export interface LogCollectionRequest {
  includeComponents: LogComponent[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  caseNumber?: string;
  description?: string;
}

export type LogComponent = 
  | 'db2diag'
  | 'db2support'
  | 'db_config'
  | 'instance_config'
  | 'backup_history'
  | 'hadr_status'
  | 'package_cache'
  | 'lock_waits'
  | 'sql_errors';

export interface LogCollectionJob {
  jobId: string;
  status: 'queued' | 'collecting' | 'compressing' | 'uploading' | 'complete' | 'error';
  progress: number;
  startTime: Date;
  endTime?: Date;
  components: LogComponentStatus[];
  outputFile?: string;
  nfsPath?: string;
  downloadUrl?: string;
  error?: string;
}

export interface LogComponentStatus {
  component: LogComponent;
  status: 'pending' | 'collecting' | 'complete' | 'error';
  size?: number;
  error?: string;
}

export interface CollectionHistory {
  jobId: string;
  timestamp: Date;
  components: LogComponent[];
  status: string;
  fileSize: number;
  nfsPath?: string;
}

export interface NFSConfig {
  server: string;
  path: string;
  mountPoint: string;
  enabled: boolean;
}

export interface LogCollectionResult {
  jobId: string;
  success: boolean;
  archivePath: string;
  archiveSize: number;
  components: {
    component: LogComponent;
    collected: boolean;
    size: number;
    error?: string;
  }[];
  duration: number;
  timestamp: Date;
}

// Made with Bob
