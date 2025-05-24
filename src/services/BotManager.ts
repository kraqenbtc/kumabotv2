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

  // Create a new bot instance
  async createBot(botConfig: BotConfig): Promise<string> {
    const botId = botConfig.id || `${botConfig.symbol}-${Date.now()}`;
    
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

  // Start a bot
  async startBot(botId: string): Promise<void> {
    const instance = this.bots.get(botId);
    if (!instance) {
      throw new Error(`Bot ${botId} not found`);
    }

    if (instance.status === 'running') {
      throw new Error(`Bot ${botId} is already running`);
    }

    try {
      instance.status = 'running';
      instance.startTime = new Date();
      instance.error = undefined;
      
      await instance.bot.start();
      
      this.emit('bot:started', { botId });
    } catch (error: any) {
      instance.status = 'error';
      instance.error = error.message;
      
      this.emit('bot:error', { botId, error: error.message });
      throw error;
    }
  }

  // Stop a bot
  async stopBot(botId: string): Promise<void> {
    const instance = this.bots.get(botId);
    if (!instance) {
      throw new Error(`Bot ${botId} not found`);
    }

    if (instance.status === 'stopped') {
      return;
    }

    try {
      await instance.bot.stop();
      instance.status = 'stopped';
      
      this.emit('bot:stopped', { botId });
    } catch (error: any) {
      instance.status = 'error';
      instance.error = error.message;
      
      this.emit('bot:error', { botId, error: error.message });
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

  // Get all bots
  getAllBots(): Map<string, BotInstance> {
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