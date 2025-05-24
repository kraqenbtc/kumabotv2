#!/bin/bash

echo "🚀 Starting KumaBot v2 Dashboard Setup..."

# Check if API is running
if ! pgrep -f "ts-node src/api/index.ts" > /dev/null; then
    echo "⚡ Starting API server..."
    cd "$(dirname "$0")"
    npm run start:api &
    echo "⏳ Waiting for API to start..."
    sleep 5
else
    echo "✅ API server is already running"
fi

# Setup dashboard environment
echo "📦 Setting up dashboard..."
cd dashboard

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
    echo "✅ Created .env.local"
fi

# Install dependencies if needed
if [ ! -d node_modules ]; then
    echo "📦 Installing dashboard dependencies..."
    npm install
fi

# Start dashboard
echo "🎨 Starting dashboard on http://localhost:3000..."
npm run dev

# Instructions
echo ""
echo "🎉 Dashboard is running!"
echo "📊 Dashboard: http://localhost:3000"
echo "🔧 API: http://localhost:4000"
echo ""
echo "Press Ctrl+C to stop both services" 