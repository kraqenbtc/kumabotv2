# KumaBot v2 - Advanced Grid Trading Bot

A sophisticated grid trading bot for Kuma exchange, built with TypeScript for enhanced type safety and maintainability.

## Features

- ✅ **Multi-Symbol Support**: Trade BTC, ETH, SOL, BERA, and XRP with proper decimal precision
- 🔐 **Type-Safe**: Built with TypeScript for reliability
- 📊 **Real-time Dashboard**: Monitor your bots via WebSocket
- 💹 **Dynamic Grid Levels**: Automatically adjusts quantity and spread
- 🛡️ **Risk Management**: Built-in stop loss and take profit
- 🔄 **Auto-Recovery**: Handles disconnections gracefully
- 📝 **Trade History**: Persistent trade logging and statistics
- 🌐 **REST API**: Full-featured API for bot management

## Supported Symbols

| Symbol | Price Decimals | Initial Quantity | Initial Spread |
|--------|---------------|------------------|----------------|
| BTC-USD | 0 (integers) | 0.03 | $80 |
| ETH-USD | 1 | 1.1 | $2 |
| SOL-USD | 2 | 8 | $0.30 |
| BERA-USD | 3 | 100 | $0.01 |
| XRP-USD | 4 | 200 | $0.001 |

## Installation

```bash
# Clone the repository
git clone https://github.com/kraqenbtc/kumabotv2.git
cd kumabotv2

# Install dependencies
npm install

# Build TypeScript
npm run build
```

## Configuration

Create a `.env` file in the root directory:

```env
# Exchange Configuration
WS_URL=wss://v1-ws.kuma.bid
HTTP_URL=https://v1.kuma.bid

# API Server Configuration
API_PORT=4000

# BTC Bot Configuration
BTC_WALLET_PRIVATE_KEY=0x...
BTC_WALLET_ADDRESS=0x...
BTC_API_KEY=your-api-key
BTC_API_SECRET=your-api-secret

# ETH Bot Configuration
ETH_WALLET_PRIVATE_KEY=0x...
ETH_WALLET_ADDRESS=0x...
ETH_API_KEY=your-api-key
ETH_API_SECRET=your-api-secret

# SOL Bot Configuration
SOL_WALLET_PRIVATE_KEY=0x...
SOL_WALLET_ADDRESS=0x...
SOL_API_KEY=your-api-key
SOL_API_SECRET=your-api-secret

# BERA Bot Configuration (optional)
BERA_WALLET_PRIVATE_KEY=0x...
BERA_WALLET_ADDRESS=0x...
BERA_API_KEY=your-api-key
BERA_API_SECRET=your-api-secret

# XRP Bot Configuration (optional)
XRP_WALLET_PRIVATE_KEY=0x...
XRP_WALLET_ADDRESS=0x...
XRP_API_KEY=your-api-key
XRP_API_SECRET=your-api-secret
```

## Usage

### Running Individual Bots

```bash
# Run specific bots
npm run start:btc   # Start BTC bot
npm run start:eth   # Start ETH bot
npm run start:sol   # Start SOL bot
npm run start:bera  # Start BERA bot
npm run start:xrp   # Start XRP bot
```

### Running with PM2

```bash
# Start all bots with PM2
npm run start:all

# Check bot status
pm2 status

# View logs
pm2 logs

# Stop all bots
pm2 stop all
```

### Running the API Server

```bash
# Start API server
npm run start:api

# Start API server in development mode
npm run dev:api
```

### Dashboard Access

Each bot runs its own dashboard:
- BTC: http://localhost:3001 (WebSocket: ws://localhost:8081)
- ETH: http://localhost:3000 (WebSocket: ws://localhost:8080)
- SOL: http://localhost:3002 (WebSocket: ws://localhost:8082)
- BERA: http://localhost:3003 (WebSocket: ws://localhost:8083)
- XRP: http://localhost:3004 (WebSocket: ws://localhost:8084)

## API Documentation

The API server runs on port 4000 by default (configurable via `API_PORT` env variable).

### Base URL
```
http://localhost:4000
```

### Health Check
```http
GET /health
```

### System Endpoints

#### Get Supported Symbols
```http
GET /api/symbols
```

#### Get System Info
```http
GET /api/info
```

#### Get API Documentation
```http
GET /api/docs
```

### Bot Management Endpoints

#### List All Bots
```http
GET /api/bots
```

#### Get Bot Details
```http
GET /api/bots/:symbol
```

#### Start a Bot
```http
POST /api/bots/:symbol/start
```

#### Stop a Bot
```http
POST /api/bots/:symbol/stop
```

#### Update Bot Configuration
```http
PUT /api/bots/:symbol/config
Content-Type: application/json

{
  "initialQuantity": 0.1,
  "baseIncrement": 0.02,
  "incrementStep": 0.01,
  "initialSpread": 10,
  "spreadIncrement": 5,
  "closingSpread": 5,
  "maxPosition": 10,
  "stopLoss": -100,
  "takeProfit": 200,
  "maxGridLevel": 10
}
```

#### Get Bot Orders
```http
GET /api/bots/:symbol/orders
```

#### Get Bot Trades
```http
GET /api/bots/:symbol/trades?limit=50&offset=0
```

#### Get Bot Statistics
```http
GET /api/bots/:symbol/stats
```

#### Reset Bot
```http
POST /api/bots/:symbol/reset
```

### WebSocket API

Connect to the WebSocket server for real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:4000');

// Subscribe to a specific bot
ws.send(JSON.stringify({
  type: 'subscribe',
  symbol: 'BTC-USD'
}));

// Receive bot updates
ws.on('message', (data) => {
  const message = JSON.parse(data);
  if (message.type === 'bot-update') {
    console.log('Bot update:', message.symbol, message.data);
  }
});
```

## Grid Strategy

The bot implements an advanced grid trading strategy:

1. **Initial Orders**: Places buy and sell orders at configured spread
2. **Dynamic Scaling**: Increases quantity and spread with each grid level
3. **Position Management**: Tracks average entry price and manages closing orders
4. **Auto-Reset**: Automatically starts new cycle after position close

### Configuration Parameters

```typescript
interface BotConfig {
  symbol: string;              // Trading pair
  initialQuantity: number;     // Starting order size
  baseIncrement: number;       // Base quantity increment
  incrementStep: number;       // Increment growth per level
  initialSpread: number;       // Starting price spread
  spreadIncrement: number;     // Spread growth per level
  closingSpread: number;       // Profit target spread
  maxPosition: number;         // Maximum position size
  stopLoss?: number;          // Optional stop loss (USD)
  takeProfit?: number;        // Optional take profit (USD)
  maxGridLevel?: number;      // Maximum grid levels
}
```

## Project Structure

```
kumabotv2/
├── src/
│   ├── index.ts           # Main entry point
│   ├── types/             # TypeScript definitions
│   ├── config/            # Configuration management
│   ├── services/          # Core services
│   │   ├── KumaClient.ts  # Exchange API wrapper
│   │   ├── TradeHistory.ts # Trade persistence
│   │   └── BotManager.ts  # Bot lifecycle management
│   ├── bots/              # Bot implementations
│   │   └── GridBot.ts     # Main grid bot logic
│   └── api/               # REST API
│       ├── server.ts      # Express server setup
│       ├── routes/        # API routes
│       └── middleware/    # Express middleware
├── public/                # Dashboard UI
├── data/                  # Trade history storage
└── dist/                  # Compiled JavaScript
```

## Development

```bash
# Run in development mode with auto-reload
npm run dev ETH-USD

# Run API in development mode
npm run dev:api

# Run tests
npm test

# Lint code
npm run lint

# Type check
npm run type-check
```

## Safety Features

- **Rate Limiting**: Prevents API throttling
- **Error Recovery**: Automatic reconnection on failures
- **Position Limits**: Prevents over-leveraging
- **Graceful Shutdown**: Properly closes positions on exit
- **Trade Validation**: Ensures order parameters are valid

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This bot is for educational purposes only. Cryptocurrency trading carries significant risks. Always test thoroughly in sandbox mode before using real funds. The authors are not responsible for any financial losses.

## Support

- GitHub Issues: [https://github.com/kraqenbtc/kumabotv2/issues](https://github.com/kraqenbtc/kumabotv2/issues)
- Discord: [Join our community](https://discord.gg/kuma)

---

Built with ❤️ by kraqenbtc 