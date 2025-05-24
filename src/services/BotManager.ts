import { GridBot } from '../bots/GridBot';
import { BotConfig, SYMBOL_CONFIGS } from '../types';
import { getConfigBySymbol, validateConfig } from '../config';
import { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';

interface BotInstance {
  bot: GridBot;
  config: BotConfig;
  status: 'running' | 'stopped' | 'error';
  startTime?: Date;
  error?: string;
}

export class BotManager extends EventEmitter {
  private bots: Map<string, BotInstance> = new Map();
  private dashboardServers: Map<string, WebSocketServer> = new Map();

  constructor() {
    super();
  }

  // Get bot by symbol (returns the GridBot instance directly)
  getBot(symbol: string): GridBot | undefined {
    // First try to get by exact symbol as ID
    const instance = this.bots.get(symbol);
    if (instance) {
      return instance.bot;
    }
    
    // If not found, search for bot with matching symbol
    for (const [botId, instance] of this.bots) {
      if (instance.config.symbol === symbol) {
        return instance.bot;
      }
    }
    
    return undefined;
  }

  // Get all bots as a record (for API compatibility)
  getAllBots(): Record<string, GridBot> {
    const result: Record<string, GridBot> = {};
    
    for (const [symbol, instance] of this.bots) {
      result[symbol] = instance.bot;
    }
    
    return result;
  }

  // Create a new bot instance
  async createBot(botConfig: BotConfig): Promise<string> {
    const botId = botConfig.id || botConfig.symbol; // Use symbol as default ID
    
    // Check if bot already exists
    if (this.bots.has(botId)) {
      throw new Error(`Bot with ID ${botId} already exists`);
    }

    // Get exchange config
    const exchangeConfig = getConfigBySymbol(botConfig.symbol);
    validateConfig(exchangeConfig);

    // Create WebSocket server for dashboard
    const wsPort = this.getAvailablePort(8080, 8090);
    const dashboardWss = new WebSocketServer({ 
      host: '0.0.0.0',
      port: wsPort 
    });

    // Create bot instance
    const bot = new GridBot(botConfig, exchangeConfig, dashboardWss);
    
    // Store bot instance
    this.bots.set(botId, {
      bot,
      config: botConfig,
      status: 'stopped'
    });

    this.dashboardServers.set(botId, dashboardWss);

    this.emit('bot:created', { botId, config: botConfig });
    
    return botId;
  }

  // Start a bot (accepts both symbol and botId)
  async startBot(symbolOrBotId: string): Promise<boolean> {
    let instance = this.bots.get(symbolOrBotId);
    
    // If not found by ID, try to find by symbol
    if (!instance) {
      for (const [botId, inst] of this.bots) {
        if (inst.config.symbol === symbolOrBotId) {
          instance = inst;
          break;
        }
      }
    }
    
    // If still not found, try to create a new bot
    if (!instance) {
      try {
        const symbolConfig = SYMBOL_CONFIGS[symbolOrBotId as keyof typeof SYMBOL_CONFIGS];
        if (!symbolConfig) {
          console.error(`Invalid symbol: ${symbolOrBotId}`);
          return false;
        }
        
        const botConfig: BotConfig = {
          symbol: symbolOrBotId as keyof typeof SYMBOL_CONFIGS,
          initialQuantity: 0.1,
          baseIncrement: 0.02,
          incrementStep: 0.01,
          initialSpread: 10,
          spreadIncrement: 5,
          closingSpread: 5,
          maxPosition: 10,
          enabled: true
        };
        
        const botId = await this.createBot(botConfig);
        instance = this.bots.get(botId);
      } catch (error) {
        console.error(`Failed to create bot for ${symbolOrBotId}:`, error);
        return false;
      }
    }

    if (!instance) {
      return false;
    }

    if (instance.status === 'running') {
      return true; // Already running
    }

    try {
      instance.status = 'running';
      instance.startTime = new Date();
      instance.error = undefined;
      
      await instance.bot.start();
      
      this.emit('bot:started', { botId: symbolOrBotId });
      return true;
    } catch (error: any) {
      instance.status = 'error';
      instance.error = error.message;
      
      this.emit('bot:error', { botId: symbolOrBotId, error: error.message });
      return false;
    }
  }

  // Stop a bot
  async stopBot(symbolOrBotId: string): Promise<void> {
    let instance = this.bots.get(symbolOrBotId);
    
    // If not found by ID, try to find by symbol
    if (!instance) {
      for (const [botId, inst] of this.bots) {
        if (inst.config.symbol === symbolOrBotId) {
          instance = inst;
          break;
        }
      }
    }

    if (!instance) {
      throw new Error(`Bot ${symbolOrBotId} not found`);
    }

    if (instance.status === 'stopped') {
      return;
    }

    try {
      await instance.bot.stop();
      instance.status = 'stopped';
      
      this.emit('bot:stopped', { botId: symbolOrBotId });
    } catch (error: any) {
      instance.status = 'error';
      instance.error = error.message;
      
      this.emit('bot:error', { botId: symbolOrBotId, error: error.message });
      throw error;
    }
  }

  // Delete a bot
  async deleteBot(botId: string): Promise<void> {
    const instance = this.bots.get(botId);
    if (!instance) {
      throw new Error(`Bot ${botId} not found`);
    }

    // Stop bot if running
    if (instance.status === 'running') {
      await this.stopBot(botId);
    }

    // Close dashboard server
    const dashboardWss = this.dashboardServers.get(botId);
    if (dashboardWss) {
      dashboardWss.close();
      this.dashboardServers.delete(botId);
    }

    // Remove from map
    this.bots.delete(botId);
    
    this.emit('bot:deleted', { botId });
  }

  // Get bot status
  getBotStatus(botId: string): BotInstance | undefined {
    return this.bots.get(botId);
  }

  // Get all bot instances
  getAllBotInstances(): Map<string, BotInstance> {
    return new Map(this.bots);
  }

  // Get bots by symbol
  getBotsBySymbol(symbol: keyof typeof SYMBOL_CONFIGS): Map<string, BotInstance> {
    const result = new Map<string, BotInstance>();
    
    for (const [botId, instance] of this.bots) {
      if (instance.config.symbol === symbol) {
        result.set(botId, instance);
      }
    }
    
    return result;
  }

  // Update bot config (requires restart)
  async updateBotConfig(botId: string, newConfig: Partial<BotConfig>): Promise<void> {
    const instance = this.bots.get(botId);
    if (!instance) {
      throw new Error(`Bot ${botId} not found`);
    }

    // Stop bot if running
    const wasRunning = instance.status === 'running';
    if (wasRunning) {
      await this.stopBot(botId);
    }

    // Update config
    instance.config = { ...instance.config, ...newConfig };

    // Restart if was running
    if (wasRunning && instance.config.enabled) {
      await this.startBot(botId);
    }

    this.emit('bot:updated', { botId, config: instance.config });
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    const stopPromises: Promise<void>[] = [];
    
    for (const [botId, instance] of this.bots) {
      if (instance.status === 'running') {
        stopPromises.push(this.stopBot(botId));
      }
    }
    
    await Promise.all(stopPromises);
    
    // Close all dashboard servers
    for (const dashboardWss of this.dashboardServers.values()) {
      dashboardWss.close();
    }
    
    this.emit('manager:shutdown');
  }

  // Get available port
  private getAvailablePort(start: number, end: number): number {
    const usedPorts = new Set<number>();
    
    for (const wss of this.dashboardServers.values()) {
      const address = wss.address();
      if (typeof address === 'object' && address !== null) {
        usedPorts.add(address.port);
      }
    }
    
    for (let port = start; port <= end; port++) {
      if (!usedPorts.has(port)) {
        return port;
      }
    }
    
    throw new Error(`No available ports between ${start} and ${end}`);
  }

  // Get bot statistics
  async getBotStats(botId: string): Promise<any> {
    const instance = this.bots.get(botId);
    if (!instance) {
      throw new Error(`Bot ${botId} not found`);
    }

    // TODO: Implement method to get stats from GridBot
    // For now, return basic info
    return {
      botId,
      symbol: instance.config.symbol,
      status: instance.status,
      startTime: instance.startTime,
      error: instance.error,
      config: instance.config
    };
  }
} 