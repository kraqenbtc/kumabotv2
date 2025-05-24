import { Router, Request, Response } from 'express';
import { SUPPORTED_SYMBOLS } from '../../config';

export default function systemRoutes(): Router {
  const router = Router();

  // Get supported symbols
  router.get('/symbols', (req: Request, res: Response) => {
    res.json({
      symbols: SUPPORTED_SYMBOLS,
      count: SUPPORTED_SYMBOLS.length
    });
  });

  // Get system info
  router.get('/info', (req: Request, res: Response) => {
    res.json({
      name: 'KumaBot v2 API',
      version: '2.0.0',
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      memory: process.memoryUsage(),
      env: process.env.NODE_ENV || 'development'
    });
  });

  // Get API documentation (basic info)
  router.get('/docs', (req: Request, res: Response) => {
    res.json({
      endpoints: {
        health: {
          path: '/health',
          method: 'GET',
          description: 'Health check endpoint'
        },
        system: {
          symbols: {
            path: '/api/symbols',
            method: 'GET',
            description: 'Get supported trading symbols'
          },
          info: {
            path: '/api/info',
            method: 'GET',
            description: 'Get system information'
          }
        },
        bots: {
          list: {
            path: '/api/bots',
            method: 'GET',
            description: 'List all bots and their status'
          },
          get: {
            path: '/api/bots/:symbol',
            method: 'GET',
            description: 'Get specific bot details'
          },
          start: {
            path: '/api/bots/:symbol/start',
            method: 'POST',
            description: 'Start a bot'
          },
          stop: {
            path: '/api/bots/:symbol/stop',
            method: 'POST',
            description: 'Stop a bot'
          },
          config: {
            path: '/api/bots/:symbol/config',
            method: 'PUT',
            description: 'Update bot configuration',
            body: {
              initialQuantity: 'number',
              baseIncrement: 'number',
              incrementStep: 'number',
              initialSpread: 'number',
              spreadIncrement: 'number',
              closingSpread: 'number',
              maxPosition: 'number',
              stopLoss: 'number (optional)',
              takeProfit: 'number (optional)',
              maxGridLevel: 'number (optional)'
            }
          },
          orders: {
            path: '/api/bots/:symbol/orders',
            method: 'GET',
            description: 'Get bot active orders'
          },
          trades: {
            path: '/api/bots/:symbol/trades',
            method: 'GET',
            description: 'Get bot trade history',
            query: {
              limit: 'number (default: 50)',
              offset: 'number (default: 0)'
            }
          },
          stats: {
            path: '/api/bots/:symbol/stats',
            method: 'GET',
            description: 'Get bot statistics'
          },
          reset: {
            path: '/api/bots/:symbol/reset',
            method: 'POST',
            description: 'Reset bot state and clear history'
          }
        }
      }
    });
  });

  return router;
} 