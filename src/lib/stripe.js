import { loadStripe } from '@stripe/stripe-js'

// Initialize Stripe with publishable key from environment variables
export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

