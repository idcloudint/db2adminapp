import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import config from './config';
import logger from './utils/logger';
import healthRoutes from './routes/health.routes';
import healthService from './services/health.service';
import { WebSocketMessage } from './types';

// Create Express app
const app: Express = express();
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

// Middleware
app.use(cors({
  origin: config.cors.origin,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip
  });
  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// API routes
app.use('/api/health', healthRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    timestamp: new Date()
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', { error: err });
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date()
  });
});

// WebSocket connection handling
wss.on('connection', (ws: WebSocket) => {
  logger.info('WebSocket client connected');

  // Send initial health data
  healthService.getHealthSummary()
    .then(summary => {
      const message: WebSocketMessage = {
        type: 'health_update',
        payload: summary,
        timestamp: new Date()
      };
      ws.send(JSON.stringify(message));
    })
    .catch(error => {
      logger.error('Error sending initial health data', { error });
    });

  // Handle client messages
  ws.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      logger.debug('WebSocket message received', { message });
      
      // Handle different message types
      if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date() }));
      }
    } catch (error) {
      logger.error('Error handling WebSocket message', { error });
    }
  });

  ws.on('close', () => {
    logger.info('WebSocket client disconnected');
  });

  ws.on('error', (error) => {
    logger.error('WebSocket error', { error });
  });
});

// Broadcast health updates to all connected clients
function broadcastHealthUpdate() {
  healthService.getHealthSummary()
    .then(summary => {
      const message: WebSocketMessage = {
        type: 'health_update',
        payload: summary,
        timestamp: new Date()
      };
      
      const messageStr = JSON.stringify(message);
      
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(messageStr);
        }
      });
      
      logger.debug('Health update broadcasted', { 
        clients: wss.clients.size,
        status: summary.overallStatus 
      });
    })
    .catch(error => {
      logger.error('Error broadcasting health update', { error });
    });
}

// Start periodic health collection and broadcasting
const healthCollectionInterval = setInterval(() => {
  broadcastHealthUpdate();
}, config.collection.intervalPod);

// WebSocket heartbeat
const heartbeatInterval = setInterval(() => {
  const message: WebSocketMessage = {
    type: 'heartbeat',
    payload: { timestamp: new Date() },
    timestamp: new Date()
  };
  
  const messageStr = JSON.stringify(message);
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}, config.websocket.heartbeatInterval);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  clearInterval(healthCollectionInterval);
  clearInterval(heartbeatInterval);
  
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  clearInterval(healthCollectionInterval);
  clearInterval(heartbeatInterval);
  
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Start server
server.listen(config.port, () => {
  logger.info('DB2 Day 2 Ops Backend started', {
    port: config.port,
    nodeEnv: config.nodeEnv,
    db2Namespace: config.db2.namespace
  });
  
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   DB2 Day 2 Operations Dashboard - Backend API           ║
║                                                           ║
║   Server:     http://localhost:${config.port}                      ║
║   WebSocket:  ws://localhost:${config.port}/ws                    ║
║   Health:     http://localhost:${config.port}/health              ║
║                                                           ║
║   Environment: ${config.nodeEnv.padEnd(44)}║
║   DB2 Namespace: ${config.db2.namespace.padEnd(42)}║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;

// Made with Bob
