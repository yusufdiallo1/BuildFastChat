# Stripe Payment Integration Setup Guide

This guide will help you complete the Stripe integration for your BuildFast Chat app.

## ✅ What's Already Done

1. ✅ Stripe packages installed (`@stripe/stripe-js`, `@stripe/react-stripe-js`, `stripe`)
2. ✅ Stripe configuration file created (`src/lib/stripe.js`)
3. ✅ Environment variables configured (`.env` file created)
4. ✅ API key added to environment variables
5. ✅ Pro plan button integrated with Stripe in Home page

## 🔧 Setup Steps

### 1. Get Your Stripe API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Sign up or log in
3. Navigate to **Developers > API keys**
4. Copy your **Publishable key** (starts with `pk_test_` for test mode)

### 2. Create Products and Prices in Stripe

1. In Stripe Dashboard, go to **Products**
2. Click **"Add product"**
3. Create two products:

**Product 1: Professional Plan**
- Name: Professional
- Description: For power users and teams
- Price: $9.99/month (recurring)
- Copy the **Price ID** (starts with `price_`)

**Product 2: Enterprise Plan**
- Name: Enterprise
- Description: For large organizations
- Price: $19.99/month (recurring)
- Copy the **Price ID** (starts with `price_`)

### 3. Add Environment Variables

Create or update your `.env` file in the project root:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_key_here
STRIPE_SECRET_KEY=sk_test_your_actual_secret_key_here
```

**⚠️ Important:** Never commit your secret key to Git!

### 4. Create Backend API Endpoint

You need a backend server to securely create checkout sessions. Here's a Node.js/Express example:

```javascript
// server.js
const express = require('express')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

const app = express()
app.use(express.json())

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { userId, priceId, planType } = req.body

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/pricing`,
      metadata: {
        userId: userId,
        planType: planType,
      },
    })

    res.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.listen(3000, () => console.log('Server running on port 3000'))
```

### 5. Update Frontend Code

Update `src/pages/Home.jsx` with your actual Stripe configuration:

```javascript
const handleProCheckout = async () => {
  setCheckoutLoading(true)
  try {
    const response = await fetch('http://localhost:3000/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        priceId: 'price_YOUR_PRO_PRICE_ID', // Replace with actual Price ID
        planType: 'pro',
      }),
    })

    const data = await response.json()
    window.location.href = data.url
  } catch (error) {
    console.error('Error:', error)
    alert('Failed to start checkout. Please try again.')
  } finally {
    setCheckoutLoading(false)
  }
}
```

### 6. Handle Successful Payment

Create a success page at `src/pages/PaymentSuccess.jsx`:

```javascript
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    // Update user's subscription status in your database
    // Call your backend API to verify the payment
    console.log('Payment successful for session:', sessionId)
  }, [sessionId])

  return (
    <div>
      <h1>Payment Successful! 🎉</h1>
      <p>Thank you for subscribing to Pro!</p>
    </div>
  )
}

export default PaymentSuccess
```

### 7. Webhook Setup (Optional but Recommended)

Set up webhooks to handle subscription events securely:

```javascript
// In your backend
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      // Update user's subscription in database
      console.log('Subscription created:', session.customer)
    }

    res.json({ received: true })
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`)
  }
})
```

## 🧪 Testing

### Test Mode

1. Use Stripe's test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Any future date for expiry
   - Any 3 digits for CVC

2. Test the checkout flow:
   - Click "Start Pro Trial" button
   - Should redirect to Stripe Checkout
   - Use test card to complete payment
   - Should redirect back to success page

### Production

1. Switch to live mode in Stripe Dashboard
2. Update environment variables with live keys
3. Test with real payment methods
4. Set up proper webhook URLs

## 📚 Additional Resources

- [Stripe Checkout Docs](https://stripe.com/docs/payments/checkout)
- [React Stripe.js Docs](https://stripe.com/docs/stripe-js/react)
- [Subscription Billing Guide](https://stripe.com/docs/billing/subscriptions/overview)

## 🔒 Security Notes

1. **Never expose your secret key** in frontend code
2. Always use environment variables
3. Validate webhook signatures
4. Store subscription status in your database
5. Use HTTPS in production

## ❓ Troubleshooting

**Button not working?**
- Check that `stripePromise` is properly initialized
- Verify your publishable key is correct
- Ensure backend API is running

**Payment not going through?**
- Use test mode for development
- Check browser console for errors
- Verify webhook endpoint is accessible

**Need help?**
- [Stripe Support](https://support.stripe.com)
- [Stripe Discord](https://discord.gg/stripe)

