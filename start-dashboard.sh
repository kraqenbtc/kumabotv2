#!/bin/bash

echo "🚀 Starting Kumbo Dashboard Setup..."

# Check if API is running
if ! pgrep -f "node dist/api/index.js" > /dev/null && ! pgrep -f "ts-node src/api/index.ts" > /dev/null; then
    echo "⚡ Starting API server..."
    cd "$(dirname "$0")"
    
    # Build if needed
    if [ ! -d "dist" ]; then
        echo "📦 Building backend..."
        npm run build
    fi
    
    # Start API server
    node dist/api/index.js &
    API_PID=$!
    echo "⏳ Waiting for API to start (PID: $API_PID)..."
    sleep 3
else
    echo "✅ API server is already running"
fi

# Check API health
echo "🔍 Checking API health..."
if curl -s http://localhost:4000/health > /dev/null; then
    echo "✅ API is healthy"
else
    echo "❌ API health check failed"
    echo "Please check the API logs"
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

# Build dashboard if needed
if [ ! -d .next ]; then
    echo "🔨 Building dashboard..."
    npm run build
fi

# Start dashboard
echo "🎨 Starting Kumbo Dashboard on http://localhost:3000..."
npm run dev &
DASHBOARD_PID=$!

# Wait a bit for dashboard to start
sleep 5

# Instructions
echo ""
echo "✨ ======================= ✨"
echo "🎉 Kumbo is running!"
echo "✨ ======================= ✨"
echo ""
echo "📊 Dashboard: http://localhost:3000"
echo "🔧 API Server: http://localhost:4000"
echo "📚 API Docs: http://localhost:4000/api/docs"
echo ""
echo "🛠️  Quick Commands:"
echo "  - Create Bot: Click '+' in dashboard"
echo "  - View Logs: Check terminal output"
echo "  - Stop All: Press Ctrl+C"
echo ""
echo "💡 First time? Make sure to:"
echo "  1. Configure your .env file with Kuma Exchange credentials"
echo "  2. Check account balance in the dashboard"
echo "  3. Create your first bot with appropriate settings"
echo ""

# Wait for Ctrl+C
wait $API_PID $DASHBOARD_PID 