import { DB2Health } from '../types';
export declare class DB2Collector {
    private k8sApi;
    private k8sExec;
    private kc;
    constructor();
    /**
     * Collect DB2 health information
     */
    collectDB2Health(): Promise<DB2Health>;
    /**
     * Get DB2 pod name
     */
    private getDB2PodName;
    /**
     * Check if DB2 engine is running
     */
    private checkDB2Engine;
    /**
     * Test DB2 connection
     */
    private testDB2Connection;
    /**
     * Get database state
     */
    private getDatabaseState;
    /**
     * Get active connections count
     */
    private getActiveConnections;
    /**
     * Execute command in pod
     */
    private execInPod;
    /**
     * Determine DB2 health status
     */
    private determineDB2HealthStatus;
    /**
     * Generate beginner-friendly insights
     */
    private generateDB2Insights;
    /**
     * Create error health object
     */
    private createErrorHealth;
}
declare const _default: DB2Collector;
export default _default;
//# sourceMappingURL=db2.collector.d.ts.map