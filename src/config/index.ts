import dotenv from 'dotenv';
import { SYMBOL_CONFIGS } from '../types';

dotenv.config();

export interface Config {
  sandbox: boolean;
  walletPrivateKey: string;
  walletAddress: string;
  apiKey: string;
  apiSecret: string;
  wsUrl: string;
  httpUrl: string;
}

// Dynamic config loader for any symbol
export function getConfigBySymbol(symbol: keyof typeof SYMBOL_CONFIGS): Config {
  const symbolPrefix = symbol.split('-')[0]; // ETH, BTC, SOL, etc.
  
  return {
    sandbox: process.env[`${symbolPrefix}_SANDBOX`] === 'true' || process.env.KUMA_SANDBOX === 'true' || false,
    walletPrivateKey: process.env[`${symbolPrefix}_WALLET_PRIVATE_KEY`] || process.env[`${symbolPrefix}_PRIVATE_KEY`] || process.env.KUMA_PRIVATE_KEY || process.env.KUMA_WALLET_PRIVATE_KEY || '',
    walletAddress: process.env[`${symbolPrefix}_WALLET_ADDRESS`] || process.env.KUMA_WALLET_ADDRESS || '',
    apiKey: process.env[`${symbolPrefix}_API_KEY`] || process.env.KUMA_API_KEY || '',
    apiSecret: process.env[`${symbolPrefix}_API_SECRET`] || process.env.KUMA_API_SECRET || '',
    wsUrl: process.env[`${symbolPrefix}_WS_URL`] || process.env.KUMA_WS_URL || process.env.WS_URL || 'wss://v1-ws.kuma.bid',
    httpUrl: process.env[`${symbolPrefix}_HTTP_URL`] || process.env.KUMA_HTTP_URL || process.env.HTTP_URL || 'https://v1.kuma.bid'
  };
}

// Legacy configs for backward compatibility
export const ethConfig = getConfigBySymbol('ETH-USD');
export const btcConfig = getConfigBySymbol('BTC-USD');
export const solConfig = getConfigBySymbol('SOL-USD');

// Validate config
export function validateConfig(config: Config): void {
  const required = ['walletPrivateKey', 'apiKey', 'apiSecret'];
  
  for (const field of required) {
    if (!config[field as keyof Config]) {
      throw new Error(`Missing required configuration: ${field}`);
    }
  }
}

// Export supported symbols
export const SUPPORTED_SYMBOLS = [
  'BTC-USD',
  'ETH-USD', 
  'SOL-USD',
  'BERA-USD',
  'XRP-USD'
];

// Decimal places configuration for each symbol
export const SYMBOL_DECIMALS: Record<string, number> = {
  'BTC-USD': 0,    // BTC prices are integers
  'ETH-USD': 1,    // ETH has 1 decimal place
  'SOL-USD': 2,    // SOL has 2 decimal places
  'BERA-USD': 3,   // BERA has 3 decimal places  
  'XRP-USD': 4     // XRP has 4 decimal places
}; 