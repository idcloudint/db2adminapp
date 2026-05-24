import * as k8s from '@kubernetes/client-node';
import config from '../config';
import logger from '../utils/logger';
import { PodHealth, PodEvent, HealthStatus } from '../types';

export class OpenShiftCollector {
  private k8sApi: k8s.CoreV1Api;
  private kc: k8s.KubeConfig;

  constructor() {
    this.kc = new k8s.KubeConfig();
    
    // Load config based on environment
    if (config.openshift.kubeconfigPath) {
      // Local development - use kubeconfig file
      this.kc.loadFromFile(config.openshift.kubeconfigPath);
      logger.info('Loaded kubeconfig from file', { path: config.openshift.kubeconfigPath });
    } else {
      // Running in cluster - use in-cluster config
      try {
        this.kc.loadFromCluster();
        logger.info('Loaded in-cluster kubeconfig');
      } catch (error) {
        // Fallback to default kubeconfig
        this.kc.loadFromDefault();
        logger.info('Loaded default kubeconfig');
      }
    }
    
    this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
  }

  /**
   * Collect pod health information
   */
  async collectPodHealth(): Promise<PodHealth> {
    try {
      logger.debug('Collecting pod health', { 
        namespace: config.db2.namespace,
        label: config.db2.podLabel 
      });

      // Get pods with label selector
      const podsResponse = await this.k8sApi.listNamespacedPod(
        config.db2.namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        config.db2.podLabel
      );

      if (!podsResponse.body.items || podsResponse.body.items.length === 0) {
        logger.warn('No DB2 pods found', {
          namespace: config.db2.namespace,
          label: config.db2.podLabel
        });
        
        return {
          status: HealthStatus.CRITICAL,
          podName: 'N/A',
          namespace: config.db2.namespace,
          phase: 'NotFound',
          restartCount: 0,
          ready: false,
          age: 'N/A',
          events: [],
          explanation: 'No DB2 pod found in the cluster. The database container is not running.',
          recommendation: 'Check if the DB2 StatefulSet or Deployment exists. Run: oc get pods -n ' + config.db2.namespace,
          lastChecked: new Date()
        };
      }

      // Get the first pod (assuming single instance for now)
      const pod = podsResponse.body.items[0];
      const podName = pod.metadata?.name || 'unknown';
      const phase = pod.status?.phase || 'Unknown';
      
      // Calculate restart count
      let restartCount = 0;
      if (pod.status?.containerStatuses) {
        restartCount = pod.status.containerStatuses.reduce(
          (sum: number, container) => sum + (container.restartCount || 0),
          0
        );
      }

      // Check if pod is ready
      const ready = pod.status?.containerStatuses?.every(
        (container) => container.ready === true
      ) || false;

      // Calculate age
      const creationTime = pod.metadata?.creationTimestamp;
      const age = creationTime ? this.calculateAge(new Date(creationTime)) : 'Unknown';

      // Get pod events
      const events = await this.getPodEvents(podName);

      // Determine health status
      const status = this.determinePodHealthStatus(phase, restartCount, ready, events);

      // Generate explanation and recommendation
      const { explanation, recommendation } = this.generatePodInsights(
        status,
        phase,
        restartCount,
        ready,
        events
      );

      const podHealth: PodHealth = {
        status,
        podName,
        namespace: config.db2.namespace,
        phase,
        restartCount,
        ready,
        age,
        events,
        explanation,
        recommendation,
        lastChecked: new Date()
      };

      logger.info('Pod health collected', { 
        podName,
        status,
        phase,
        restartCount,
        ready 
      });

      return podHealth;

    } catch (error) {
      logger.error('Error collecting pod health', { error });
      
      return {
        status: HealthStatus.UNKNOWN,
        podName: 'Error',
        namespace: config.db2.namespace,
        phase: 'Error',
        restartCount: 0,
        ready: false,
        age: 'N/A',
        events: [],
        explanation: 'Failed to collect pod health information. There might be a connection issue with OpenShift.',
        recommendation: 'Check if you have proper permissions to access the OpenShift API. Verify your kubeconfig is correct.',
        lastChecked: new Date()
      };
    }
  }

  /**
   * Get events for a specific pod
   */
  private async getPodEvents(podName: string): Promise<PodEvent[]> {
    try {
      const eventsResponse = await this.k8sApi.listNamespacedEvent(
        config.db2.namespace,
        undefined,
        undefined,
        undefined,
        `involvedObject.name=${podName}`
      );

      const events: PodEvent[] = eventsResponse.body.items
        .filter((event: any) => event.type === 'Warning' || event.type === 'Error')
        .slice(0, 10) // Get last 10 events
        .map((event: any) => ({
          type: event.type || 'Unknown',
          reason: event.reason || 'Unknown',
          message: event.message || '',
          count: event.count || 1,
          firstTimestamp: new Date(event.firstTimestamp || new Date()),
          lastTimestamp: new Date(event.lastTimestamp || new Date())
        }));

      return events;

    } catch (error) {
      logger.error('Error getting pod events', { error, podName });
      return [];
    }
  }

  /**
   * Determine pod health status based on various factors
   */
  private determinePodHealthStatus(
    phase: string,
    restartCount: number,
    ready: boolean,
    events: PodEvent[]
  ): HealthStatus {
    // Critical: Pod not running or not ready
    if (phase !== 'Running' || !ready) {
      return HealthStatus.CRITICAL;
    }

    // Critical: High restart count (>5)
    if (restartCount > 5) {
      return HealthStatus.CRITICAL;
    }

    // Warning: Some restarts (1-5)
    if (restartCount > 0) {
      return HealthStatus.WARNING;
    }

    // Warning: Recent error events
    const recentErrors = events.filter(event => {
      const timeDiff = Date.now() - event.lastTimestamp.getTime();
      return timeDiff < 300000; // Last 5 minutes
    });

    if (recentErrors.length > 0) {
      return HealthStatus.WARNING;
    }

    // Healthy: Running, ready, no restarts, no recent errors
    return HealthStatus.HEALTHY;
  }

  /**
   * Generate beginner-friendly explanation and recommendation
   */
  private generatePodInsights(
    status: HealthStatus,
    phase: string,
    restartCount: number,
    ready: boolean,
    events: PodEvent[]
  ): { explanation: string; recommendation: string } {
    let explanation = '';
    let recommendation = '';

    switch (status) {
      case HealthStatus.HEALTHY:
        explanation = 'The DB2 container is running smoothly. Everything looks good!';
        recommendation = 'No action needed. Continue monitoring.';
        break;

      case HealthStatus.WARNING:
        if (restartCount > 0) {
          explanation = `The DB2 container has restarted ${restartCount} time(s). This might indicate temporary issues that were automatically recovered.`;
          recommendation = 'Monitor the pod. If restarts continue, check the pod logs for errors.';
        } else if (events.length > 0) {
          explanation = `There are ${events.length} warning event(s) for this pod. The container is running but experienced some issues.`;
          recommendation = 'Review the events below to understand what happened. Check pod logs if needed.';
        }
        break;

      case HealthStatus.CRITICAL:
        if (phase !== 'Running') {
          explanation = `The DB2 container is not running (current state: ${phase}). The database is not available.`;
          recommendation = 'Check why the pod is not running. Look at pod events and logs. You may need to restart the pod or fix configuration issues.';
        } else if (!ready) {
          explanation = 'The DB2 container is running but not ready to accept connections. It might still be starting up or experiencing issues.';
          recommendation = 'Wait a few minutes for the container to become ready. If it stays not ready, check the pod logs for startup errors.';
        } else if (restartCount > 5) {
          explanation = `The DB2 container has restarted ${restartCount} times. This indicates a serious problem causing the container to crash repeatedly.`;
          recommendation = 'This is a crash loop. Check pod logs immediately to identify the root cause. Common causes: configuration errors, resource limits, or database corruption.';
        }
        break;

      case HealthStatus.UNKNOWN:
        explanation = 'Unable to determine pod health. There might be a connection issue with OpenShift.';
        recommendation = 'Check your OpenShift connection and permissions.';
        break;
    }

    return { explanation, recommendation };
  }

  /**
   * Calculate human-readable age from creation time
   */
  private calculateAge(creationTime: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - creationTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ${diffHours % 24}h`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`;
    } else {
      return `${diffMins}m`;
    }
  }

  /**
   * Test OpenShift connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.k8sApi.listNamespace();
      logger.info('OpenShift connection test successful');
      return true;
    } catch (error) {
      logger.error('OpenShift connection test failed', { error });
      return false;
    }
  }
}

export default new OpenShiftCollector();

// Made with Bob
