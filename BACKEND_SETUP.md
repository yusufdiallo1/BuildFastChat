# Backend Server Setup Guide

This guide will help you set up the Express backend server with Stripe integration for BuildFast Chat.

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Stripe account (test or live)
- Stripe API keys

## 🚀 Quick Start

### 1. Install Backend Dependencies

Navigate to the server directory and install dependencies:

```bash
cd server
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the `server` directory:

```bash
cp .env.example .env
```

Then edit `.env` with your Stripe keys:

```env
PORT=3000
FRONTEND_URL=http://localhost:5173

# Get from: https://dashboard.stripe.com/test/apikeys
STRIPE_SECRET_KEY=sk_test_your_actual_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 3. Get Your Stripe Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers > API keys**
3. Copy your **Secret key** (starts with `sk_test_` for test mode)
4. Paste it in your `.env` file as `STRIPE_SECRET_KEY`

### 4. Start the Backend Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

## 🔗 API Endpoints

### Health Check
```
GET /api/health
```

### Create Checkout Session
```
POST /api/stripe/create-checkout-session
Headers: Authorization: Bearer <supabase_token>
Body: {
  "userId": "user-uuid",
  "priceId": "price_xxxxx",
  "planType": "pro",
  "customerEmail": "user@example.com" (optional)
}
```

Returns:
```json
{
  "sessionId": "cs_xxxxx",
  "url": "https://checkout.stripe.com/..."
}
```

### Create Customer Portal Session
```
POST /api/stripe/create-portal-session
Headers: Authorization: Bearer <supabase_token>
Body: {
  "userId": "user-uuid",
  "returnUrl": "http://localhost:5173/settings" (optional)
}
```

Returns:
```json
{
  "url": "https://billing.stripe.com/..."
}
```

### Webhook Endpoint
```
POST /api/stripe/webhook
Headers: stripe-signature: <stripe_signature>
Body: <raw_stripe_event>
```

## 🔧 Frontend Configuration

Update your frontend `.env` file to include:

```env
VITE_BACKEND_URL=http://localhost:3000
```

Or update the backend URL in your code where needed.

## 📝 Stripe Dashboard Setup

### 1. Create Products and Prices

1. Go to [Stripe Dashboard > Products](https://dashboard.stripe.com/test/products)
2. Click **"+ Add product"**
3. Create two products:
   - **Pro Plan** - $9.99/month
   - **Enterprise Plan** - $19.99/month

### 2. Copy Price IDs

After creating products, copy the Price IDs (they look like `price_xxxxx`). You'll use these in your frontend when creating checkout sessions.

### 3. Set Up Webhooks (Optional but Recommended)

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click **"+ Add endpoint"**
3. Set the URL to: `http://localhost:3000/api/stripe/webhook` (or your production URL)
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the **Signing secret** and add it to your `.env` as `STRIPE_WEBHOOK_SECRET`

## 🗄️ Database Updates Needed

You should add these fields to your `user_profiles` table:

```sql
ALTER TABLE user_profiles
ADD COLUMN stripe_customer_id TEXT,
ADD COLUMN subscription_status TEXT DEFAULT 'free',
ADD COLUMN subscription_plan TEXT,
ADD COLUMN subscription_expires_at TIMESTAMPTZ;
```

## 🧪 Testing

### Test Checkout Session

```bash
curl -X POST http://localhost:3000/api/stripe/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userId": "test-user-id",
    "priceId": "price_xxxxx",
    "planType": "pro"
  }'
```

### Test Customer Portal

```bash
curl -X POST http://localhost:3000/api/stripe/create-portal-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userId": "test-user-id",
    "returnUrl": "http://localhost:5173/settings"
  }'
```

## 🔒 Security Notes

1. **Never expose your Stripe Secret Key** - Keep it in `.env` and never commit it to git
2. **Verify JWT tokens** - The current implementation accepts tokens but doesn't verify them. For production, add proper Supabase token verification
3. **Use HTTPS in production** - Always use HTTPS when handling Stripe webhooks
4. **Validate webhook signatures** - The webhook endpoint already includes signature verification

## 📦 Production Deployment

When deploying to production:

1. Update `FRONTEND_URL` to your production frontend URL
2. Use live Stripe keys (not test keys)
3. Set up webhook endpoint in Stripe with your production URL
4. Use environment variables provided by your hosting platform (Vercel, Railway, etc.)

## 🐛 Troubleshooting

### Server won't start
- Check if port 3000 is already in use
- Verify all dependencies are installed: `npm install`
- Check that `.env` file exists and has `STRIPE_SECRET_KEY`

### CORS errors
- Update `FRONTEND_URL` in `.env` to match your frontend URL
- Check that CORS middleware is configured correctly

### Stripe errors
- Verify your Stripe secret key is correct
- Check that you're using test keys with test mode or live keys with live mode
- Ensure price IDs are correct and exist in your Stripe account

## 📚 Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Checkout Sessions](https://stripe.com/docs/api/checkout/sessions)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)

