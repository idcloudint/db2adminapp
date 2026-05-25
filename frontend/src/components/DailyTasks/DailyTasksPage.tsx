import React, { useState, useEffect } from 'react';
import {
  Button,
  ProgressBar,
  Accordion,
  AccordionItem,
  CodeSnippet,
  Tag,
  InlineLoading,
  InlineNotification
} from '@carbon/react';
import { 
  CheckmarkFilled, 
  WarningFilled, 
  ErrorFilled, 
  Pending,
  Play,
  Renew
} from '@carbon/icons-react';
import './DailyTasksPage.scss';

const API_URL = process.env.REACT_APP_API_URL || '';

interface TaskDetail {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'pass' | 'warning' | 'fail' | 'error';
  message?: string;
  command?: string;
  stdout?: string;
  stderr?: string;
  duration?: number;
  timestamp?: string;
  metrics?: Record<string, any>;
  recommendations?: string[];
}

interface TaskSummary {
  totalTasks: number;
  passed: number;
  warnings: number;
  failed: number;
  errors: number;
}

const DailyTasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<TaskDetail[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<TaskSummary>({ 
    totalTasks: 0, 
    passed: 0, 
    warnings: 0, 
    failed: 0, 
    errors: 0 
  });
  const [error, setError] = useState<string | null>(null);

  // Initialize task list
  useEffect(() => {
    const initialTasks: TaskDetail[] = [
      { id: 'instance-availability', name: 'Instance and Database Availability', status: 'pending' },
      { id: 'tablespace-health', name: 'Tablespace Health Check', status: 'pending' },
      { id: 'connection-health', name: 'Connection Health', status: 'pending' },
      { id: 'transaction-log-health', name: 'Transaction Log Health', status: 'pending' },
      { id: 'diagnostic-log-review', name: 'DB2 Diagnostic Log Review', status: 'pending' },
      { id: 'lock-analysis', name: 'Lock and Blocking Analysis', status: 'pending' },
      { id: 'backup-verification', name: 'Backup Verification', status: 'pending' }
    ];
    setTasks(initialTasks);
  }, []);

  const runTasks = async () => {
    setIsRunning(true);
    setProgress(0);
    setError(null);

    // Reset all tasks to pending
    setTasks(prev => prev.map(task => ({ ...task, status: 'pending' as const })));

    try {
      const eventSource = new EventSource(`${API_URL}/api/daily-tasks/stream`);

      eventSource.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'init':
            console.log('Tasks initialized:', data.tasks);
            break;

          case 'task-start':
            setTasks(prev => prev.map(task =>
              task.id === data.taskId
                ? { ...task, status: 'running' }
                : task
            ));
            setProgress(data.progress || 0);
            break;

          case 'task-complete':
            setTasks(prev => prev.map(task =>
              task.id === data.taskId
                ? {
                    ...task,
                    status: data.result.status,
                    message: data.result.message,
                    command: data.result.command,
                    stdout: data.result.stdout,
                    stderr: data.result.stderr,
                    duration: data.result.duration,
                    timestamp: data.result.timestamp,
                    metrics: data.result.metrics,
                    recommendations: data.result.recommendations
                  }
                : task
            ));
            setProgress(data.progress || 0);
            break;

          case 'complete':
            setSummary({
              totalTasks: data.summary.totalTasks,
              passed: data.summary.passed,
              warnings: data.summary.warnings,
              failed: data.summary.failed,
              errors: data.summary.errors
            });
            setIsRunning(false);
            setProgress(100);
            eventSource.close();
            break;

          case 'error':
            setError(data.error || 'An error occurred');
            setIsRunning(false);
            eventSource.close();
            break;
        }
      });

      eventSource.onerror = (err) => {
        console.error('EventSource error:', err);
        setError('Connection to server lost');
        setIsRunning(false);
        eventSource.close();
      };

    } catch (err: any) {
      setError(err.message);
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckmarkFilled size={20} className="status-icon-success" />;
      case 'warning':
        return <WarningFilled size={20} className="status-icon-warning" />;
      case 'fail':
      case 'error':
        return <ErrorFilled size={20} className="status-icon-error" />;
      case 'running':
        return <InlineLoading description="Running..." />;
      default:
        return <Pending size={20} className="status-icon-pending" />;
    }
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'pass':
        return <Tag type="green">Passed</Tag>;
      case 'warning':
        return <Tag type="warm-gray">Warning</Tag>;
      case 'fail':
        return <Tag type="red">Failed</Tag>;
      case 'error':
        return <Tag type="red">Error</Tag>;
      case 'running':
        return <Tag type="blue">Running</Tag>;
      default:
        return <Tag type="gray">Pending</Tag>;
    }
  };

  return (
    <div className="daily-tasks-page">
      <div className="page-header">
        <h1>Daily Admin Tasks</h1>
        <p>Automated daily health checks for DB2 database</p>
      </div>

      {/* Summary Section */}
      {!isRunning && progress === 100 && (
        <div className="summary-section">
          <h3>Results Summary</h3>
          <div className="summary-tags">
            <Tag type="green" size="lg">Passed: {summary.passed}</Tag>
            <Tag type="warm-gray" size="lg">Warnings: {summary.warnings}</Tag>
            <Tag type="red" size="lg">Failed: {summary.failed}</Tag>
            {summary.errors > 0 && <Tag type="red" size="lg">Errors: {summary.errors}</Tag>}
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {isRunning && (
        <div className="progress-section">
          <ProgressBar
            label="Executing daily tasks..."
            value={progress}
            max={100}
            className="progress-bar"
          />
          <p className="progress-text">{progress}% complete</p>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <InlineNotification
          kind="error"
          title="Error"
          subtitle={error}
          onCloseButtonClick={() => setError(null)}
          className="error-notification"
        />
      )}

      {/* Action Buttons */}
      <div className="action-buttons">
        <Button
          renderIcon={Play}
          onClick={runTasks}
          disabled={isRunning}
          kind="primary"
          size="lg"
        >
          {isRunning ? 'Running Tasks...' : 'Run All Tasks'}
        </Button>
        {progress === 100 && (
          <Button
            renderIcon={Renew}
            onClick={runTasks}
            kind="secondary"
            size="lg"
          >
            Run Again
          </Button>
        )}
      </div>

      {/* Task List with Accordion for Details */}
      <div className="tasks-section">
        <h3>Tasks ({tasks.length})</h3>
        <Accordion>
          {tasks.map((task) => (
            <AccordionItem
              key={task.id}
              title={
                <div className="task-title">
                  {getStatusIcon(task.status)}
                  <span className="task-name">{task.name}</span>
                  {task.duration && (
                    <span className="task-duration">({(task.duration / 1000).toFixed(2)}s)</span>
                  )}
                  <div className="task-status-tag">
                    {getStatusTag(task.status)}
                  </div>
                </div>
              }
            >
              {task.status !== 'pending' && task.status !== 'running' && (
                <div className="task-details">
                  {/* Status and Message */}
                  <div className="detail-section">
                    <h4>Status</h4>
                    <p className="status-message">{task.message}</p>
                    {task.timestamp && (
                      <p className="timestamp">
                        Executed: {new Date(task.timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* Metrics */}
                  {task.metrics && Object.keys(task.metrics).length > 0 && (
                    <div className="detail-section">
                      <h4>Metrics</h4>
                      <ul className="metrics-list">
                        {Object.entries(task.metrics).map(([key, value]) => (
                          <li key={key}>
                            <strong>{key}:</strong> {String(value)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {task.recommendations && task.recommendations.length > 0 && (
                    <div className="detail-section recommendations">
                      <h4>Recommendations</h4>
                      <ul className="recommendations-list">
                        {task.recommendations.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Command Executed */}
                  {task.command && (
                    <div className="detail-section">
                      <h4>Command Executed</h4>
                      <CodeSnippet type="multi" feedback="Copied to clipboard">
                        {task.command}
                      </CodeSnippet>
                    </div>
                  )}

                  {/* Output */}
                  {task.stdout && (
                    <div className="detail-section">
                      <h4>Output</h4>
                      <CodeSnippet type="multi" feedback="Copied to clipboard" wrapText>
                        {task.stdout}
                      </CodeSnippet>
                    </div>
                  )}

                  {/* Errors */}
                  {task.stderr && (
                    <div className="detail-section">
                      <h4>Errors</h4>
                      <CodeSnippet type="multi" feedback="Copied to clipboard" wrapText>
                        {task.stderr}
                      </CodeSnippet>
                    </div>
                  )}
                </div>
              )}
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
};

export default DailyTasksPage;

// Made with Bob
