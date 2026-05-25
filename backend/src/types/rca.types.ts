// Root Cause Analysis Types

export interface RCARequest {
  problemDescription: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  affectedComponents?: string[];
}

export interface RCAAnalysis {
  id: string;
  timestamp: Date;
  problemDescription: string;
  aiAnalysis: {
    technicalSummary: string;
    executiveSummary: string;
    likelyRootCauses: string[];
    recommendedCommands: string[];
    confidence: number;
  };
  commandResults?: CommandResult[];
  diagnosticLogAnalysis?: DiagnosticLogAnalysis;
  remediationSteps: RemediationStep[];
  status: 'analyzing' | 'complete' | 'error';
}

export interface CommandResult {
  command: string;
  output: string;
  exitCode: number;
  timestamp: Date;
  duration: number;
}

export interface DiagnosticLogAnalysis {
  errorCount: number;
  warningCount: number;
  recentErrors: LogEntry[];
  patterns: string[];
}

export interface LogEntry {
  timestamp: Date;
  level: 'ERROR' | 'WARNING' | 'INFO';
  message: string;
  details?: string;
}

export interface RemediationStep {
  step: number;
  description: string;
  command?: string;
  risk: 'low' | 'medium' | 'high';
  estimatedTime: string;
}

export interface RCAHistory {
  id: string;
  timestamp: Date;
  problemDescription: string;
  status: string;
  summary: string;
}

// Made with Bob
