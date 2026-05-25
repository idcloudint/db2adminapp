import { v4 as uuidv4 } from 'uuid';
import * as k8s from '@kubernetes/client-node';
import * as fs from 'fs/promises';
import * as path from 'path';
import logger from '../utils/logger';
import config from '../config';
import {
  DailyTask,
  TaskResult,
  TaskRunSummary,
  TaskHistory
} from '../types/daily-tasks.types';

// History storage configuration
const HISTORY_DIR = path.join(process.cwd(), 'data');
const HISTORY_FILE = path.join(HISTORY_DIR, 'task-history.json');
const MAX_HISTORY_RUNS = 100;

interface HistoryStorage {
  runs: TaskHistory[];
  lastUpdated: string;
}

// Initialize Kubernetes client
const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
const k8sExec = new k8s.Exec(kc);

// Helper function to get DB2 pod name using Kubernetes API
async function getDB2PodName(): Promise<string> {
  try {
    const labelSelector = config.db2.podLabel;
    const response = await k8sApi.listNamespacedPod(
      config.db2.namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      labelSelector
    );
    
    if (!response.body.items || response.body.items.length === 0) {
      throw new Error(`No pods found with label ${labelSelector} in namespace ${config.db2.namespace}`);
    }
    
    const runningPod = response.body.items.find(pod => pod.status?.phase === 'Running');
    if (!runningPod || !runningPod.metadata?.name) {
      throw new Error('No running DB2 pod found');
    }
    
    logger.debug('Found DB2 pod', { podName: runningPod.metadata.name });
    return runningPod.metadata.name;
  } catch (error: any) {
    logger.error('Failed to get DB2 pod name', { error: error.message });
    throw new Error('Could not find DB2 pod');
  }
}

// Helper function to execute command in DB2 pod using Kubernetes API
async function execInDB2Pod(command: string): Promise<{ stdout: string; stderr: string }> {
  const podName = await getDB2PodName();
  
  // Wrap command to run as db2inst1 user
  const wrappedCommand = ['su', '-', config.db2.user, '-c', command];
  
  logger.debug('Executing command in DB2 pod', { podName, command });
  
  return new Promise(async (resolve, reject) => {
    let stdout = '';
    let stderr = '';
    
    try {
      const ws = await k8sExec.exec(
        config.db2.namespace,
        podName,
        '',
        wrappedCommand,
        process.stdout,
        process.stderr,
        process.stdin,
        false,
        (status: k8s.V1Status) => {
          if (status.status === 'Failure') {
            reject(new Error(status.message || 'Command execution failed'));
          } else {
            resolve({ stdout, stderr });
          }
        }
      );
      
      // Capture stdout
      ws.on('message', (data: Buffer) => {
        stdout += data.toString();
      });
      
      // Capture stderr
      ws.on('error', (error: Error) => {
        stderr += error.message;
      });
      
      // Set timeout
      setTimeout(() => {
        ws.close();
        reject(new Error('Command execution timeout'));
      }, 30000);
      
    } catch (error: any) {
      reject(error);
    }
  });
}

class DailyTasksService {
  private taskHistory: TaskHistory[] = [];
  private currentRun: TaskRunSummary | null = null;
  private historyLoaded: boolean = false;

  constructor() {
    // Load history on initialization
    this.loadHistory().catch(err => {
      logger.error('Failed to load task history', { error: err.message });
    });
  }

  /**
   * Load task history from file
   */
  private async loadHistory(): Promise<void> {
    try {
      // Ensure data directory exists
      await fs.mkdir(HISTORY_DIR, { recursive: true });
      
      // Try to read history file
      const data = await fs.readFile(HISTORY_FILE, 'utf-8');
      const storage: HistoryStorage = JSON.parse(data);
      
      this.taskHistory = storage.runs || [];
      this.historyLoaded = true;
      
      logger.info('Task history loaded', { runs: this.taskHistory.length });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist yet, start fresh
        logger.info('No existing task history found, starting fresh');
        this.taskHistory = [];
        this.historyLoaded = true;
      } else {
        logger.error('Error loading task history', { error: error.message });
        this.taskHistory = [];
        this.historyLoaded = true;
      }
    }
  }

  /**
   * Save task history to file
   */
  private async saveHistory(): Promise<void> {
    try {
      // Ensure data directory exists
      await fs.mkdir(HISTORY_DIR, { recursive: true });
      
      const storage: HistoryStorage = {
        runs: this.taskHistory.slice(0, MAX_HISTORY_RUNS),
        lastUpdated: new Date().toISOString()
      };
      
      await fs.writeFile(HISTORY_FILE, JSON.stringify(storage, null, 2), 'utf-8');
      
      logger.debug('Task history saved', { runs: this.taskHistory.length });
    } catch (error: any) {
      logger.error('Error saving task history', { error: error.message });
    }
  }

  // Define all daily tasks based on db2day2ops.docx
  private readonly tasks: DailyTask[] = [
    {
      id: 'instance-availability',
      name: 'Instance and Database Availability',
      description: 'Check if DB2 instance and databases are available',
      category: 'availability',
      command: 'db2 list active databases'
    },
    {
      id: 'tablespace-health',
      name: 'Tablespace Health Check',
      description: 'Check tablespace usage and status',
      category: 'storage',
      command: 'db2 connect to SAMPLE && db2 "SELECT TBSP_NAME, TBSP_STATE, TBSP_USED_PAGES, TBSP_TOTAL_PAGES, DECIMAL((FLOAT(TBSP_USED_PAGES)/FLOAT(TBSP_TOTAL_PAGES))*100,5,2) AS PCT_USED FROM TABLE(MON_GET_TABLESPACE(NULL,-2)) ORDER BY PCT_USED DESC" && db2 terminate',
      threshold: {
        warning: 80,
        critical: 90
      }
    },
    {
      id: 'transaction-log-health',
      name: 'Transaction Log Health',
      description: 'Check transaction log usage',
      category: 'logs',
      command: 'db2 connect to SAMPLE && db2 "SELECT LOG_UTILIZATION_PERCENT, TOTAL_LOG_USED_KB, TOTAL_LOG_AVAILABLE_KB FROM TABLE(MON_GET_TRANSACTION_LOG(-2))" && db2 terminate',
      threshold: {
        warning: 75,
        critical: 85
      }
    },
    {
      id: 'diagnostic-log-review',
      name: 'DB2 Diagnostic Log Review',
      description: 'Check for recent errors in db2diag.log',
      category: 'logs',
      command: 'db2diag -rc 3 -H 24'
    },
    {
      id: 'connection-health',
      name: 'Connection Health',
      description: 'Check active connections and connection limits',
      category: 'connections',
      command: 'db2 connect to SAMPLE && db2 "SELECT COUNT(*) AS ACTIVE_CONNECTIONS, (SELECT VALUE FROM SYSIBMADM.DBCFG WHERE NAME=\'max_connections\') AS MAX_CONNECTIONS FROM TABLE(MON_GET_CONNECTION(NULL,-2))" && db2 terminate'
    },
    {
      id: 'lock-analysis',
      name: 'Lock and Blocking Analysis',
      description: 'Check for lock waits and blocking',
      category: 'locks',
      command: 'db2 connect to SAMPLE && db2 "SELECT AGENT_ID, LOCK_WAIT_TIME, LOCK_WAITS FROM TABLE(MON_GET_CONNECTION(NULL,-2)) WHERE LOCK_WAIT_TIME > 0 ORDER BY LOCK_WAIT_TIME DESC" && db2 terminate'
    },
    {
      id: 'backup-verification',
      name: 'Backup Verification',
      description: 'Check last successful backup',
      category: 'backup',
      command: 'db2 connect to SAMPLE && db2 "SELECT DBNAME, START_TIME, END_TIME, SQLCODE FROM SYSIBMADM.DB_HISTORY WHERE OPERATION=\'B\' ORDER BY START_TIME DESC FETCH FIRST 5 ROWS ONLY" && db2 terminate'
    }
  ];

  /**
   * Get all available daily tasks
   */
  getTasks(): DailyTask[] {
    return this.tasks;
  }

  /**
   * Run all daily tasks
   */
  async runAllTasks(): Promise<TaskRunSummary> {
    const runId = uuidv4();
    const startTime = new Date();
    
    logger.info('Starting daily tasks run', { runId });

    const results: TaskResult[] = [];
    
    for (const task of this.tasks) {
      const result = await this.runTask(task);
      results.push(result);
    }

    const endTime = new Date();
    
    const summary: TaskRunSummary = {
      runId,
      startTime,
      endTime,
      totalTasks: this.tasks.length,
      passed: results.filter(r => r.status === 'pass').length,
      warnings: results.filter(r => r.status === 'warning').length,
      failed: results.filter(r => r.status === 'fail').length,
      errors: results.filter(r => r.status === 'error').length,
      results
    };

    this.currentRun = summary;
    
    // Add to history
    this.taskHistory.unshift({
      runId,
      timestamp: startTime,
      summary: {
        total: summary.totalTasks,
        passed: summary.passed,
        warnings: summary.warnings,
        failed: summary.failed,
        errors: summary.errors
      }
    });

    // Keep only last MAX_HISTORY_RUNS
    if (this.taskHistory.length > MAX_HISTORY_RUNS) {
      this.taskHistory = this.taskHistory.slice(0, MAX_HISTORY_RUNS);
    }

    // Save history to file (async, don't wait)
    this.saveHistory().catch(err => {
      logger.error('Failed to save task history', { error: err.message });
    });

    logger.info('Daily tasks run completed', { 
      runId, 
      passed: summary.passed,
      warnings: summary.warnings,
      failed: summary.failed,
      errors: summary.errors
    });

    return summary;
  }

  /**
   * Run a single task
   */
  private async runTask(task: DailyTask): Promise<TaskResult> {
    const startTime = Date.now();
    
    try {
      logger.debug('Running task', { taskId: task.id, taskName: task.name });

      // Execute the command in DB2 pod
      const { stdout, stderr } = await execInDB2Pod(task.command);

      const duration = Date.now() - startTime;

      // Analyze the output
      const analysis = this.analyzeTaskOutput(task, stdout, stderr);

      return {
        taskId: task.id,
        taskName: task.name,
        status: analysis.status,
        message: analysis.message,
        details: analysis.details,
        timestamp: new Date(),
        duration,
        command: task.command,
        stdout,
        stderr,
        metrics: analysis.metrics,
        recommendations: analysis.recommendations
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('Task execution failed', {
        taskId: task.id,
        error: error.message
      });

      // Detect exit code 4 (DB2 SQL errors or permission issues)
      const isExitCode4 = error.message.includes('exit status 4') || error.message.includes('exit code: 4');
      
      if (isExitCode4) {
        return {
          taskId: task.id,
          taskName: task.name,
          status: 'error',
          message: 'Feature not available or requires additional configuration',
          details: {
            error: error.message,
            stderr: error.stderr,
            exitCode: 4,
            possibleCauses: [
              'Monitoring function not enabled',
              'Insufficient permissions',
              'Database object does not exist',
              'DB2 version compatibility issue'
            ]
          },
          timestamp: new Date(),
          duration,
          command: task.command,
          stdout: '',
          stderr: error.message,
          metrics: {},
          recommendations: [
            'Verify db2inst1 user has required permissions',
            'Check if database is activated: db2 activate database SAMPLE',
            'Enable monitoring switches if needed: db2 update monitor switches using statement on',
            'Verify DB2 version supports this monitoring function',
            'Check db2diag.log for detailed error information'
          ]
        };
      }

      // Generic error handling
      return {
        taskId: task.id,
        taskName: task.name,
        status: 'error',
        message: `Task execution failed: ${error.message}`,
        details: { error: error.message, stderr: error.stderr },
        timestamp: new Date(),
        duration,
        command: task.command,
        stdout: '',
        stderr: error.message,
        metrics: {},
        recommendations: [
          'Check DB2 pod status',
          'Verify database connectivity',
          'Review pod logs for errors',
          'Ensure database is started and accessible'
        ]
      };
    }
  }

  /**
   * Analyze task output to determine status
   */
  private analyzeTaskOutput(
    task: DailyTask,
    stdout: string,
    stderr: string
  ): { status: 'pass' | 'warning' | 'fail'; message: string; details: any; metrics: Record<string, any>; recommendations: string[] } {
    
    // Check for errors in stderr
    if (stderr && stderr.toLowerCase().includes('error')) {
      return {
        status: 'fail',
        message: 'Command returned errors',
        details: { stdout, stderr },
        metrics: {},
        recommendations: ['Review error messages', 'Check DB2 configuration', 'Verify database connectivity']
      };
    }

    // Task-specific analysis
    switch (task.id) {
      case 'instance-availability':
        if (stdout.includes('Active') || stdout.includes('SAMPLE')) {
          return {
            status: 'pass',
            message: 'Database is active and available',
            details: { output: stdout },
            metrics: { databaseStatus: 'Active' },
            recommendations: []
          };
        }
        return {
          status: 'fail',
          message: 'No active databases found',
          details: { output: stdout },
          metrics: { databaseStatus: 'Inactive' },
          recommendations: ['Start the database', 'Check DB2 instance status', 'Review db2diag.log for errors']
        };

      case 'tablespace-health':
        const tbspMatch = stdout.match(/(\d+\.\d+)\s*$/m);
        if (tbspMatch) {
          const usage = parseFloat(tbspMatch[1]);
          if (usage >= (task.threshold?.critical || 90)) {
            return {
              status: 'fail',
              message: `Tablespace usage critical: ${usage}%`,
              details: { usage, output: stdout },
              metrics: { tablespaceUsage: usage, threshold: 'critical' },
              recommendations: [
                'URGENT: Free up tablespace immediately',
                'Drop unnecessary tables or indexes',
                'Archive old data',
                'Consider adding more storage'
              ]
            };
          } else if (usage >= (task.threshold?.warning || 80)) {
            return {
              status: 'warning',
              message: `Tablespace usage high: ${usage}%`,
              details: { usage, output: stdout },
              metrics: { tablespaceUsage: usage, threshold: 'warning' },
              recommendations: [
                'Monitor tablespace growth trends',
                'Plan for capacity expansion',
                'Review data retention policies'
              ]
            };
          }
        }
        return {
          status: 'pass',
          message: 'Tablespace usage is healthy',
          details: { output: stdout },
          metrics: { tablespaceUsage: tbspMatch ? parseFloat(tbspMatch[1]) : 0 },
          recommendations: []
        };

      case 'transaction-log-health':
        const logMatch = stdout.match(/(\d+\.\d+)/);
        if (logMatch) {
          const logUsage = parseFloat(logMatch[1]);
          if (logUsage >= (task.threshold?.critical || 85)) {
            return {
              status: 'fail',
              message: `Transaction log usage critical: ${logUsage}%`,
              details: { logUsage, output: stdout },
              metrics: { logUtilization: logUsage, threshold: 'critical' },
              recommendations: [
                'URGENT: Transaction log space critical',
                'Commit or rollback long-running transactions',
                'Increase log file size (LOGFILSIZ)',
                'Archive logs if using archive logging'
              ]
            };
          } else if (logUsage >= (task.threshold?.warning || 75)) {
            return {
              status: 'warning',
              message: `Transaction log usage high: ${logUsage}%`,
              details: { logUsage, output: stdout },
              metrics: { logUtilization: logUsage, threshold: 'warning' },
              recommendations: [
                'Monitor transaction log growth',
                'Review long-running transactions',
                'Consider increasing LOGPRIMARY or LOGSECOND'
              ]
            };
          }
        }
        return {
          status: 'pass',
          message: 'Transaction log usage is healthy',
          details: { output: stdout },
          metrics: { logUtilization: logMatch ? parseFloat(logMatch[1]) : 0 },
          recommendations: []
        };

      case 'diagnostic-log-review':
        const errorCount = (stdout.match(/LEVEL: Error/g) || []).length;
        if (errorCount > 10) {
          return {
            status: 'fail',
            message: `Found ${errorCount} errors in last 24 hours`,
            details: { errorCount, output: stdout },
            metrics: { errorCount, period: '24 hours' },
            recommendations: [
              'Review db2diag.log for error details',
              'Investigate root cause of errors',
              'Check for recurring error patterns',
              'Consider opening support ticket if unresolved'
            ]
          };
        } else if (errorCount > 0) {
          return {
            status: 'warning',
            message: `Found ${errorCount} errors in last 24 hours`,
            details: { errorCount, output: stdout },
            metrics: { errorCount, period: '24 hours' },
            recommendations: [
              'Review error messages in db2diag.log',
              'Monitor for recurring errors'
            ]
          };
        }
        return {
          status: 'pass',
          message: 'No critical errors in diagnostic log',
          details: { errorCount: 0 },
          metrics: { errorCount: 0, period: '24 hours' },
          recommendations: []
        };

      case 'connection-health':
        // Match the actual data row: number followed by either a number or - (AUTOMATIC)
        // Example output:
        // ACTIVE_CONNECTIONS MAX_CONNECTIONS
        // ------------------ ----------------
        //                  5 -
        //   1 record(s) selected.
        const connMatch = stdout.match(/^\s*(\d+)\s+(-|NULL|\d+)\s*$/m);
        if (connMatch) {
          const active = parseInt(connMatch[1]);
          const maxStr = connMatch[2].trim();
          
          // Handle AUTOMATIC configuration (shown as - or NULL)
          if (maxStr === '-' || maxStr === 'NULL' || maxStr === '') {
            return {
              status: 'pass',
              message: `Active connections: ${active} (max_connections=AUTOMATIC)`,
              details: { active, maxConfig: 'AUTOMATIC', output: stdout },
              metrics: {
                activeConnections: active,
                maxConnections: 'AUTOMATIC',
                utilization: 'N/A'
              },
              recommendations: [
                'max_connections is set to AUTOMATIC',
                'DB2 will manage connection limits dynamically',
                'Monitor for connection-related errors in db2diag.log'
              ]
            };
          }
          
          // Handle numeric max_connections
          const max = parseInt(maxStr);
          const usage = (active / max) * 100;
          
          if (usage >= 90) {
            return {
              status: 'fail',
              message: `Connection usage critical: ${active}/${max} (${usage.toFixed(1)}%)`,
              details: { active, max, usage },
              metrics: { activeConnections: active, maxConnections: max, utilization: usage.toFixed(1) + '%' },
              recommendations: [
                'URGENT: Connection limit nearly reached',
                'Increase MAX_CONNECTIONS parameter',
                'Investigate connection leaks in applications',
                'Review connection pooling configuration'
              ]
            };
          } else if (usage >= 75) {
            return {
              status: 'warning',
              message: `Connection usage high: ${active}/${max} (${usage.toFixed(1)}%)`,
              details: { active, max, usage },
              metrics: { activeConnections: active, maxConnections: max, utilization: usage.toFixed(1) + '%' },
              recommendations: [
                'Monitor connection growth trends',
                'Consider increasing MAX_CONNECTIONS if trend continues',
                'Review application connection management'
              ]
            };
          }
          
          return {
            status: 'pass',
            message: `Connection usage is healthy: ${active}/${max} (${usage.toFixed(1)}%)`,
            details: { active, max, usage },
            metrics: {
              activeConnections: active,
              maxConnections: max,
              utilization: usage.toFixed(1) + '%'
            },
            recommendations: []
          };
        }
        
        // Fallback if parsing fails
        return {
          status: 'warning',
          message: 'Could not parse connection information',
          details: { output: stdout },
          metrics: {},
          recommendations: [
            'Check DB2 connection monitoring configuration',
            'Verify SYSIBMADM.DBCFG is accessible',
            'Review command output format'
          ]
        };

      case 'lock-analysis':
        if (stdout.includes('selected') && !stdout.includes('0 record(s) selected')) {
          const lockCount = (stdout.match(/\n/g) || []).length - 3; // Subtract header lines
          return {
            status: 'warning',
            message: `Found ${lockCount} connections with lock waits`,
            details: { lockCount, output: stdout },
            metrics: { lockWaitCount: lockCount },
            recommendations: [
              'Review applications causing lock waits',
              'Consider optimizing query patterns',
              'Check for long-running transactions',
              'Review LOCKTIMEOUT configuration'
            ]
          };
        }
        return {
          status: 'pass',
          message: 'No lock waits detected',
          details: { output: stdout },
          metrics: { lockWaitCount: 0 },
          recommendations: []
        };

      case 'backup-verification':
        if (stdout.includes('SQLCODE') && !stdout.includes('-')) {
          return {
            status: 'pass',
            message: 'Recent backups completed successfully',
            details: { output: stdout },
            metrics: { backupStatus: 'Success' },
            recommendations: []
          };
        } else if (stdout.includes('0 record(s) selected')) {
          return {
            status: 'fail',
            message: 'No backup history found',
            details: { output: stdout },
            metrics: { backupStatus: 'No backups found' },
            recommendations: [
              'URGENT: No backup history found',
              'Configure automated backups immediately',
              'Verify backup configuration',
              'Test backup and restore procedures'
            ]
          };
        }
        return {
          status: 'warning',
          message: 'Check backup history for issues',
          details: { output: stdout },
          metrics: { backupStatus: 'Warning' },
          recommendations: [
            'Review backup history for failures',
            'Verify backup schedule is running',
            'Check backup logs for errors'
          ]
        };

      default:
        return {
          status: 'pass',
          message: 'Task completed',
          details: { output: stdout },
          metrics: {},
          recommendations: []
        };
    }
  }

  /**
   * Get current run summary
   */
  getCurrentRun(): TaskRunSummary | null {
    return this.currentRun;
  }

  /**
   * Get task history
   */
  getHistory(): TaskHistory[] {
    return this.taskHistory;
  }

  /**
   * Get specific run by ID
   */
  getRunById(runId: string): TaskRunSummary | null {
    // In a real implementation, this would query a database
    // For now, return current run if it matches
    if (this.currentRun && this.currentRun.runId === runId) {
      return this.currentRun;
    }
    return null;
  }
}

export default new DailyTasksService();

// Made with Bob
