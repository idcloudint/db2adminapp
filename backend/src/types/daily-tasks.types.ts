// Daily Admin Tasks Types

export interface DailyTask {
  id: string;
  name: string;
  description: string;
  category: 'availability' | 'storage' | 'logs' | 'connections' | 'locks' | 'backup';
  command: string;
  threshold?: {
    warning?: number;
    critical?: number;
  };
}

export interface TaskResult {
  taskId: string;
  taskName: string;
  status: 'pass' | 'warning' | 'fail' | 'error';
  message: string;
  details?: any;
  timestamp: Date;
  duration: number;
  command?: string;
  stdout?: string;
  stderr?: string;
  metrics?: Record<string, any>;
  recommendations?: string[];
}

export interface TaskExecutionEvent {
  type: 'init' | 'task-start' | 'task-complete' | 'complete' | 'error';
  taskId?: string;
  taskName?: string;
  progress?: number;
  result?: TaskResult;
  summary?: TaskRunSummary;
  tasks?: Array<{ id: string; name: string }>;
  error?: string;
}

export interface TaskRunSummary {
  runId: string;
  startTime: Date;
  endTime: Date;
  totalTasks: number;
  passed: number;
  warnings: number;
  failed: number;
  errors: number;
  results: TaskResult[];
}

export interface TaskHistory {
  runId: string;
  timestamp: Date;
  summary: {
    total: number;
    passed: number;
    warnings: number;
    failed: number;
  };
}

// Made with Bob
