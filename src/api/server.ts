import express, { Application } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { BotManager } from '../services/BotManager';
import botRoutes from './routes/bots';
import systemRoutes from './routes/system';
import accountRoutes from './routes/account';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './middleware/logger';

export class ApiServer {
  private app: Application;
  private server: any;
  private wss!: WebSocketServer;
  private botManager: BotManager;
  private port: number;

  constructor(botManager: BotManager, port: number = 4000) {
    this.app = express();
    this.botManager = botManager;
    this.port = port;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupMiddleware(): void {
    // CORS configuration
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }));

    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Logging
    this.app.use(logger);

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
      });
    });
  }

  private setupRoutes(): void {
    // API routes
    this.app.use('/api/bots', botRoutes(this.botManager));
    this.app.use('/api/account', accountRoutes(this.botManager));
    this.app.use('/api', systemRoutes());

    // Static files for dashboard
    this.app.use(express.static('public'));

    // Error handling
    this.app.use(errorHandler);

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Not found' });
    });
  }

  private setupWebSocket(): void {
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });

    this.wss.on('connection', (ws: WebSocket, req: any) => {
      console.log('New WebSocket connection from:', req.socket.remoteAddress);

      // Send initial bot states
      const bots = this.botManager.getAllBots();
      const states = Object.entries(bots).map(([symbol, bot]) => ({
        symbol,
        status: bot.getStatus(),
        state: bot.getState()
      }));

      ws.send(JSON.stringify({
        type: 'init',
        data: states
      }));

      // Subscribe to bot events
      const handleBotUpdate = (symbol: string, data: any) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'bot-update',
            symbol,
            data
          }));
        }
      };

      this.botManager.on('bot-update', handleBotUpdate);

      // Handle client messages
      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          
          switch (data.type) {
            case 'subscribe':
              // Client wants to subscribe to specific bot
              console.log(`Client subscribed to ${data.symbol}`);
              break;
            case 'unsubscribe':
              // Client wants to unsubscribe from specific bot
              console.log(`Client unsubscribed from ${data.symbol}`);
              break;
            case 'ping':
              ws.send(JSON.stringify({ type: 'pong' }));
              break;
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      // Cleanup on disconnect
      ws.on('close', () => {
        console.log('WebSocket connection closed');
        this.botManager.off('bot-update', handleBotUpdate);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
  }

  public start(): void {
    this.server.listen(this.port, () => {
      console.log(`API Server running on http://localhost:${this.port}`);
      console.log(`WebSocket Server running on ws://localhost:${this.port}`);
      console.log(`Health check: http://localhost:${this.port}/health`);
    });
  }

  public stop(): void {
    if (this.server) {
      this.wss.close();
      this.server.close(() => {
        console.log('API Server stopped');
      });
    }
  }
} 