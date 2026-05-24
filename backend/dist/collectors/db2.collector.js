"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DB2Collector = void 0;
const k8s = __importStar(require("@kubernetes/client-node"));
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../utils/logger"));
const types_1 = require("../types");
class DB2Collector {
    constructor() {
        this.kc = new k8s.KubeConfig();
        if (config_1.default.openshift.kubeconfigPath) {
            this.kc.loadFromFile(config_1.default.openshift.kubeconfigPath);
        }
        else {
            try {
                this.kc.loadFromCluster();
            }
            catch (error) {
                this.kc.loadFromDefault();
            }
        }
        this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
        this.k8sExec = new k8s.Exec(this.kc);
    }
    /**
     * Collect DB2 health information
     */
    async collectDB2Health() {
        try {
            logger_1.default.debug('Collecting DB2 health');
            // Get DB2 pod
            const podName = await this.getDB2PodName();
            if (!podName) {
                return this.createErrorHealth('No DB2 pod found');
            }
            // Check if DB2 engine is running
            const engineRunning = await this.checkDB2Engine(podName);
            // Test database connection
            const connectionStatus = await this.testDB2Connection(podName);
            // Get database state
            const databaseState = await this.getDatabaseState(podName);
            // Get active connections (simplified for now)
            const activeConnections = await this.getActiveConnections(podName);
            // Get lock waits (simplified for now)
            const lockWaits = 0; // Will implement later with proper DB2 queries
            // Determine health status
            const status = this.determineDB2HealthStatus(engineRunning, connectionStatus, databaseState);
            // Generate insights
            const { explanation, recommendation } = this.generateDB2Insights(status, engineRunning, connectionStatus, databaseState, activeConnections);
            const db2Health = {
                status,
                engineRunning,
                connectionStatus,
                databaseState,
                activeConnections,
                lockWaits,
                explanation,
                recommendation,
                lastChecked: new Date()
            };
            logger_1.default.info('DB2 health collected', {
                status,
                engineRunning,
                connectionStatus,
                databaseState
            });
            return db2Health;
        }
        catch (error) {
            logger_1.default.error('Error collecting DB2 health', { error });
            return this.createErrorHealth('Failed to collect DB2 health information');
        }
    }
    /**
     * Get DB2 pod name
     */
    async getDB2PodName() {
        try {
            const podsResponse = await this.k8sApi.listNamespacedPod(config_1.default.db2.namespace, undefined, undefined, undefined, undefined, config_1.default.db2.podLabel);
            if (podsResponse.body.items && podsResponse.body.items.length > 0) {
                return podsResponse.body.items[0].metadata?.name || null;
            }
            return null;
        }
        catch (error) {
            logger_1.default.error('Error getting DB2 pod name', { error });
            return null;
        }
    }
    /**
     * Check if DB2 engine is running
     */
    async checkDB2Engine(podName) {
        try {
            // Check if db2sysc process is running
            const command = ['sh', '-c', 'ps aux | grep db2sysc | grep -v grep'];
            const result = await this.execInPod(podName, command);
            return result.includes('db2sysc');
        }
        catch (error) {
            logger_1.default.error('Error checking DB2 engine', { error, podName });
            return false;
        }
    }
    /**
     * Test DB2 connection
     */
    async testDB2Connection(podName) {
        try {
            // Try to connect to database
            const command = [
                'su', '-', config_1.default.db2.user, '-c',
                `db2 connect to ${config_1.default.db2.database}`
            ];
            const result = await this.execInPod(podName, command);
            return result.includes('Database Connection Information') ||
                result.includes('SQL1024N'); // Already connected
        }
        catch (error) {
            logger_1.default.error('Error testing DB2 connection', { error, podName });
            return false;
        }
    }
    /**
     * Get database state
     */
    async getDatabaseState(podName) {
        try {
            const command = [
                'su', '-', config_1.default.db2.user, '-c',
                `db2 list active databases`
            ];
            const result = await this.execInPod(podName, command);
            if (result.includes('Active')) {
                return 'Active';
            }
            else if (result.includes('No data')) {
                return 'Inactive';
            }
            else {
                return 'Unknown';
            }
        }
        catch (error) {
            logger_1.default.error('Error getting database state', { error, podName });
            return 'Unknown';
        }
    }
    /**
     * Get active connections count
     */
    async getActiveConnections(podName) {
        try {
            const command = [
                'su', '-', config_1.default.db2.user, '-c',
                `db2 list applications | grep -c ${config_1.default.db2.database}`
            ];
            const result = await this.execInPod(podName, command);
            const count = parseInt(result.trim(), 10);
            return isNaN(count) ? 0 : count;
        }
        catch (error) {
            logger_1.default.debug('Error getting active connections', { error, podName });
            return 0;
        }
    }
    /**
     * Execute command in pod
     */
    async execInPod(podName, command) {
        return new Promise((resolve, reject) => {
            let output = '';
            let errorOutput = '';
            this.k8sExec.exec(config_1.default.db2.namespace, podName, 'db2', // container name
            command, process.stdout, process.stderr, process.stdin, false, (status) => {
                if (status.status === 'Success') {
                    resolve(output);
                }
                else {
                    reject(new Error(errorOutput || 'Command execution failed'));
                }
            }).then((conn) => {
                conn.on('data', (data) => {
                    output += data.toString();
                });
                conn.on('error', (data) => {
                    errorOutput += data.toString();
                });
            }).catch(reject);
        });
    }
    /**
     * Determine DB2 health status
     */
    determineDB2HealthStatus(engineRunning, connectionStatus, databaseState) {
        if (!engineRunning) {
            return types_1.HealthStatus.CRITICAL;
        }
        if (!connectionStatus) {
            return types_1.HealthStatus.CRITICAL;
        }
        if (databaseState === 'Unknown') {
            return types_1.HealthStatus.WARNING;
        }
        if (databaseState === 'Inactive') {
            return types_1.HealthStatus.WARNING;
        }
        return types_1.HealthStatus.HEALTHY;
    }
    /**
     * Generate beginner-friendly insights
     */
    generateDB2Insights(status, engineRunning, connectionStatus, databaseState, activeConnections) {
        let explanation = '';
        let recommendation = '';
        switch (status) {
            case types_1.HealthStatus.HEALTHY:
                explanation = `DB2 is running perfectly! The database engine is active, connections are working, and the database is ready to use. Currently ${activeConnections} active connection(s).`;
                recommendation = 'No action needed. Everything is working as expected.';
                break;
            case types_1.HealthStatus.WARNING:
                if (databaseState === 'Inactive') {
                    explanation = 'DB2 engine is running, but the database is not active. This means the database needs to be activated before it can be used.';
                    recommendation = 'Activate the database by connecting to it. Run: db2 activate database SAMPLE';
                }
                else if (databaseState === 'Unknown') {
                    explanation = 'DB2 engine is running, but we cannot determine the database state. This might be a temporary issue.';
                    recommendation = 'Try connecting to the database manually to verify it works. Check DB2 diagnostic logs if the issue persists.';
                }
                break;
            case types_1.HealthStatus.CRITICAL:
                if (!engineRunning) {
                    explanation = 'DB2 engine is not running! The database process (db2sysc) is not active. No database operations are possible.';
                    recommendation = 'Start the DB2 engine. Log into the pod and run: db2start. If it fails, check the db2diag.log for errors.';
                }
                else if (!connectionStatus) {
                    explanation = 'DB2 engine is running, but we cannot connect to the database. This could be a configuration issue or the database is in a bad state.';
                    recommendation = 'Check database configuration. Try: db2 list db directory. Verify the database exists and is not corrupted.';
                }
                break;
            case types_1.HealthStatus.UNKNOWN:
                explanation = 'Unable to determine DB2 health. There might be a communication issue with the pod.';
                recommendation = 'Check if the DB2 pod is running and accessible.';
                break;
        }
        return { explanation, recommendation };
    }
    /**
     * Create error health object
     */
    createErrorHealth(message) {
        return {
            status: types_1.HealthStatus.UNKNOWN,
            engineRunning: false,
            connectionStatus: false,
            databaseState: 'Unknown',
            activeConnections: 0,
            lockWaits: 0,
            explanation: message,
            recommendation: 'Check the DB2 pod and OpenShift connection.',
            lastChecked: new Date()
        };
    }
}
exports.DB2Collector = DB2Collector;
exports.default = new DB2Collector();
// Made with Bob
//# sourceMappingURL=db2.collector.js.map