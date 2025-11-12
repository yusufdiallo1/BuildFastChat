import Stripe from 'stripe'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20'
    })
  : null

function getFrontendOrigin(req) {
  const configured = process.env.FRONTEND_URL
  if (configured && configured.trim() !== '') {
    return configured.replace(/\/$/, '')
  }

  const originHeader = req.headers.origin
  if (originHeader && originHeader.trim() !== '') {
    return originHeader.replace(/\/$/, '')
  }

  return 'http://localhost:5173'
}

function sendCors(res, req) {
  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

export default async function handler(req, res) {
  sendCors(res, req)

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS')
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  if (!stripe) {
    res.status(500).json({ error: 'Stripe secret key not configured on server' })
    return
  }

  try {
    const { userId, priceId, planType, customerEmail } = req.body ?? {}

    if (!userId || !priceId) {
      res.status(400).json({ error: 'Missing required fields: userId and priceId are required' })
      return
    }

    if (typeof priceId !== 'string' || !priceId.startsWith('price_')) {
      res.status(400).json({
        error: 'Invalid priceId format. Price ID should start with "price_"'
      })
      return
    }

    const origin = getFrontendOrigin(req)

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: `${origin}/chat?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#pricing`,
      customer_email: customerEmail || undefined,
      client_reference_id: userId,
      metadata: {
        userId,
        planType: planType || 'pro'
      },
      allow_promotion_codes: true
    })

    res.status(200).json({
      sessionId: session.id,
      url: session.url
    })
  } catch (error) {
    console.error('Stripe checkout session error:', error)
    res.status(500).json({
      error: 'Failed to create checkout session',
      message: error.message
    })
  }
}

