import { Router, Request, Response, NextFunction } from 'express';
import { BotManager } from '../../services/BotManager';
import { createApiError } from '../middleware/errorHandler';
import { BotConfig, SYMBOL_CONFIGS } from '../../types';
import { KumaClient } from '../../services/KumaClient';
import { getConfigBySymbol, validateConfig } from '../../config';

export default function botRoutes(botManager: BotManager): Router {
  const router = Router();

  // Get all bots
  router.get('/', (req: Request, res: Response) => {
    const allBots = botManager.getAllBots();
    const response = Array.from(allBots.entries()).map(([botId, bot]) => ({
      botId,
      symbol: bot.getConfig().symbol,
      status: bot.getStatus(),
      state: bot.getState(),
      uptime: bot.getUptime()
    }));
    
    res.json({
      count: response.length,
      bots: response
    });
  });

  // Get bots by symbol
  router.get('/symbol/:symbol', (req: Request, res: Response, next: NextFunction) => {
    const { symbol } = req.params;
    const bots = botManager.getBotsBySymbol(symbol);
    
    const response = bots.map(bot => ({
      botId: bot.getBotId(),
      symbol: bot.getConfig().symbol,
      status: bot.getStatus(),
      state: bot.getState(),
      uptime: bot.getUptime()
    }));
    
    res.json({
      symbol,
      count: response.length,
      bots: response
    });
  });

  // Get specific bot by ID
  router.get('/:botId', (req: Request, res: Response, next: NextFunction) => {
    const { botId } = req.params;
    const bot = botManager.getBot(botId);
    
    if (!bot) {
      return next(createApiError(`Bot ${botId} not found`, 404));
    }
    
    const state = bot.getState();
    res.json({
      botId,
      symbol: bot.getConfig().symbol,
      status: bot.getStatus(),
      state: state,
      uptime: bot.getUptime(),
      config: bot.getConfig(),
      statistics: {
        totalTrades: state.stats.totalTrades,
        winningTrades: state.stats.winningTrades,
        totalVolume: state.stats.totalVolume,
        totalPnL: state.stats.totalPnL,
        fees: state.stats.fees
      }
    });
  });

  // Create and start a new bot
  router.post('/create', async (req: Request, res: Response, next: NextFunction) => {
    const { symbol, config: customConfig } = req.body;
    
    if (!symbol || !SYMBOL_CONFIGS[symbol as keyof typeof SYMBOL_CONFIGS]) {
      return next(createApiError('Invalid symbol', 400));
    }
    
    try {
      // Get default config and merge with custom config
      const defaultConfig = getDefaultBotConfig(symbol as keyof typeof SYMBOL_CONFIGS);
      const botConfig = { ...defaultConfig, ...customConfig, enabled: true };
      
      // Create bot
      const botId = await botManager.createBot(botConfig);
      const bot = botManager.getBot(botId);
      
      if (!bot) {
        return next(createApiError('Failed to create bot', 500));
      }
      
      // Start bot if requested
      if (req.body.autoStart !== false) {
        await bot.start();
      }
      
      res.json({ 
        message: 'Bot created successfully',
        botId,
        symbol,
        status: bot.getStatus(),
        config: botConfig
      });
    } catch (error: any) {
      next(createApiError(`Failed to create bot: ${error.message}`, 500));
    }
  });

  // Start a bot by ID
  router.post('/:botId/start', async (req: Request, res: Response, next: NextFunction) => {
    const { botId } = req.params;
    
    try {
      const bot = botManager.getBot(botId);
      
      if (!bot) {
        return next(createApiError(`Bot ${botId} not found`, 404));
      }
      
      if (bot.getStatus() === 'running') {
        return next(createApiError(`Bot ${botId} is already running`, 400));
      }
      
      const success = await botManager.startBot(botId);
      
      if (!success) {
        return next(createApiError(`Failed to start bot ${botId}`, 500));
      }
      
      res.json({ 
        message: `Bot ${botId} started successfully`,
        botId,
        status: bot.getStatus()
      });
    } catch (error: any) {
      next(createApiError(`Failed to start bot: ${error.message}`, 500));
    }
  });

  // Stop a bot by ID
  router.post('/:botId/stop', async (req: Request, res: Response, next: NextFunction) => {
    const { botId } = req.params;
    
    try {
      const bot = botManager.getBot(botId);
      
      if (!bot) {
        return next(createApiError(`Bot ${botId} not found`, 404));
      }
      
      if (bot.getStatus() !== 'running') {
        return next(createApiError(`Bot ${botId} is not running`, 400));
      }
      
      const success = await botManager.stopBot(botId);
      
      if (!success) {
        return next(createApiError(`Failed to stop bot ${botId}`, 500));
      }
      
      res.json({
        message: `Bot ${botId} stopped successfully`,
        botId,
        status: bot.getStatus()
      });
    } catch (error: any) {
      next(createApiError(`Failed to stop bot: ${error.message}`, 500));
    }
  });

  // Delete a bot by ID
  router.delete('/:botId', async (req: Request, res: Response, next: NextFunction) => {
    const { botId } = req.params;
    
    try {
      const success = await botManager.removeBot(botId);
      
      if (!success) {
        return next(createApiError(`Failed to remove bot ${botId}`, 404));
      }
      
      res.json({
        message: `Bot ${botId} removed successfully`
      });
    } catch (error: any) {
      next(createApiError(`Failed to remove bot: ${error.message}`, 500));
    }
  });

  // Get bot configuration
  router.get('/:botId/config', (req: Request, res: Response, next: NextFunction) => {
    const { botId } = req.params;
    const bot = botManager.getBot(botId);
    
    if (!bot) {
      return next(createApiError(`Bot ${botId} not found`, 404));
    }
    
    res.json({
      botId,
      config: bot.getConfig()
    });
  });

  // Update bot configuration
  router.put('/:botId/config', (req: Request, res: Response, next: NextFunction) => {
    const { botId } = req.params;
    const updates = req.body;
    
    try {
      const bot = botManager.getBot(botId);
      
      if (!bot) {
        return next(createApiError(`Bot ${botId} not found`, 404));
      }
      
      // Validate new configuration
      const allowedFields = [
        'initialQuantity', 'baseIncrement', 'incrementStep',
        'initialSpread', 'spreadIncrement', 'closingSpread',
        'maxPosition', 'stopLoss', 'takeProfit', 'maxGridLevel'
      ];
      
      for (const key of Object.keys(updates)) {
        if (!allowedFields.includes(key)) {
          return next(createApiError(`Invalid configuration field: ${key}`, 400));
        }
      }
      
      // Apply new configuration
      const currentConfig = bot.getConfig();
      const newConfig = { ...currentConfig, ...updates };
      bot.updateConfig(newConfig);
      
      res.json({
        message: 'Configuration updated successfully',
        botId,
        config: newConfig
      });
    } catch (error: any) {
      next(createApiError(`Failed to update bot config: ${error.message}`, 500));
    }
  });

  // Get bot orders
  router.get('/:botId/orders', (req: Request, res: Response, next: NextFunction) => {
    const { botId } = req.params;
    const bot = botManager.getBot(botId);
    
    if (!bot) {
      return next(createApiError(`Bot ${botId} not found`, 404));
    }
    
    const state = bot.getState();
    res.json({
      botId,
      symbol: bot.getConfig().symbol,
      activeOrders: Array.from(state.activeOrders.values()),
      count: state.activeOrders.size
    });
  });

  // Get bot trades
  router.get('/:botId/trades', (req: Request, res: Response, next: NextFunction) => {
    const { botId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const bot = botManager.getBot(botId);
    if (!bot) {
      return next(createApiError(`Bot ${botId} not found`, 404));
    }
    
    const trades = bot.getTrades();
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    
    res.json({
      botId,
      symbol: bot.getConfig().symbol,
      total: trades.length,
      trades: trades.slice(offsetNum, offsetNum + limitNum),
      limit: limitNum,
      offset: offsetNum
    });
  });

  // Get bot statistics
  router.get('/:botId/stats', (req: Request, res: Response, next: NextFunction) => {
    const { botId } = req.params;
    const stats = botManager.getBotStats(botId);
    
    if (!stats) {
      return next(createApiError(`Bot ${botId} not found`, 404));
    }
    
    res.json(stats);
  });

  // Get default config for a symbol (for UI)
  router.get('/config/:symbol', (req: Request, res: Response, next: NextFunction) => {
    const { symbol } = req.params;
    
    try {
      const config = getConfigBySymbol(symbol as any);
      const botConfig = getDefaultBotConfig(symbol as any);
      
      res.json({
        symbol,
        config: botConfig,
        apiConfigured: !!config.apiKey
      });
    } catch (error: any) {
      next(createApiError(`Failed to get bot config: ${error.message}`, 500));
    }
  });

  return router;
}

// Helper function to get default bot configuration
function getDefaultBotConfig(symbol: keyof typeof SYMBOL_CONFIGS): Omit<BotConfig, 'enabled'> {
  const defaults: Record<keyof typeof SYMBOL_CONFIGS, Omit<BotConfig, 'symbol' | 'enabled'>> = {
    'BTC-USD': {
      initialQuantity: 0.03,
      baseIncrement: 0.005,
      incrementStep: 0.002,
      initialSpread: 80,
      spreadIncrement: 10,
      closingSpread: 50,
      maxPosition: 0.5,
      stopLoss: 0.05,
      takeProfit: 0.05,
      maxGridLevel: 10
    },
    'ETH-USD': {
      initialQuantity: 1.1,
      baseIncrement: 0.3,
      incrementStep: 0.05,
      initialSpread: 2,
      spreadIncrement: 0.5,
      closingSpread: 1,
      maxPosition: 30,
      stopLoss: 0.05,
      takeProfit: 0.05,
      maxGridLevel: 10
    },
    'SOL-USD': {
      initialQuantity: 8,
      baseIncrement: 1,
      incrementStep: 0.5,
      initialSpread: 0.3,
      spreadIncrement: 0.05,
      closingSpread: 0.2,
      maxPosition: 100,
      stopLoss: 0.05,
      takeProfit: 0.05,
      maxGridLevel: 10
    },
    'BERA-USD': {
      initialQuantity: 100,
      baseIncrement: 10,
      incrementStep: 5,
      initialSpread: 0.01,
      spreadIncrement: 0.002,
      closingSpread: 0.005,
      maxPosition: 10000,
      stopLoss: 0.05,
      takeProfit: 0.05,
      maxGridLevel: 10
    },
    'XRP-USD': {
      initialQuantity: 200,
      baseIncrement: 20,
      incrementStep: 10,
      initialSpread: 0.001,
      spreadIncrement: 0.0002,
      closingSpread: 0.0005,
      maxPosition: 20000,
      stopLoss: 0.05,
      takeProfit: 0.05,
      maxGridLevel: 10
    }
  };

  return {
    symbol,
    ...defaults[symbol]
  };
} 