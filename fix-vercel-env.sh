#!/bin/bash

# Script to update Vercel environment variables
# This fixes the Supabase URL mismatch issue

echo "🔧 Fixing Vercel Environment Variables"
echo "========================================"
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "⚠️  Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Read variables from .env file
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    exit 1
fi

SUPABASE_URL=$(grep VITE_SUPABASE_URL .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
SUPABASE_KEY=$(grep VITE_SUPABASE_ANON_KEY .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo "❌ Error: Could not read Supabase variables from .env file"
    exit 1
fi

echo "✅ Found Supabase URL: $SUPABASE_URL"
echo "✅ Found Supabase Key: ${SUPABASE_KEY:0:20}..."
echo ""

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo "📝 Please login to Vercel:"
    vercel login
fi

echo ""
echo "🔗 Linking project (if not already linked)..."
vercel link

echo ""
echo "📝 Updating environment variables in Vercel..."
echo ""

# Remove old variables first
echo "Removing old VITE_SUPABASE_URL..."
echo "y" | vercel env rm VITE_SUPABASE_URL production 2>/dev/null || true

echo "Removing old VITE_SUPABASE_ANON_KEY..."
echo "y" | vercel env rm VITE_SUPABASE_ANON_KEY production 2>/dev/null || true

# Add new variables
echo ""
echo "Adding new VITE_SUPABASE_URL..."
echo "$SUPABASE_URL" | vercel env add VITE_SUPABASE_URL production

echo ""
echo "Adding new VITE_SUPABASE_ANON_KEY..."
echo "$SUPABASE_KEY" | vercel env add VITE_SUPABASE_ANON_KEY production

echo ""
echo "✅ Environment variables updated!"
echo ""
echo "🚀 Next steps:"
echo "1. Go to Vercel dashboard and redeploy"
echo "2. Make sure to disable 'Use existing Build Cache'"
echo "3. Clear browser cache after deployment"
echo "4. Test the signup page"
echo ""

