import express from 'express'
import cors from 'cors'
import Stripe from 'stripe'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Initialize Stripe with secret key (with error handling)
let stripe = null
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY

if (!STRIPE_SECRET_KEY || STRIPE_SECRET_KEY === 'sk_test_your_stripe_secret_key_here') {
  console.warn('⚠️  WARNING: STRIPE_SECRET_KEY not configured properly')
  console.warn('   The server will start but Stripe features will not work')
  console.warn('   Edit server/.env and set: STRIPE_SECRET_KEY=sk_test_your_actual_key')
  console.warn('   Get your key from: https://dashboard.stripe.com/test/apikeys')
} else {
  try {
    stripe = new Stripe(STRIPE_SECRET_KEY)
    console.log('✅ Stripe initialized successfully')
  } catch (error) {
    console.error('❌ Error initializing Stripe:', error.message)
    console.error('   Please check your STRIPE_SECRET_KEY in server/.env')
  }
}

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json())

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' })
})

// Verify Supabase JWT token (simple verification - you may want to use Supabase SDK)
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' })
    }

    const token = authHeader.split(' ')[1]
    
    // For now, we'll pass the token through
    // In production, verify the token with Supabase
    req.token = token
    
    // You can add Supabase token verification here:
    // const { data: { user }, error } = await supabase.auth.getUser(token)
    // if (error) throw error
    // req.user = user
    
    next()
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' })
  }
}

// Create Stripe Checkout Session
app.post('/api/stripe/create-checkout-session', verifyToken, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ 
        error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY in server/.env file.'
      })
    }

    const { userId, priceId, planType } = req.body

    if (!userId || !priceId) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId and priceId are required' 
      })
    }

    // Validate priceId format
    if (!priceId.startsWith('price_')) {
      return res.status(400).json({
        error: 'Invalid priceId format. Price ID should start with "price_"',
        hint: 'Get your Price ID from Stripe Dashboard > Products > Your Product > Pricing'
      })
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/chat?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/#pricing`,
      customer_email: req.body.customerEmail || undefined,
      client_reference_id: userId,
      metadata: {
        userId: userId,
        planType: planType || 'pro'
      },
      // Allow promotion codes
      allow_promotion_codes: true,
    })

    console.log(`✅ Created checkout session: ${session.id} for user ${userId}`)

    res.json({ 
      sessionId: session.id,
      url: session.url 
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      message: error.message 
    })
  }
})

// Create Stripe Customer Portal Session
app.post('/api/stripe/create-portal-session', verifyToken, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ 
        error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY in server/.env file.'
      })
    }

    const { userId, returnUrl } = req.body

    if (!userId) {
      return res.status(400).json({ 
        error: 'Missing required field: userId' 
      })
    }

    // First, find or create a Stripe customer for this user
    // You should store the Stripe customer ID in your database (user_profiles table)
    // For now, we'll search for existing customers or create a new one
    
    let customerId = null
    
    // Try to find existing customer by userId in metadata
    const customers = await stripe.customers.list({
      limit: 1,
      metadata: { userId: userId }
    })

    if (customers.data.length > 0) {
      customerId = customers.data[0].id
    } else {
      // Create a new customer (you should get email from user profile)
      // For now, we'll create with userId as email placeholder
      const customer = await stripe.customers.create({
        metadata: { userId: userId }
      })
      customerId = customer.id
      
      // TODO: Save customer.id to user_profiles.stripe_customer_id in your database
    }

    // Create billing portal session
    // The portal URL will be: https://billing.stripe.com/p/session/...
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings`,
    })

    // The portalSession.url is already a full external Stripe URL
    // It will be something like: https://billing.stripe.com/p/session/xxxxx
    console.log('Created Stripe portal session:', portalSession.url)

    res.json({ 
      url: portalSession.url // This is the external Stripe customer portal URL
    })
  } catch (error) {
    console.error('Error creating portal session:', error)
    res.status(500).json({ 
      error: 'Failed to create portal session',
      message: error.message 
    })
  }
})

// Webhook endpoint for Stripe events (optional but recommended)
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object
      console.log('Checkout session completed:', session.id)
      
      // Update user subscription status in your database
      // const userId = session.client_reference_id
      // const customerId = session.customer
      // Update user_profiles table: subscription_status, stripe_customer_id, etc.
      
      break
      
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      const subscription = event.data.object
      console.log('Subscription updated:', subscription.id)
      
      // Update subscription status in your database
      break
      
    default:
      console.log(`Unhandled event type ${event.type}`)
  }

  res.json({ received: true })
})

// Start server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50))
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📦 Stripe configured: ${stripe ? '✅' : '❌ (Add STRIPE_SECRET_KEY to .env)'}`)
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`)
  console.log(`\n📋 Available endpoints:`)
  console.log(`   GET  http://localhost:${PORT}/api/health`)
  console.log(`   POST http://localhost:${PORT}/api/stripe/create-checkout-session`)
  console.log(`   POST http://localhost:${PORT}/api/stripe/create-portal-session`)
  console.log(`   POST http://localhost:${PORT}/api/stripe/webhook`)
  if (!stripe) {
    console.log(`\n⚠️  WARNING: Stripe features will not work until STRIPE_SECRET_KEY is added`)
    console.log(`   Get your key from: https://dashboard.stripe.com/test/apikeys`)
  }
  console.log('='.repeat(50) + '\n')
})

