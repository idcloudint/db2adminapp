import { HealthSummary } from '../types';
export declare class HealthService {
    private latestHealth;
    /**
     * Get overall health summary
     */
    getHealthSummary(): Promise<HealthSummary>;
    /**
     * Get latest cached health
     */
    getLatestHealth(): HealthSummary | null;
    /**
     * Determine overall health status
     */
    private determineOverallStatus;
    /**
     * Placeholder for storage health (will implement later)
     */
    private getPlaceholderStorage;
    /**
     * Placeholder for backup health (will implement later)
     */
    private getPlaceholderBackup;
}
declare const _default: HealthService;
export default _default;
//# sourceMappingURL=health.service.d.ts.map