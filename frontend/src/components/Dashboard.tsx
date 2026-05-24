import React, { useState, useEffect } from 'react';
import { Grid, Column, Loading, InlineNotification } from '@carbon/react';
import { Renew } from '@carbon/icons-react';
import HealthCard from './HealthCard';
import CriticalAlert from './CriticalAlert';
import { HealthSummary, HealthStatus } from '../types';
import websocketService from '../services/websocket.service';
import apiService from '../services/api.service';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const [health, setHealth] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCriticalAlert, setShowCriticalAlert] = useState(false);

  useEffect(() => {
    // Initial data fetch
    fetchHealthData();

    // Connect to WebSocket for real-time updates
    websocketService.connect();

    // Subscribe to health updates
    const unsubscribeHealth = websocketService.onHealthUpdate((newHealth) => {
      console.log('Received health update:', newHealth);
      setHealth(newHealth);
      setLoading(false);
      setError(null);

      // Show critical alert if overall status is critical
      if (newHealth.overallStatus === HealthStatus.CRITICAL) {
        setShowCriticalAlert(true);
      }
    });

    // Subscribe to connection status
    const unsubscribeConnection = websocketService.onConnectionStatus((isConnected) => {
      console.log('WebSocket connection status:', isConnected);
      setConnected(isConnected);
    });

    // Cleanup on unmount
    return () => {
      unsubscribeHealth();
      unsubscribeConnection();
      websocketService.disconnect();
    };
  }, []);

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      const data = await apiService.getHealthSummary();
      setHealth(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching health data:', err);
      setError('Failed to fetch health data. Please check if the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const getCriticalIssues = (): string[] => {
    if (!health) return [];
    
    const issues: string[] = [];
    
    if (health.pod.status === HealthStatus.CRITICAL) {
      issues.push(`Pod Issue: ${health.pod.explanation}`);
    }
    
    if (health.db2.status === HealthStatus.CRITICAL) {
      issues.push(`DB2 Issue: ${health.db2.explanation}`);
    }
    
    if (health.storage.status === HealthStatus.CRITICAL) {
      issues.push(`Storage Issue: ${health.storage.explanation}`);
    }
    
    if (health.backup.status === HealthStatus.CRITICAL) {
      issues.push(`Backup Issue: ${health.backup.explanation}`);
    }
    
    return issues;
  };

  if (loading && !health) {
    return (
      <div className="dashboard-loading">
        <Loading description="Loading health data..." withOverlay={false} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <InlineNotification
          kind="error"
          title="Connection Error"
          subtitle={error}
          hideCloseButton={false}
        />
      </div>
    );
  }

  if (!health) {
    return null;
  }

  const criticalIssues = getCriticalIssues();

  return (
    <div className="dashboard">
      {/* Critical Alert Overlay */}
      {showCriticalAlert && criticalIssues.length > 0 && (
        <CriticalAlert
          title={criticalIssues[0]}
          subtitle="Critical system issue detected. Immediate action required."
          onClose={() => setShowCriticalAlert(false)}
        />
      )}

      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">DB2 Day 2 Operations Dashboard</h1>
          <p className="dashboard-subtitle">
            Real-time monitoring for DB2 on OpenShift • Database: SAMPLE
          </p>
        </div>
        <div className="dashboard-status">
          <div className={`connection-indicator ${connected ? 'connected' : 'disconnected'}`}>
            <Renew size={16} className={connected ? 'spinning' : ''} />
            <span>{connected ? 'Live Updates' : 'Reconnecting...'}</span>
          </div>
        </div>
      </div>

      {/* Overall Status Banner */}
      <div className={`overall-status overall-status-${health.overallStatus}`}>
        <h2>Overall System Status: {health.overallStatus.toUpperCase()}</h2>
        {criticalIssues.length > 0 && (
          <p className="critical-issues-count">
            {criticalIssues.length} critical issue(s) detected
          </p>
        )}
      </div>

      {/* Health Cards Grid */}
      <Grid className="dashboard-grid">
        <Column lg={8} md={4} sm={4}>
          <HealthCard
            title="Pod Health"
            status={health.pod.status}
            explanation={health.pod.explanation}
            recommendation={health.pod.recommendation}
            lastChecked={health.pod.lastChecked}
            details={
              <ul>
                <li><strong>Pod Name:</strong> {health.pod.podName}</li>
                <li><strong>Phase:</strong> {health.pod.phase}</li>
                <li><strong>Ready:</strong> {health.pod.ready ? 'Yes' : 'No'}</li>
                <li><strong>Restart Count:</strong> {health.pod.restartCount}</li>
                <li><strong>Age:</strong> {health.pod.age}</li>
                {health.pod.events.length > 0 && (
                  <li><strong>Recent Events:</strong> {health.pod.events.length} warning(s)</li>
                )}
              </ul>
            }
          />
        </Column>

        <Column lg={8} md={4} sm={4}>
          <HealthCard
            title="DB2 Engine"
            status={health.db2.status}
            explanation={health.db2.explanation}
            recommendation={health.db2.recommendation}
            lastChecked={health.db2.lastChecked}
            details={
              <ul>
                <li><strong>Engine Running:</strong> {health.db2.engineRunning ? 'Yes' : 'No'}</li>
                <li><strong>Connection:</strong> {health.db2.connectionStatus ? 'OK' : 'Failed'}</li>
                <li><strong>Database State:</strong> {health.db2.databaseState}</li>
                <li><strong>Active Connections:</strong> {health.db2.activeConnections}</li>
              </ul>
            }
          />
        </Column>

        <Column lg={8} md={4} sm={4}>
          <HealthCard
            title="Storage"
            status={health.storage.status}
            explanation={health.storage.explanation}
            recommendation={health.storage.recommendation}
            lastChecked={health.storage.lastChecked}
            details={
              <ul>
                <li><strong>PVC:</strong> {health.storage.pvcStatus.name}</li>
                <li><strong>Status:</strong> {health.storage.pvcStatus.status}</li>
              </ul>
            }
          />
        </Column>

        <Column lg={8} md={4} sm={4}>
          <HealthCard
            title="Backup"
            status={health.backup.status}
            explanation={health.backup.explanation}
            recommendation={health.backup.recommendation}
            lastChecked={health.backup.lastChecked}
            details={
              <ul>
                <li><strong>Last Backup:</strong> {health.backup.lastBackupTime || 'N/A'}</li>
                <li><strong>Age:</strong> {health.backup.backupAge}</li>
                <li><strong>Valid:</strong> {health.backup.backupValid ? 'Yes' : 'No'}</li>
              </ul>
            }
          />
        </Column>
      </Grid>

      {/* Footer */}
      <div className="dashboard-footer">
        <p>Last updated: {new Date(health.timestamp).toLocaleString()}</p>
        <p>Updates automatically every 60 seconds • No page refresh needed</p>
      </div>
    </div>
  );
};

export default Dashboard;

// Made with Bob
