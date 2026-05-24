"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthService = void 0;
const openshift_collector_1 = __importDefault(require("../collectors/openshift.collector"));
const db2_collector_1 = __importDefault(require("../collectors/db2.collector"));
const logger_1 = __importDefault(require("../utils/logger"));
const types_1 = require("../types");
class HealthService {
    constructor() {
        this.latestHealth = null;
    }
    /**
     * Get overall health summary
     */
    async getHealthSummary() {
        try {
            logger_1.default.debug('Getting health summary');
            // Collect health from all sources
            const pod = await openshift_collector_1.default.collectPodHealth();
            const db2 = await db2_collector_1.default.collectDB2Health();
            // Placeholder for storage and backup (will implement later)
            const storage = this.getPlaceholderStorage();
            const backup = this.getPlaceholderBackup();
            // Determine overall status
            const overallStatus = this.determineOverallStatus(pod, db2, storage, backup);
            const summary = {
                overallStatus,
                pod,
                db2,
                storage,
                backup,
                incidents: [], // Will implement incident tracking later
                timestamp: new Date()
            };
            this.latestHealth = summary;
            logger_1.default.info('Health summary generated', { overallStatus });
            return summary;
        }
        catch (error) {
            logger_1.default.error('Error getting health summary', { error });
            throw error;
        }
    }
    /**
     * Get latest cached health
     */
    getLatestHealth() {
        return this.latestHealth;
    }
    /**
     * Determine overall health status
     */
    determineOverallStatus(pod, db2, storage, backup) {
        const statuses = [pod.status, db2.status, storage.status, backup.status];
        // If any component is critical, overall is critical
        if (statuses.includes(types_1.HealthStatus.CRITICAL)) {
            return types_1.HealthStatus.CRITICAL;
        }
        // If any component is warning, overall is warning
        if (statuses.includes(types_1.HealthStatus.WARNING)) {
            return types_1.HealthStatus.WARNING;
        }
        // If any component is unknown, overall is unknown
        if (statuses.includes(types_1.HealthStatus.UNKNOWN)) {
            return types_1.HealthStatus.UNKNOWN;
        }
        // All healthy
        return types_1.HealthStatus.HEALTHY;
    }
    /**
     * Placeholder for storage health (will implement later)
     */
    getPlaceholderStorage() {
        return {
            status: types_1.HealthStatus.UNKNOWN,
            pvcStatus: {
                name: 'N/A',
                capacity: 'N/A',
                used: 'N/A',
                usedPercentage: 0,
                status: 'Unknown'
            },
            tablespaces: [],
            transactionLogs: {
                totalLogSpace: 0,
                usedLogSpace: 0,
                usedPercentage: 0,
                status: types_1.HealthStatus.UNKNOWN
            },
            explanation: 'Storage monitoring not yet implemented',
            recommendation: 'Storage monitoring will be available soon',
            lastChecked: new Date()
        };
    }
    /**
     * Placeholder for backup health (will implement later)
     */
    getPlaceholderBackup() {
        return {
            status: types_1.HealthStatus.UNKNOWN,
            lastBackupTime: null,
            backupAge: 'N/A',
            backupValid: false,
            backupSize: 'N/A',
            explanation: 'Backup monitoring not yet implemented',
            recommendation: 'Backup monitoring will be available soon',
            lastChecked: new Date()
        };
    }
}
exports.HealthService = HealthService;
exports.default = new HealthService();
// Made with Bob
//# sourceMappingURL=health.service.js.map