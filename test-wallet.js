const { KumaClient } = require('./dist/services/KumaClient');
require('dotenv').config();

async function testWallet() {
  console.log('Testing wallet connection...\n');
  
  try {
    // Test with KUMA_ prefixed variables
    console.log('Using environment variables:');
    console.log('- API Key:', process.env.KUMA_API_KEY ? 'Found' : 'NOT FOUND');
    console.log('- API Secret:', process.env.KUMA_API_SECRET ? 'Found' : 'NOT FOUND');
    console.log('- Wallet Address:', process.env.KUMA_WALLET_ADDRESS || 'NOT FOUND');
    console.log('- Private Key:', process.env.KUMA_PRIVATE_KEY ? 'Found' : 'NOT FOUND');
    console.log('- Sandbox:', process.env.KUMA_SANDBOX || 'false');
    console.log('');
    
    const client = new KumaClient({
      sandbox: process.env.KUMA_SANDBOX === 'true',
      walletPrivateKey: process.env.KUMA_PRIVATE_KEY,
      apiKey: process.env.KUMA_API_KEY,
      apiSecret: process.env.KUMA_API_SECRET,
      wsUrl: process.env.KUMA_WS_URL || 'wss://v1-ws.kuma.bid',
      walletAddress: process.env.KUMA_WALLET_ADDRESS
    });
    
    console.log('Fetching wallets...');
    const wallets = await client.getWallets();
    
    console.log('\nWallet Response:');
    console.log(JSON.stringify(wallets, null, 2));
    
    if (wallets && wallets.length > 0) {
      const wallet = wallets[0];
      console.log('\nWallet Details:');
      console.log('- Address:', wallet.wallet);
      console.log('- Equity:', wallet.equity);
      console.log('- Free Collateral:', wallet.freeCollateral);
      console.log('- Unrealized P&L:', wallet.unrealizedPnL);
      console.log('- Positions:', wallet.positions?.length || 0);
    }
    
  } catch (error) {
    console.error('\nError fetching wallets:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    
    if (error.response) {
      console.error('\nAPI Response:');
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testWallet(); 