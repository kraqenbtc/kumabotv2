# Kumbo Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ installed
- npm or yarn package manager
- Kuma Exchange account with API credentials

### 1. Setup Environment

First, create your `.env` file:
```bash
cp .env.example .env
```

Edit `.env` and add your Kuma Exchange credentials:
```env
KUMA_API_KEY=your_api_key_here
KUMA_API_SECRET=your_api_secret_here
KUMA_WALLET_ADDRESS=0x_your_wallet_address
KUMA_PRIVATE_KEY=0x_your_private_key
KUMA_SANDBOX=false
```

### 2. Install Dependencies

```bash
# Install backend dependencies
npm install

# Install dashboard dependencies
cd dashboard && npm install && cd ..
```

### 3. Start Kumbo

The easiest way to start everything:
```bash
./start-dashboard.sh
```

This will:
- ✅ Build the backend if needed
- ✅ Start the API server on port 4000
- ✅ Build the dashboard if needed
- ✅ Start the dashboard on port 3000
- ✅ Show you all the URLs and quick commands

### 4. Access Kumbo

- 📊 **Dashboard**: http://localhost:3000
- 🔧 **API Server**: http://localhost:4000
- 📚 **API Docs**: http://localhost:4000/api/docs

### 5. Create Your First Bot

1. Open the dashboard in your browser
2. Check your account balance in the Account Overview
3. Click the "+" button to create a new bot
4. Select a trading pair (BTC, ETH, SOL, BERA, or XRP)
5. Configure your bot parameters:
   - Initial Quantity
   - Grid spreads
   - Risk management settings
6. Click "Start Bot"

### 6. Monitor Your Bots

- View real-time P&L
- Track positions and grid levels
- Monitor recent trades
- Check account balances

### 7. Stop Services

To stop all services cleanly:
```bash
./stop-all.sh
```

## 🛠️ Manual Commands

If you prefer to run services manually:

### Backend API
```bash
# Development mode
npm run api:dev

# Production mode
npm run build
npm run api
```

### Dashboard
```bash
cd dashboard

# Development mode
npm run dev

# Production mode
npm run build
npm run start
```

## 🔧 Troubleshooting

### API Not Starting?
- Check if port 4000 is already in use
- Verify your .env file has all required variables
- Check logs for any error messages

### Dashboard Not Loading?
- Make sure API is running first
- Check if port 3000 is available
- Try clearing browser cache

### Bot Not Trading?
- Verify account has sufficient balance
- Check that you're using the correct trading pair
- Ensure WebSocket connection is stable

## 📞 Need Help?

- Check the main [README.md](README.md) for detailed documentation
- Review API endpoints at http://localhost:4000/api/docs
- Check console logs for detailed error messages 