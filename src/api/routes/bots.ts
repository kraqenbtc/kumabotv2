import { Router, Request, Response, NextFunction } from 'express';
import { BotManager } from '../../services/BotManager';
import { createApiError } from '../middleware/errorHandler';
import { BotConfig } from '../../types';

export default function botRoutes(botManager: BotManager): Router {
  const router = Router();

  // Get all bots status
  router.get('/', (req: Request, res: Response) => {
    const bots = botManager.getAllBots();
    const response = Object.entries(bots).map(([symbol, bot]) => ({
      symbol,
      status: bot.getStatus(),
      state: bot.getState(),
      uptime: bot.getUptime(),
      config: bot.getConfig()
    }));
    
    res.json({
      count: response.length,
      bots: response
    });
  });

  // Get specific bot status
  router.get('/:symbol', (req: Request, res: Response, next: NextFunction) => {
    const { symbol } = req.params;
    const bot = botManager.getBot(symbol);
    
    if (!bot) {
      return next(createApiError(`Bot ${symbol} not found`, 404));
    }
    
    res.json({
      symbol,
      status: bot.getStatus(),
      state: bot.getState(),
      uptime: bot.getUptime(),
      config: bot.getConfig(),
      statistics: {
        totalTrades: bot.getState().stats.totalTrades,
        winningTrades: bot.getState().stats.winningTrades,
        totalVolume: bot.getState().stats.totalVolume,
        totalPnL: bot.getState().stats.totalPnL,
        fees: bot.getState().stats.fees
      }
    });
  });

  // Start a bot
  router.post('/:symbol/start', async (req: Request, res: Response, next: NextFunction) => {
    const { symbol } = req.params;
    
    try {
      let bot = botManager.getBot(symbol);
      
      if (!bot) {
        // Try to create and start the bot
        const success = await botManager.startBot(symbol);
        if (!success) {
          return next(createApiError(`Failed to start bot for ${symbol}`, 500));
        }
        bot = botManager.getBot(symbol);
      } else if (bot.getStatus() === 'running') {
        return next(createApiError(`Bot ${symbol} is already running`, 400));
      } else {
        // Start existing bot
        await bot.start();
      }
      
      res.json({
        message: `Bot ${symbol} started successfully`,
        status: bot?.getStatus(),
        state: bot?.getState()
      });
    } catch (error: any) {
      next(createApiError(`Failed to start bot: ${error.message}`, 500));
    }
  });

  // Stop a bot
  router.post('/:symbol/stop', async (req: Request, res: Response, next: NextFunction) => {
    const { symbol } = req.params;
    const bot = botManager.getBot(symbol);
    
    if (!bot) {
      return next(createApiError(`Bot ${symbol} not found`, 404));
    }
    
    if (bot.getStatus() !== 'running') {
      return next(createApiError(`Bot ${symbol} is not running`, 400));
    }
    
    try {
      await bot.stop();
      res.json({
        message: `Bot ${symbol} stopped successfully`,
        status: bot.getStatus()
      });
    } catch (error: any) {
      next(createApiError(`Failed to stop bot: ${error.message}`, 500));
    }
  });

  // Update bot configuration
  router.put('/:symbol/config', async (req: Request, res: Response, next: NextFunction) => {
    const { symbol } = req.params;
    const config: Partial<BotConfig> = req.body;
    
    const bot = botManager.getBot(symbol);
    if (!bot) {
      return next(createApiError(`Bot ${symbol} not found`, 404));
    }
    
    if (bot.getStatus() === 'running') {
      return next(createApiError(`Cannot update config while bot is running`, 400));
    }
    
    try {
      // Validate config
      const validFields = [
        'initialQuantity', 'baseIncrement', 'incrementStep',
        'initialSpread', 'spreadIncrement', 'closingSpread',
        'maxPosition', 'stopLoss', 'takeProfit', 'maxGridLevel'
      ];
      
      const invalidFields = Object.keys(config).filter(key => !validFields.includes(key));
      if (invalidFields.length > 0) {
        return next(createApiError(`Invalid configuration fields: ${invalidFields.join(', ')}`, 400));
      }
      
      // Update bot config
      const currentConfig = bot.getConfig();
      const newConfig = { ...currentConfig, ...config };
      bot.updateConfig(newConfig);
      
      res.json({
        message: `Bot ${symbol} configuration updated`,
        config: newConfig
      });
    } catch (error: any) {
      next(createApiError(`Failed to update config: ${error.message}`, 500));
    }
  });

  // Get bot orders
  router.get('/:symbol/orders', (req: Request, res: Response, next: NextFunction) => {
    const { symbol } = req.params;
    const bot = botManager.getBot(symbol);
    
    if (!bot) {
      return next(createApiError(`Bot ${symbol} not found`, 404));
    }
    
    const state = bot.getState();
    res.json({
      symbol,
      activeOrders: Array.from(state.activeOrders.values()),
      count: state.activeOrders.size
    });
  });

  // Get bot trades
  router.get('/:symbol/trades', (req: Request, res: Response, next: NextFunction) => {
    const { symbol } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const bot = botManager.getBot(symbol);
    if (!bot) {
      return next(createApiError(`Bot ${symbol} not found`, 404));
    }
    
    const trades = bot.getTrades();
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    
    res.json({
      symbol,
      total: trades.length,
      trades: trades.slice(offsetNum, offsetNum + limitNum),
      limit: limitNum,
      offset: offsetNum
    });
  });

  // Get bot statistics
  router.get('/:symbol/stats', (req: Request, res: Response, next: NextFunction) => {
    const { symbol } = req.params;
    const bot = botManager.getBot(symbol);
    
    if (!bot) {
      return next(createApiError(`Bot ${symbol} not found`, 404));
    }
    
    const state = bot.getState();
    const stats = state.stats;
    
    // Calculate additional statistics
    const winRate = stats.totalTrades > 0 
      ? (stats.winningTrades / stats.totalTrades * 100).toFixed(2) 
      : '0.00';
    
    const avgTradeSize = stats.totalTrades > 0
      ? (stats.totalVolume / stats.totalTrades).toFixed(2)
      : '0.00';
    
    const netPnL = stats.totalPnL - stats.fees.total;
    
    res.json({
      symbol,
      statistics: {
        ...stats,
        winRate: parseFloat(winRate),
        avgTradeSize: parseFloat(avgTradeSize),
        netPnL,
        currentPosition: state.position.quantity,
        currentCost: state.position.cost,
        gridLevel: state.gridLevel,
        uptime: bot.getUptime()
      }
    });
  });

  // Reset bot (clear state and trades)
  router.post('/:symbol/reset', async (req: Request, res: Response, next: NextFunction) => {
    const { symbol } = req.params;
    const bot = botManager.getBot(symbol);
    
    if (!bot) {
      return next(createApiError(`Bot ${symbol} not found`, 404));
    }
    
    if (bot.getStatus() === 'running') {
      return next(createApiError(`Cannot reset bot while running`, 400));
    }
    
    try {
      bot.reset();
      res.json({
        message: `Bot ${symbol} reset successfully`,
        state: bot.getState()
      });
    } catch (error: any) {
      next(createApiError(`Failed to reset bot: ${error.message}`, 500));
    }
  });

  return router;
} 