# kumbo - Grid Trading Bot for Kuma Exchange

kumbo is a sophisticated grid trading bot system designed for the Kuma Exchange. It supports multiple cryptocurrencies with individual grid trading strategies.

## 🔐 Security: Delegated Keys (Recommended)

kumbo now supports **Delegated Keys** for enhanced security. This means you never need to share your main wallet's private key!

### How Delegated Keys Work:
1. kumbo generates a separate trading key
2. You authorize this key on Kuma Exchange
3. The bot can only trade, not withdraw funds
4. Your main wallet private key stays safe

### Setup Delegated Key:
```bash
# 1. Generate a delegated key
npm run delegated-key

# 2. Select option 1 and enter your wallet address
# 3. Note the generated delegated address
# 4. Go to Kuma Exchange and authorize this address
# 5. Set KUMA_USE_DELEGATED_KEY=true in your .env file
```

## Features

- **Multi-Currency Support**: Trade BTC, ETH, SOL, BERA, and XRP against USD
- **Grid Trading Strategy**: Automated buy/sell orders at predefined price levels
- **Risk Management**: Stop loss and take profit functionality
- **Web Dashboard**: Real-time monitoring and control via web interface
- **TypeScript**: Fully typed for better reliability
- **WebSocket Integration**: Real-time market data and order updates

## Supported Trading Pairs

- BTC-USD (0 decimal places)
- ETH-USD (1 decimal place)
- SOL-USD (2 decimal places)
- BERA-USD (3 decimal places)
- XRP-USD (4 decimal places)

## Grid Trading Strategy

The bot implements a dynamic grid trading strategy:
- Places buy and sell orders at calculated intervals
- Increases position size with each grid level
- Automatically manages closing orders
- Adapts spread based on grid level

## Installation

1. Clone the repository:
```bash
git clone https://github.com/kraqenbtc/kumbo.git
cd kumbo
```

2. Install dependencies:
```bash
npm install
cd dashboard && npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your Kuma Exchange credentials:
```
KUMA_API_KEY=your_api_key
KUMA_API_SECRET=your_api_secret
KUMA_WALLET_ADDRESS=your_wallet_address
KUMA_PRIVATE_KEY=your_private_key
KUMA_SANDBOX=false
```

## Usage

### Start the API Server

```bash
npm run build
node dist/api/index.js
```

The API server will run on http://localhost:4000

### Start the Dashboard

```bash
cd dashboard
npm run dev
```

The dashboard will be available at http://localhost:3000

### Creating and Managing Bots

1. Open the dashboard in your browser
2. Click "Create New Bot"
3. Select a trading pair
4. Configure bot parameters:
   - Initial Quantity
   - Base Increment
   - Spread settings
   - Risk parameters
5. Click "Start Bot"

## API Endpoints

- `GET /api/bots` - List all bots
- `POST /api/bots/create` - Create new bot
- `GET /api/bots/:botId` - Get bot details
- `POST /api/bots/:botId/start` - Start bot
- `POST /api/bots/:botId/stop` - Stop bot
- `DELETE /api/bots/:botId` - Delete bot
- `GET /api/account` - Get account information

## Project Structure

```
kumbo/
├── src/
│   ├── api/          # REST API server
│   ├── bots/         # Grid bot implementation
│   ├── services/     # Bot manager, Kuma client
│   ├── types/        # TypeScript definitions
│   └── config/       # Configuration loader
├── dashboard/        # Next.js web dashboard
└── data/            # Trade history storage
```

## Development

Run in development mode:
```bash
npm run api:dev  # API with auto-reload
cd dashboard && npm run dev  # Dashboard
```

## License

MIT

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

## Disclaimer

This bot is for educational purposes only. Cryptocurrency trading carries significant risks. Always test thoroughly in sandbox mode before using real funds. The authors are not responsible for any financial losses.

## Support

- GitHub Issues: [https://github.com/kraqenbtc/kumabotv2/issues](https://github.com/kraqenbtc/kumabotv2/issues)
- Discord: [Join our community](https://discord.gg/kuma)

---

Built with ❤️ by kraqenbtc 

## Quick Start

Once running, access the kumbo dashboard at:
```
http://localhost:3001
```

## Project Name

kumbo - A professional grid trading system for cryptocurrency markets. 