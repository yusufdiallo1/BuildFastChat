# ⚡ START BACKEND SERVER - DO THIS NOW

## 🚨 The Error Means: Backend Server is NOT Running

### ✅ QUICK FIX (2 Steps):

#### Step 1: Open Terminal and Run:

```bash
cd /Users/yusufdiallo/Desktop/buildfast/ChatApp/server
npm run dev
```

#### Step 2: Wait for This Message:

```
==================================================
🚀 Server running on http://localhost:3000
📦 Stripe configured: ✅ or ❌
🌐 Frontend URL: http://localhost:5173
==================================================
```

### ✅ THEN Add Stripe Key:

1. Get your key: https://dashboard.stripe.com/test/apikeys
2. Copy the **Secret key** (starts with `sk_test_`)
3. Edit `server/.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_your_actual_key_here
   ```
4. The server will auto-reload

### 🧪 Test It Works:

Open in browser: http://localhost:3000/api/health

Should show: `{"status":"ok","message":"Server is running"}`

---

## ✅ Once Server is Running:
- ✅ "Upgrade to Pro" will work
- ✅ Stripe customer portal will open
- ✅ All checkout features will work

**Keep the terminal open with the server running!**

