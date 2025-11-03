# 🚨 URGENT: Backend Server Must Be Running

## ❌ The Error Means:
**"Failed to create checkout session"** = Backend server is NOT running

## ✅ FIX IT NOW (3 Commands):

### 1. Open Terminal (Keep it open!)
```bash
cd /Users/yusufdiallo/Desktop/buildfast/ChatApp/server
```

### 2. Start the Server:
```bash
npm run dev
```

### 3. Add Stripe Key (in server/.env):
```bash
# Get key from: https://dashboard.stripe.com/test/apikeys
# Edit server/.env and replace:
STRIPE_SECRET_KEY=sk_test_your_actual_key_here
```

## ✅ Expected Output:
```
==================================================
🚀 Server running on http://localhost:3000
📦 Stripe configured: ✅
🌐 Frontend URL: http://localhost:5173
==================================================
```

## 🧪 Verify It Works:
Open: http://localhost:3000/api/health

Should show: `{"status":"ok","message":"Server is running"}`

---

## ⚠️ IMPORTANT:
- **Keep the terminal open** with server running
- Backend must stay running for checkout to work
- If you close terminal, server stops → checkout fails

## ✅ Once Running:
- Click "Upgrade to Pro" → Works! ✅
- Opens Stripe checkout page ✅
- Opens Stripe customer portal ✅

