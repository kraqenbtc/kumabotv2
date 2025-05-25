const fs = require('fs');
const path = require('path');

const envTemplate = `# Kuma API Credentials (used for all symbols)
KUMA_API_KEY=your_api_key_here
KUMA_API_SECRET=your_api_secret_here
KUMA_WALLET_ADDRESS=your_wallet_address_here
KUMA_PRIVATE_KEY=your_private_key_here

# Optional: Use sandbox environment
KUMA_SANDBOX=false

# Optional: Custom URLs
# KUMA_WS_URL=wss://v1-ws.kuma.bid
# KUMA_HTTP_URL=https://v1.kuma.bid

# Symbol-specific overrides (optional)
# If you want different credentials for specific symbols, you can use:
# BTC_API_KEY=btc_specific_api_key
# BTC_API_SECRET=btc_specific_api_secret
# BTC_WALLET_ADDRESS=btc_specific_wallet_address
# BTC_PRIVATE_KEY=btc_specific_private_key
`;

const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envPath)) {
  console.log('.env file already exists!');
  console.log('Current variables:');
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n').filter(line => line.includes('KUMA_') && !line.startsWith('#'));
  lines.forEach(line => console.log('  ' + line));
} else {
  fs.writeFileSync(envPath, envTemplate);
  console.log('.env file created successfully!');
  console.log('Please update it with your actual Kuma API credentials.');
}

console.log('\nRequired environment variables:');
console.log('  KUMA_API_KEY');
console.log('  KUMA_API_SECRET');
console.log('  KUMA_WALLET_ADDRESS');
console.log('  KUMA_PRIVATE_KEY'); 