# Grid Trading Bot

A grid trading bot for ETH and BTC markets with real-time dashboard.

## Features

- Dual market support (ETH-USD and BTC-USD)
- Dynamic grid spacing and quantity increments
- Real-time web dashboard
- Trade history persistence
- Maker/Taker fee optimization
- Automatic position management
- WebSocket-based real-time updates

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/grid-trading-bot.git
cd grid-trading-bot
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your API credentials:
```env
KUMA_API_KEY=your_api_key
KUMA_API_SECRET=your_api_secret
KUMA_WALLET_ADDRESS=your_wallet_address
KUMA_PRIVATE_KEY=your_private_key
```

## Configuration

Edit `config.js` to customize bot parameters:

- ETH Grid Parameters:
  - Initial Quantity: 0.6 ETH
  - Base Increment: 0.2 ETH
  - Increment Step: 0.05 ETH
  - Initial Spread: 2 USD
  - Max Position: 20 ETH

- BTC Grid Parameters:
  - Initial Quantity: 0.025 BTC
  - Quantity Increment: 0.0025 BTC
  - Initial Spread: 60 USD
  - Spread Increment: 20 USD
  - Max Position: 0.5 BTC

## Usage

Start the bot with PM2:
```bash
pm2 start ecosystem.config.js
```

Access the dashboard:
```
http://your_server_ip:3000
```

## Dashboard Features

- Real-time price and position updates
- Trade history with PnL tracking
- Active order monitoring
- Fee analysis
- Side-by-side ETH and BTC views

## Trade History

Trade history is automatically saved to:
- `data/eth-usd_trades.json`
- `data/btc-usd_trades.json`

## License

MIT

## Author

Your Name 