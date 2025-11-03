# Quick Start: Backend Server

## ⚡ Fast Setup (5 minutes)

### Step 1: Install Backend Dependencies

```bash
cd server
npm install
```

### Step 2: Create Environment File

Create `server/.env`:

```env
PORT=3000
FRONTEND_URL=http://localhost:5173
STRIPE_SECRET_KEY=sk_test_your_key_here
```

### Step 3: Get Stripe Secret Key

1. Go to: https://dashboard.stripe.com/test/apikeys
2. Copy your **Secret key** (starts with `sk_test_`)
3. Paste it in `server/.env`

### Step 4: Start Backend Server

```bash
npm run server
```

Or from the project root:

```bash
cd server
npm run dev
```

### Step 5: Update Frontend .env

Add to your frontend `.env`:

```env
VITE_BACKEND_URL=http://localhost:3000
VITE_STRIPE_PRO_PRICE_ID=price_your_pro_price_id
```

### Step 6: Test It

1. Start frontend: `npm run dev`
2. Start backend: `npm run server` (in another terminal)
3. Click "Upgrade to Pro" button
4. You should be redirected to Stripe Checkout!

## ✅ That's It!

Your backend is now ready to:
- ✅ Create Stripe checkout sessions
- ✅ Handle Stripe customer portal
- ✅ Process webhooks (optional)

For detailed setup, see `BACKEND_SETUP.md`

