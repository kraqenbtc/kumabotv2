import { GridBot } from './bots/GridBot';
import { BotConfig, SYMBOL_CONFIGS } from './types';
import { getConfigBySymbol, validateConfig } from './config';
import { WebSocketServer } from 'ws';
import express from 'express';
import path from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
const symbol = args[0]?.toUpperCase() as keyof typeof SYMBOL_CONFIGS;

if (!symbol || !SYMBOL_CONFIGS[symbol]) {
  console.error('Usage: npm run bot [SYMBOL]');
  console.error('Available symbols:', Object.keys(SYMBOL_CONFIGS).join(', '));
  process.exit(1);
}

// Get default parameters for the symbol
function getDefaultBotConfig(symbol: keyof typeof SYMBOL_CONFIGS): BotConfig {
  const defaults: Record<keyof typeof SYMBOL_CONFIGS, Omit<BotConfig, 'symbol' | 'enabled'>> = {
    'BTC-USD': {
      initialQuantity: 0.03,
      baseIncrement: 0.005,
      incrementStep: 0.002,
      initialSpread: 80,
      spreadIncrement: 10,
      closingSpread: 50,
      maxPosition: 0.5
    },
    'ETH-USD': {
      initialQuantity: 1.1,
      baseIncrement: 0.3,
      incrementStep: 0.05,
      initialSpread: 2,
      spreadIncrement: 0.5,
      closingSpread: 1,
      maxPosition: 30
    },
    'SOL-USD': {
      initialQuantity: 8,
      baseIncrement: 1,
      incrementStep: 0.5,
      initialSpread: 0.3,
      spreadIncrement: 0.05,
      closingSpread: 0.2,
      maxPosition: 100
    },
    'BERA-USD': {
      initialQuantity: 100,
      baseIncrement: 10,
      incrementStep: 5,
      initialSpread: 0.01,
      spreadIncrement: 0.002,
      closingSpread: 0.005,
      maxPosition: 10000
    },
    'XRP-USD': {
      initialQuantity: 200,
      baseIncrement: 20,
      incrementStep: 10,
      initialSpread: 0.001,
      spreadIncrement: 0.0002,
      closingSpread: 0.0005,
      maxPosition: 20000
    }
  };

  return {
    symbol,
    enabled: true,
    ...defaults[symbol]
  };
}

// Setup WebSocket server for dashboard
const symbolPort = {
  'ETH-USD': 8080,
  'BTC-USD': 8081,
  'SOL-USD': 8082,
  'BERA-USD': 8083,
  'XRP-USD': 8084
}[symbol] || 8080;

const httpPort = {
  'ETH-USD': 3000,
  'BTC-USD': 3001,
  'SOL-USD': 3002,
  'BERA-USD': 3003,
  'XRP-USD': 3004
}[symbol] || 3000;

const dashboardWss = new WebSocketServer({ 
  host: '0.0.0.0',
  port: symbolPort 
});

// Setup Express server for dashboard
const app = express();
app.use(express.static(path.join(__dirname, '../public')));

// Start Express server
app.listen(httpPort, '0.0.0.0', () => {
  console.log(`[${symbol}] Dashboard server running on http://0.0.0.0:${httpPort}`);
  console.log(`[${symbol}] WebSocket server running on ws://0.0.0.0:${symbolPort}`);
});

// Load configuration
const config = getConfigBySymbol(symbol);
try {
  validateConfig(config);
} catch (error) {
  console.error(`Configuration error for ${symbol}:`, error);
  process.exit(1);
}

// Create bot configuration
const botConfig = getDefaultBotConfig(symbol);

// Create and start bot
const bot = new GridBot(botConfig, config, dashboardWss);

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nGracefully shutting down...');
  await bot.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nGracefully shutting down...');
  await bot.stop();
  process.exit(0);
});

// Start the bot
bot.start().catch(error => {
  console.error('Bot startup error:', error);
  process.exit(1);
}); 