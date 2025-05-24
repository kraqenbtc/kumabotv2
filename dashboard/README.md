# KumaBot v2 Dashboard

A modern, real-time dashboard for managing KumaBot v2 grid trading bots.

## Features

- 🎯 **Real-time Bot Management**: Start, stop, and monitor bots
- 📊 **Live Statistics**: Track P&L, volume, and trades
- 💹 **Trade History**: View recent trades with detailed information
- 🌓 **Dark Theme**: Modern dark UI optimized for trading
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Setup

1. **Install dependencies**:
```bash
npm install
```

2. **Create environment file**:
Create a `.env.local` file in the dashboard directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

3. **Start the dashboard**:
```bash
npm run dev
```

The dashboard will be available at `http://localhost:3000`

## Prerequisites

- KumaBot v2 API must be running on port 4000
- Node.js 18+ and npm

## Usage

1. **View All Bots**: The main page shows all available trading symbols
2. **Start a Bot**: Click the play button to create and start a bot
3. **Monitor Performance**: View real-time P&L, position, and grid level
4. **Trade History**: Click on a bot card to see recent trades
5. **Stop Bot**: Click the stop button to halt trading

## Technology Stack

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **React Query**: Data fetching and caching
- **Lucide Icons**: Modern icon set
- **Recharts**: Charting library (ready for charts)

## Dashboard Components

- **Header**: Shows system status and branding
- **StatsOverview**: Displays aggregate statistics
- **BotCard**: Individual bot control and monitoring
- **RecentTrades**: Detailed trade history table

## API Integration

The dashboard connects to the KumaBot v2 API endpoints:
- `GET /api/bots` - List all bots
- `GET /api/symbols` - Get supported symbols
- `POST /api/bots/:symbol/start` - Start a bot
- `POST /api/bots/:symbol/stop` - Stop a bot
- `GET /api/bots/:symbol/trades` - Get trade history

## Future Enhancements

- Real-time price charts
- Bot configuration editor
- Performance analytics
- Trade export functionality
- Multi-user support
- Mobile app
