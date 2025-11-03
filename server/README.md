# Backend Server - Quick Start

## ⚡ Start Server (2 Commands)

```bash
# 1. Make sure you have .env file
ls -la .env

# 2. Start server
npm run dev
```

## 📝 Setup .env File

Create `server/.env`:

```env
PORT=3000
FRONTEND_URL=http://localhost:5173
STRIPE_SECRET_KEY=sk_test_your_actual_key_here
```

**Get Stripe Key:**
1. Go to: https://dashboard.stripe.com/test/apikeys
2. Copy **Secret key** (starts with `sk_test_`)
3. Paste in `.env` file

## ✅ Success

You should see:
```
🚀 Server running on http://localhost:3000
✅ Stripe initialized successfully
🌐 Frontend URL: http://localhost:5173
```

## 🧪 Test Server

Open in browser: http://localhost:3000/api/health

Should show: `{"status":"ok","message":"Server is running"}`

