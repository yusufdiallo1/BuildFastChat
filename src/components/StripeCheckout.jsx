import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

function StripeCheckout({ planType = 'pro' }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleCheckout = async () => {
    if (!user) {
      alert('Please log in to subscribe')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Create a checkout session on your backend
      // For now, we'll create a client-side session
      // In production, you should create this on your backend server
      
      const priceId = planType === 'pro' 
        ? 'price_1234567890' // Replace with your actual Stripe Price ID for Pro plan
        : 'price_0987654321'  // Replace with your actual Stripe Price ID for Enterprise plan

      // Call your backend API to create checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          priceId,
          planType,
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      // Redirect to Stripe Checkout
      if (data.sessionId) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Error creating checkout session:', err)
      setError(err.message || 'Failed to start checkout. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleCheckout}
        disabled={loading}
        style={{
          width: '100%',
          padding: '14px 24px',
          borderRadius: '12px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          opacity: loading ? 0.7 : 1
        }}
        className={planType === 'pro' ? 'gradient-button' : 'outline-button'}
      >
        {loading ? 'Processing...' : planType === 'pro' ? 'Start Pro Trial' : 'Start Enterprise Trial'}
      </button>
      
      {error && (
        <p style={{ color: 'red', marginTop: '10px', fontSize: '14px' }}>
          {error}
        </p>
      )}
    </div>
  )
}

export default StripeCheckout

