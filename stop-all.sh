#!/bin/bash

echo "🛑 Stopping Kumbo services..."

# Stop API server
if pgrep -f "node dist/api/index.js" > /dev/null; then
    echo "Stopping API server..."
    pkill -f "node dist/api/index.js"
fi

if pgrep -f "ts-node src/api/index.ts" > /dev/null; then
    echo "Stopping development API server..."
    pkill -f "ts-node src/api/index.ts"
fi

# Stop dashboard
if pgrep -f "next-server" > /dev/null; then
    echo "Stopping dashboard..."
    pkill -f "next-server"
fi

# Clean up any remaining node processes for this project
if pgrep -f "kumbo" > /dev/null; then
    echo "Cleaning up remaining processes..."
    pkill -f "kumbo"
fi

echo "✅ All services stopped"
echo ""
echo "To restart, run: ./start-dashboard.sh" 