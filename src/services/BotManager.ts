import { GridBot } from '../bots/GridBot';
import { BotConfig, SYMBOL_CONFIGS } from '../types';
import { getConfigBySymbol, validateConfig, Config } from '../config';
import { KumaClient } from './KumaClient';
import { EventEmitter } from 'events';

// User-specific config type
interface UserConfig {
  apiKey: string;
  apiSecret: string;
  sandbox: boolean;
  walletAddress: string;
  walletPrivateKey?: string; // Optional - used for delegated wallets
}

export class BotManager extends EventEmitter {
  private bots: Map<string, GridBot> = new Map(); // key is bot ID, not symbol
  private botsBySymbol: Map<string, Set<string>> = new Map(); // symbol -> set of bot IDs

  constructor() {
    super();
  }

  // Create a new bot instance with optional user config
  async createBot(botConfig: BotConfig, userConfig?: UserConfig): Promise<string> {
    const symbol = botConfig.symbol;
    
    let config: Config;
    
    // If user config provided, use it; otherwise use default config
    if (userConfig) {
      // Create config from user data
      config = {
        apiKey: userConfig.apiKey,
        apiSecret: userConfig.apiSecret,
        sandbox: userConfig.sandbox,
        walletAddress: userConfig.walletAddress,
        walletPrivateKey: userConfig.walletPrivateKey || '',
        wsUrl: userConfig.sandbox 
          ? 'wss://api.sandbox.kuma.bid/ws'
          : 'wss://api.kuma.bid/ws',
        httpUrl: userConfig.sandbox
          ? 'https://api.sandbox.kuma.bid'
          : 'https://api.kuma.bid'
      };
    } else {
      // Get configuration for the symbol from environment
      config = getConfigBySymbol(symbol);
    validateConfig(config);
    }

    // Create bot instance with dashboardWss if available
    const bot = new GridBot(
      botConfig, 
      config,
      undefined, // dashboardWss - not used in this context
      userConfig ? {
        apiKey: userConfig.apiKey,
        apiSecret: userConfig.apiSecret,
        walletAddress: userConfig.walletAddress,
        walletPrivateKey: userConfig.walletPrivateKey
      } : undefined
    );
    const botId = bot.getBotId();

    // Store bot by ID
    this.bots.set(botId, bot);

    // Track bot ID by symbol
    if (!this.botsBySymbol.has(symbol)) {
      this.botsBySymbol.set(symbol, new Set());
    }
    this.botsBySymbol.get(symbol)!.add(botId);

    console.log(`Bot created: ${botId} for ${symbol} (wallet: ${config.walletAddress})`);
    return botId;
  }

  // Get bot by ID
  getBot(botId: string): GridBot | undefined {
    return this.bots.get(botId);
  }

  // Get all bots for a symbol
  getBotsBySymbol(symbol: string): GridBot[] {
    const botIds = this.botsBySymbol.get(symbol);
    if (!botIds) return [];
    
    return Array.from(botIds)
      .map(id => this.bots.get(id))
      .filter(bot => bot !== undefined) as GridBot[];
  }

  // Get all bots
  getAllBots(): Map<string, GridBot> {
    return new Map(this.bots);
  }

  // Start a bot by ID
  async startBot(botId: string): Promise<boolean> {
    const bot = this.bots.get(botId);
    if (!bot) {
      console.error(`Bot not found: ${botId}`);
      return false;
    }

    try {
      await bot.start();
      return true;
    } catch (error) {
      console.error(`Failed to start bot ${botId}:`, error);
      return false;
    }
  }

  // Stop a bot by ID
  async stopBot(botId: string): Promise<boolean> {
    const bot = this.bots.get(botId);
    if (!bot) {
      console.error(`Bot not found: ${botId}`);
      return false;
    }

    try {
      await bot.stop();
      return true;
    } catch (error) {
      console.error(`Failed to stop bot ${botId}:`, error);
      return false;
    }
  }

  // Remove a bot
  async removeBot(botId: string): Promise<boolean> {
    const bot = this.bots.get(botId);
    if (!bot) {
      console.error(`Bot not found: ${botId}`);
      return false;
    }

    // Stop bot if running
    if (bot.getStatus() === 'running') {
      await bot.stop();
    }

    // Remove from symbol tracking
    const symbol = bot.getConfig().symbol;
    const symbolBots = this.botsBySymbol.get(symbol);
    if (symbolBots) {
      symbolBots.delete(botId);
      if (symbolBots.size === 0) {
        this.botsBySymbol.delete(symbol);
      }
    }

    // Remove bot
    this.bots.delete(botId);
    console.log(`Bot removed: ${botId}`);
    return true;
  }

  // Get bot statistics
  getBotStats(botId: string): any {
    const bot = this.bots.get(botId);
    if (!bot) return null;

    const state = bot.getState();
    const config = bot.getConfig();

    return {
      botId,
      symbol: config.symbol,
      status: bot.getStatus(),
      uptime: bot.getUptime(),
      position: state.position,
      pnl: state.stats.totalPnL,
      trades: state.stats.totalTrades,
      volume: state.stats.totalVolume,
      fees: state.stats.fees.total
    };
  }

  // Shutdown all bots
  async shutdown(): Promise<void> {
    console.log('Shutting down all bots...');
    
    const shutdownPromises = Array.from(this.bots.values()).map(bot => {
      if (bot.getStatus() === 'running') {
        return bot.stop();
      }
      return Promise.resolve();
    });

    await Promise.all(shutdownPromises);
    this.bots.clear();
    this.botsBySymbol.clear();
    console.log('All bots shut down');
  }
} 