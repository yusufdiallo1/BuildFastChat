# Stripe Integration - Next Steps

## ✅ Completed

1. ✅ Stripe packages installed
2. ✅ `.env` file created with your API key
3. ✅ Stripe configuration setup
4. ✅ Pro button wired up with click handler

## 🔨 What You Need To Do

### Step 1: Create Products in Stripe Dashboard (5 minutes)

1. Go to: https://dashboard.stripe.com/test/products
2. Click "Add product"
3. Create **Professional** plan:
   - Name: Professional
   - Description: For power users and teams
   - Pricing: $9.99/month (recurring)
   - Save and copy the **Price ID** (starts with `price_`)

4. Create **Enterprise** plan:
   - Name: Enterprise
   - Description: For large organizations
   - Pricing: $19.99/month (recurring)
   - Save and copy the **Price ID**

### Step 2: Set Up Backend Server (10-15 minutes)

You need a simple backend to create checkout sessions securely. Here's a quick setup:

**Option A: Use Node.js (Recommended)**

Create a new file `server.js` in your project:

```javascript
const express = require('express')
const stripe = require('stripe')('YOUR_SECRET_KEY_HERE') // Get from Stripe Dashboard

const app = express()
app.use(express.json())
app.use(express.static('dist')) // Serve your built React app

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { userId, priceId, planType } = req.body

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
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

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
```

Then run:
```bash
npm install express
node server.js
```

**Option B: Use Vercel/Netlify Functions** (if deploying to these platforms)

**Option C: Use a BaaS like Supabase Edge Functions**

### Step 3: Update the Frontend Code

Once you have the backend running, update `src/pages/Home.jsx`:

1. Replace the comment section (lines 38-58) with uncommented code
2. Replace `price_YOUR_PRICE_ID_HERE` with your actual Price ID

### Step 4: Test It!

1. Start your dev server: `npm run dev`
2. Start your backend server: `node server.js`
3. Click the "Start Pro Trial" button
4. Complete checkout with test card: `4242 4242 4242 4242`

## 📝 Quick Checklist

- [ ] Create Pro product in Stripe Dashboard
- [ ] Create Enterprise product in Stripe Dashboard
- [ ] Copy Price IDs
- [ ] Get your Stripe Secret Key
- [ ] Set up backend server
- [ ] Update frontend with Price IDs
- [ ] Test checkout flow

## 🔗 Useful Links

- [Get your Secret Key](https://dashboard.stripe.com/test/apikeys)
- [Stripe Dashboard Products](https://dashboard.stripe.com/test/products)
- [Test Cards](https://stripe.com/docs/testing#cards)
- [Full Documentation](https://stripe.com/docs/payments/checkout)

## 💡 Quick Tips

- Always use **test mode** during development
- Use test card `4242 4242 4242 4242` for testing
- Keep your secret key secure (never expose in frontend)
- Check the Stripe Dashboard logs to see payment events

