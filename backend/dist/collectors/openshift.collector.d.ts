import { PodHealth } from '../types';
export declare class OpenShiftCollector {
    private k8sApi;
    private kc;
    constructor();
    /**
     * Collect pod health information
     */
    collectPodHealth(): Promise<PodHealth>;
    /**
     * Get events for a specific pod
     */
    private getPodEvents;
    /**
     * Determine pod health status based on various factors
     */
    private determinePodHealthStatus;
    /**
     * Generate beginner-friendly explanation and recommendation
     */
    private generatePodInsights;
    /**
     * Calculate human-readable age from creation time
     */
    private calculateAge;
    /**
     * Test OpenShift connection
     */
    testConnection(): Promise<boolean>;
}
declare const _default: OpenShiftCollector;
export default _default;
//# sourceMappingURL=openshift.collector.d.ts.map