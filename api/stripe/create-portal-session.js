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
    const { userId, returnUrl, customerEmail } = req.body ?? {}

    if (!userId) {
      res.status(400).json({ error: 'Missing required field: userId' })
      return
    }

    let customerId = null

    if (customerEmail) {
      const existingCustomers = await stripe.customers.list({
        email: customerEmail,
        limit: 1
      })

      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id
      }
    }

    if (!customerId) {
      const searchResult = await stripe.customers.search({
        query: `metadata['userId']:'${userId}'`,
        limit: 1
      })

      if (searchResult.data.length > 0) {
        customerId = searchResult.data[0].id
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: customerEmail || undefined,
        metadata: { userId }
      })
      customerId = customer.id
    }

    const origin = getFrontendOrigin(req)

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || `${origin}/settings`
    })

    res.status(200).json({
      url: portalSession.url
    })
  } catch (error) {
    console.error('Stripe portal session error:', error)
    res.status(500).json({
      error: 'Failed to create portal session',
      message: error.message
    })
  }
}

