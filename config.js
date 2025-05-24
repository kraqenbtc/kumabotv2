// Load environment variables if .env file exists
try {
  require('dotenv').config();
} catch (error) {
  console.warn('dotenv not loaded');
}

module.exports = {
  // API endpoints
  apiUrl: process.env.KUMA_API_URL || 'https://api.kuma.bid/v1',
  wsUrl: process.env.KUMA_WS_URL || 'wss://websocket.kuma.bid/v1',
  
  // For development/testing, you might want to use the sandbox instead:
  // apiUrl: 'https://api-sandbox.kuma.bid/v1',
  // wsUrl: 'wss://websocket-sandbox.kuma.bid/v1',
  
  // API credentials - replace with your actual keys or use environment variables
  apiKey: process.env.KUMA_API_KEY || 'YOUR_API_KEY',
  apiSecret: process.env.KUMA_API_SECRET || 'YOUR_API_SECRET',
  
  // Wallet information
  walletAddress: process.env.KUMA_WALLET_ADDRESS || 'YOUR_WALLET_ADDRESS',
  privateKey: process.env.KUMA_PRIVATE_KEY || 'YOUR_PRIVATE_KEY', // Only needed for trade endpoints
  
  // XCHAIN chain configuration
  chainId: parseInt(process.env.KUMA_CHAIN_ID) || 94524, // 64002 for testnet
  exchangeContractAddress: process.env.KUMA_EXCHANGE_CONTRACT || '0xB231947A9B2075BaF978eA321eC6512344071F7C', // For production
  // exchangeContractAddress: '0x6332648a69e921A3F8b1C2aA632CaA79d0965c89', // For sandbox
  
  // Bot configuration
  botUseRealTrades: true, // ENABLED REAL TRADING
  botOrderSize: process.env.BOT_ORDER_SIZE || '1.50000000', // Default order size
}; 