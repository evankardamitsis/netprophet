#!/bin/bash

# NetProphet Development Script
# This script starts all development services concurrently

echo "🚀 Starting NetProphet development environment..."

# Check if required tools are installed
command -v supabase >/dev/null 2>&1 || { echo "❌ Supabase CLI is required but not installed. Install with: npm install -g supabase"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm is required but not installed. Install with: npm install -g pnpm"; exit 1; }

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local not found. Please copy env.example to .env.local and configure your environment variables."
    exit 1
fi

# Start Supabase in the background
echo "📊 Starting Supabase..."
supabase start > /dev/null 2>&1 &
SUPABASE_PID=$!

# Wait a moment for Supabase to start
sleep 5

# Check if Supabase started successfully
if ! curl -s http://localhost:54321/health > /dev/null; then
    echo "❌ Failed to start Supabase. Please check your configuration."
    exit 1
fi

echo "✅ Supabase started successfully"

# Start web app
echo "🌐 Starting web app..."
pnpm --filter=@netprophet/web dev &
WEB_PID=$!

# Start mobile app
echo "📱 Starting mobile app..."
pnpm --filter=@netprophet/mobile start &
MOBILE_PID=$!

# Function to cleanup on exit
cleanup() {
    echo "🛑 Shutting down development environment..."
    kill $SUPABASE_PID 2>/dev/null
    kill $WEB_PID 2>/dev/null
    kill $MOBILE_PID 2>/dev/null
    supabase stop > /dev/null 2>&1
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

echo "✅ All services started!"
echo ""
echo "📊 Supabase Dashboard: http://localhost:54323"
echo "🌐 Web App: http://localhost:3000"
echo "📱 Mobile App: Expo DevTools should open automatically"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for all background processes
wait 