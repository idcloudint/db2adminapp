"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const ws_1 = require("ws");
const config_1 = __importDefault(require("./config"));
const logger_1 = __importDefault(require("./utils/logger"));
const health_routes_1 = __importDefault(require("./routes/health.routes"));
const health_service_1 = __importDefault(require("./services/health.service"));
// Create Express app
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// Create WebSocket server
const wss = new ws_1.WebSocketServer({ server, path: '/ws' });
// Middleware
app.use((0, cors_1.default)({
    origin: config_1.default.cors.origin,
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Request logging middleware
app.use((req, _res, next) => {
    logger_1.default.info('Incoming request', {
        method: req.method,
        path: req.path,
        ip: req.ip
    });
    next();
});
// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});
// API routes
app.use('/api/health', health_routes_1.default);
// 404 handler
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not found',
        timestamp: new Date()
    });
});
// Error handler
app.use((err, _req, res, _next) => {
    logger_1.default.error('Unhandled error', { error: err });
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date()
    });
});
// WebSocket connection handling
wss.on('connection', (ws) => {
    logger_1.default.info('WebSocket client connected');
    // Send initial health data
    health_service_1.default.getHealthSummary()
        .then(summary => {
        const message = {
            type: 'health_update',
            payload: summary,
            timestamp: new Date()
        };
        ws.send(JSON.stringify(message));
    })
        .catch(error => {
        logger_1.default.error('Error sending initial health data', { error });
    });
    // Handle client messages
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            logger_1.default.debug('WebSocket message received', { message });
            // Handle different message types
            if (message.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong', timestamp: new Date() }));
            }
        }
        catch (error) {
            logger_1.default.error('Error handling WebSocket message', { error });
        }
    });
    ws.on('close', () => {
        logger_1.default.info('WebSocket client disconnected');
    });
    ws.on('error', (error) => {
        logger_1.default.error('WebSocket error', { error });
    });
});
// Broadcast health updates to all connected clients
function broadcastHealthUpdate() {
    health_service_1.default.getHealthSummary()
        .then(summary => {
        const message = {
            type: 'health_update',
            payload: summary,
            timestamp: new Date()
        };
        const messageStr = JSON.stringify(message);
        wss.clients.forEach((client) => {
            if (client.readyState === ws_1.WebSocket.OPEN) {
                client.send(messageStr);
            }
        });
        logger_1.default.debug('Health update broadcasted', {
            clients: wss.clients.size,
            status: summary.overallStatus
        });
    })
        .catch(error => {
        logger_1.default.error('Error broadcasting health update', { error });
    });
}
// Start periodic health collection and broadcasting
const healthCollectionInterval = setInterval(() => {
    broadcastHealthUpdate();
}, config_1.default.collection.intervalPod);
// WebSocket heartbeat
const heartbeatInterval = setInterval(() => {
    const message = {
        type: 'heartbeat',
        payload: { timestamp: new Date() },
        timestamp: new Date()
    };
    const messageStr = JSON.stringify(message);
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.WebSocket.OPEN) {
            client.send(messageStr);
        }
    });
}, config_1.default.websocket.heartbeatInterval);
// Graceful shutdown
process.on('SIGTERM', () => {
    logger_1.default.info('SIGTERM received, shutting down gracefully');
    clearInterval(healthCollectionInterval);
    clearInterval(heartbeatInterval);
    server.close(() => {
        logger_1.default.info('Server closed');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    logger_1.default.info('SIGINT received, shutting down gracefully');
    clearInterval(healthCollectionInterval);
    clearInterval(heartbeatInterval);
    server.close(() => {
        logger_1.default.info('Server closed');
        process.exit(0);
    });
});
// Start server
server.listen(config_1.default.port, () => {
    logger_1.default.info('DB2 Day 2 Ops Backend started', {
        port: config_1.default.port,
        nodeEnv: config_1.default.nodeEnv,
        db2Namespace: config_1.default.db2.namespace
    });
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   DB2 Day 2 Operations Dashboard - Backend API           ║
║                                                           ║
║   Server:     http://localhost:${config_1.default.port}                      ║
║   WebSocket:  ws://localhost:${config_1.default.port}/ws                    ║
║   Health:     http://localhost:${config_1.default.port}/health              ║
║                                                           ║
║   Environment: ${config_1.default.nodeEnv.padEnd(44)}║
║   DB2 Namespace: ${config_1.default.db2.namespace.padEnd(42)}║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
exports.default = app;
// Made with Bob
//# sourceMappingURL=index.js.map