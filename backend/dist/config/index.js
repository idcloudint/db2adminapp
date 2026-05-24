"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
const config = {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    db2: {
        namespace: process.env.DB2_NAMESPACE || 'db2-community',
        podLabel: process.env.DB2_POD_LABEL || 'app=db2',
        service: process.env.DB2_SERVICE || 'db2-service',
        port: parseInt(process.env.DB2_PORT || '50000', 10),
        database: process.env.DB2_DATABASE || 'SAMPLE',
        user: process.env.DB2_USER || 'db2inst1',
        password: process.env.DB2_PASSWORD || 'db2inst1-pwd'
    },
    openshift: {
        kubeconfigPath: process.env.KUBECONFIG_PATH
    },
    collection: {
        intervalPod: parseInt(process.env.COLLECTION_INTERVAL_POD || '60000', 10),
        intervalDB2: parseInt(process.env.COLLECTION_INTERVAL_DB2 || '60000', 10),
        intervalStorage: parseInt(process.env.COLLECTION_INTERVAL_STORAGE || '300000', 10),
        intervalBackup: parseInt(process.env.COLLECTION_INTERVAL_BACKUP || '300000', 10)
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE || 'logs/app.log'
    },
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
    },
    websocket: {
        heartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL || '30000', 10)
    }
};
exports.default = config;
// Made with Bob
//# sourceMappingURL=index.js.map