# 🚀 START BACKEND SERVER - QUICK GUIDE

## ⚡ Quick Start (3 Steps)

### Step 1: Navigate to Server Directory
```bash
cd server
```

### Step 2: Create .env File (if not exists)
```bash
# Copy the example
cp .env.example .env

# Or create manually:
cat > .env << EOF
PORT=3000
FRONTEND_URL=http://localhost:5173
STRIPE_SECRET_KEY=sk_test_your_actual_key_here
EOF
```

### Step 3: Get Your Stripe Secret Key
1. Go to: https://dashboard.stripe.com/test/apikeys
2. Copy your **Secret key** (starts with `sk_test_`)
3. Paste it in `server/.env` as `STRIPE_SECRET_KEY`

### Step 4: Start Server
```bash
npm run dev
```

## ✅ Success Output

You should see:
```
🚀 Server running on http://localhost:3000
✅ Stripe initialized successfully
🌐 Frontend URL: http://localhost:5173
```

## 🔧 Run from Project Root

Or run from project root:
```bash
npm run server
```

## ⚠️ Common Issues

**Issue:** `Cannot connect to backend server`
- **Solution:** Make sure server is running on port 3000
- **Check:** Open http://localhost:3000/api/health in browser (should show `{"status":"ok"}`)

**Issue:** `Stripe is not configured`
- **Solution:** Add `STRIPE_SECRET_KEY` to `server/.env` file
- **Get key:** https://dashboard.stripe.com/test/apikeys

**Issue:** Port 3000 already in use
- **Solution:** Change PORT in `server/.env` or kill process on port 3000

