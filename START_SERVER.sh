#!/bin/bash

echo "🚀 Starting BuildFast Chat Backend Server"
echo ""

# Check if we're in the right directory
if [ ! -f "server/index.js" ]; then
    echo "❌ Error: server/index.js not found"
    echo "   Please run this script from the project root directory"
    exit 1
fi

# Navigate to server directory
cd server

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
PORT=3000
FRONTEND_URL=http://localhost:5173
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
EOF
    echo "✅ Created server/.env file"
    echo ""
    echo "⚠️  IMPORTANT: Edit server/.env and add your Stripe Secret Key"
    echo "   Get it from: https://dashboard.stripe.com/test/apikeys"
    echo ""
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Start the server
echo "▶️  Starting server..."
echo ""
npm run dev

