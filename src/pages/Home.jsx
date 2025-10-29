import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useEffect, useState } from 'react'
import { stripePromise } from '../lib/stripe'

function Home() {
  const { user } = useAuth()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  const handleProCheckout = async () => {
    if (!user) {
      alert('Please log in to subscribe to Pro plan')
      window.location.href = '/login'
      return
    }

    setCheckoutLoading(true)
    try {
      const stripe = await stripePromise
      
      // You'll need to create a backend endpoint to create checkout sessions
      // For now, this is a placeholder that shows the integration is ready
      
      alert(`Stripe is now configured! 

Next steps:
1. Create products in your Stripe Dashboard (Pro and Enterprise)
2. Set up a backend server with an endpoint to create checkout sessions
3. The backend should call Stripe API to create payment sessions
4. See STRIPE_SETUP_GUIDE.md for detailed instructions

Your API key is configured and ready to use.`)
      
      // Once you have a backend, uncomment this:
      /*
      const response = await fetch('http://localhost:3000/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          priceId: 'price_YOUR_PRICE_ID_HERE',
          planType: 'pro',
        }),
      })
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      // Redirect to Stripe Checkout
      window.location.href = data.url
      */
      
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to start checkout. Please try again.')
    } finally {
      setCheckoutLoading(false)
    }
  }

  // Add 'hero-animated' class after animations complete to ensure elements stay visible
  useEffect(() => {
    const timeout = setTimeout(() => {
      const heroElements = document.querySelectorAll('.hero-content, .hero-logo, .hero-tagline, .hero-description, .hero-buttons, .hero-trust, .hero-features, .hero-image')
      heroElements.forEach(el => {
        el.classList.add('hero-animated')
      })
    }, 2000) // Wait 2 seconds for all animations to complete

    return () => clearTimeout(timeout)
  }, [])

  // Handle scroll to reduce nav size and show back to top button
  useEffect(() => {
    let lastScroll = 0
    const handleScroll = () => {
      const currentScroll = window.scrollY
      if (currentScroll > lastScroll && currentScroll > 50) {
        setScrolled(true)
      } else if (currentScroll < lastScroll) {
        setScrolled(false)
      }
      
      // Show back to top button when scrolled down 100px
      setShowBackToTop(currentScroll > 100)
      
      lastScroll = currentScroll
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const features = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: "Fast Development",
      description: "Built with Vite for lightning-fast hot module replacement and build times."
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      title: "Modern UI",
      description: "Styled with Tailwind CSS for a beautiful and responsive user interface."
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: "Type Safe",
      description: "Built with React for a robust and maintainable codebase."
    }
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)', color: 'var(--text-primary)' }}>
      {/* Modern Floating Pill Navigation */}
      <header className="floating-pill-nav" style={{ 
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: `translateX(-50%) ${scrolled ? 'scale(0.95)' : 'scale(1)'}`,
        zIndex: 1000,
        maxWidth: '900px',
        width: 'calc(100% - 40px)',
        borderRadius: '50px',
        padding: '8px',
        background: 'rgba(26, 32, 44, 0.75)',
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        animation: 'fadeInNav 0.6s ease-out 0.2s both'
      }}>
        <div className="flex items-center justify-center" style={{ gap: '12px', position: 'relative' }}>
          {/* Logo Section (Left) */}
          <div style={{ position: 'absolute', left: '20px', display: 'flex', alignItems: 'center' }}>
            <span className="text-xl font-semibold">
              <span className="gradient-text" style={{ 
                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>BuildFast</span>
              <span style={{ color: 'rgba(255, 255, 255, 0.9)', marginLeft: '4px' }}>Chat</span>
            </span>
            </div>

          {/* Navigation Buttons (Center) */}
          <nav className={`flex items-center ${mobileMenuOpen ? 'mobile-menu-open' : ''}`} style={{ gap: '12px', marginLeft: '8px' }}>
            <Link 
              to="/" 
              className={`nav-pill-button ${location.pathname === '/' ? 'active' : ''}`}
              style={{
                padding: '10px 24px',
                borderRadius: '25px',
                fontSize: '15px',
                fontWeight: 500,
                color: location.pathname === '/' ? '#ffffff' : 'rgba(255, 255, 255, 0.8)',
                background: location.pathname === '/' 
                  ? 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)'
                  : 'transparent',
                boxShadow: location.pathname === '/' 
                  ? '0 4px 12px rgba(139, 92, 246, 0.4)'
                  : 'none',
                textDecoration: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                border: 'none',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                if (location.pathname !== '/') {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                  e.target.style.color = 'rgba(255, 255, 255, 1)'
                  e.target.style.transform = 'scale(1.05)'
                  e.target.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.1)'
                }
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== '/') {
                  e.target.style.background = 'transparent'
                  e.target.style.color = 'rgba(255, 255, 255, 0.8)'
                  e.target.style.transform = 'scale(1)'
                  e.target.style.boxShadow = 'none'
                }
              }}
              onFocus={(e) => {
                e.target.style.outline = '2px solid rgba(139, 92, 246, 0.5)'
                e.target.style.outlineOffset = '2px'
              }}
              onBlur={(e) => {
                e.target.style.outline = 'none'
              }}
            >
              Home
            </Link>
            <Link 
              to="/chat" 
              className={`nav-pill-button ${location.pathname === '/chat' ? 'active' : ''}`}
              style={{
                padding: '10px 24px',
                borderRadius: '25px',
                fontSize: '15px',
                fontWeight: 500,
                color: location.pathname === '/chat' ? '#ffffff' : 'rgba(255, 255, 255, 0.8)',
                background: location.pathname === '/chat' 
                  ? 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)'
                  : 'transparent',
                boxShadow: location.pathname === '/chat' 
                  ? '0 4px 12px rgba(139, 92, 246, 0.4)'
                  : 'none',
                textDecoration: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                border: 'none',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                if (location.pathname !== '/chat') {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                  e.target.style.color = 'rgba(255, 255, 255, 1)'
                  e.target.style.transform = 'scale(1.05)'
                  e.target.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.1)'
                }
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== '/chat') {
                  e.target.style.background = 'transparent'
                  e.target.style.color = 'rgba(255, 255, 255, 0.8)'
                  e.target.style.transform = 'scale(1)'
                  e.target.style.boxShadow = 'none'
                }
              }}
              onFocus={(e) => {
                e.target.style.outline = '2px solid rgba(139, 92, 246, 0.5)'
                e.target.style.outlineOffset = '2px'
              }}
              onBlur={(e) => {
                e.target.style.outline = 'none'
              }}
            >
              Chat
            </Link>
            <button
              className="nav-pill-button testimonials-btn"
              onClick={(e) => {
                e.preventDefault()
                const testimonialsSection = document.getElementById('testimonials')
                if (testimonialsSection) {
                  testimonialsSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              }}
              style={{
                padding: '10px 24px',
                borderRadius: '25px',
                fontSize: '15px',
                fontWeight: 500,
                color: 'rgba(255, 255, 255, 0.8)',
                background: 'transparent',
                textDecoration: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                border: 'none',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                e.target.style.color = 'rgba(255, 255, 255, 1)'
                e.target.style.transform = 'scale(1.05)'
                e.target.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.1)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent'
                e.target.style.color = 'rgba(255, 255, 255, 0.8)'
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = 'none'
              }}
              onFocus={(e) => {
                e.target.style.outline = '2px solid rgba(139, 92, 246, 0.5)'
                e.target.style.outlineOffset = '2px'
              }}
              onBlur={(e) => {
                e.target.style.outline = 'none'
              }}
            >
              Testimonials
            </button>
            <button
              className="nav-pill-button pricing-btn"
              onClick={(e) => {
                e.preventDefault()
                const pricingSection = document.getElementById('pricing')
                if (pricingSection) {
                  pricingSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              }}
              style={{
                padding: '10px 24px',
                borderRadius: '25px',
                fontSize: '15px',
                fontWeight: 500,
                color: 'rgba(255, 255, 255, 0.8)',
                background: 'transparent',
                textDecoration: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                border: 'none',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                e.target.style.color = 'rgba(255, 255, 255, 1)'
                e.target.style.transform = 'scale(1.05)'
                e.target.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.1)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent'
                e.target.style.color = 'rgba(255, 255, 255, 0.8)'
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = 'none'
              }}
              onFocus={(e) => {
                e.target.style.outline = '2px solid rgba(139, 92, 246, 0.5)'
                e.target.style.outlineOffset = '2px'
              }}
              onBlur={(e) => {
                e.target.style.outline = 'none'
              }}
            >
              Pricing
            </button>
              {user ? (
                <Link 
                  to="/chat" 
                className="nav-pill-button"
                style={{
                  padding: '10px 24px',
                  borderRadius: '25px',
                  fontSize: '15px',
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.8)',
                  background: 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  border: 'none',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                  e.target.style.color = 'rgba(255, 255, 255, 1)'
                  e.target.style.transform = 'scale(1.05)'
                  e.target.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.1)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent'
                  e.target.style.color = 'rgba(255, 255, 255, 0.8)'
                  e.target.style.transform = 'scale(1)'
                  e.target.style.boxShadow = 'none'
                }}
                onFocus={(e) => {
                  e.target.style.outline = '2px solid rgba(139, 92, 246, 0.5)'
                  e.target.style.outlineOffset = '2px'
                }}
                onBlur={(e) => {
                  e.target.style.outline = 'none'
                }}
                >
                  Go to Chat
                </Link>
              ) : (
              <Link 
                to="/login" 
                className="nav-pill-button"
                style={{
                  padding: '10px 24px',
                  borderRadius: '25px',
                  fontSize: '15px',
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.8)',
                  background: 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  border: 'none',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                  e.target.style.color = 'rgba(255, 255, 255, 1)'
                  e.target.style.transform = 'scale(1.05)'
                  e.target.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.1)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent'
                  e.target.style.color = 'rgba(255, 255, 255, 0.8)'
                  e.target.style.transform = 'scale(1)'
                  e.target.style.boxShadow = 'none'
                }}
                onFocus={(e) => {
                  e.target.style.outline = '2px solid rgba(139, 92, 246, 0.5)'
                  e.target.style.outlineOffset = '2px'
                }}
                onBlur={(e) => {
                  e.target.style.outline = 'none'
                }}
              >
                Log In
              </Link>
              )}
            </nav>
        </div>
      </header>

      {/* Hero Section - Redesigned */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden" style={{ paddingTop: '100px' }}>
        {/* Deployment timestamp - hidden but helps verify deployment */}
        <meta name="deployment-version" content="v2.0.0-new-design" />
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 hero-gradient" style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 25%, var(--accent) 50%, var(--primary-light) 75%, var(--primary) 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradient-shift 10s ease infinite',
          opacity: 0.1
        }}></div>
        
        {/* Animated Particles/Shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Content */}
            <div className="text-center lg:text-left hero-content" style={{ animation: 'fade-in-up 0.6s ease-out forwards' }}>
              {/* Logo/App Name */}
              <div className="mb-6 hero-logo" style={{ animation: 'fade-in-up 0.6s ease-out 0.1s forwards' }}>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                  <span className="gradient-text">BuildFast Chat</span>
                </h1>
              </div>

              {/* Tagline/Headline */}
              <div className="mb-6 hero-tagline" style={{ animation: 'fade-in-up 0.6s ease-out 0.2s forwards' }}>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4" style={{ color: 'var(--text-primary)' }}>
                  Stay Connected,<br />
                  <span className="gradient-text">Share Moments</span>
                </h2>
              </div>

              {/* Description */}
              <div className="mb-8 hero-description" style={{ animation: 'fade-in-up 0.6s ease-out 0.3s forwards' }}>
                <p className="text-lg md:text-xl lg:text-2xl leading-relaxed max-w-xl mx-auto lg:mx-0" style={{ color: 'var(--text-secondary)' }}>
                  Stay connected with friends and family through secure, real-time messaging. Share moments, react with emojis, and communicate your way.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8 hero-buttons" style={{ animation: 'fade-in-up 0.6s ease-out 0.4s forwards' }}>
            {user ? (
                <Link 
                  to="/chat" 
                    className="group frosted-glass btn-rounded-lg px-8 md:px-10 py-4 text-lg font-medium hover-lift transition-all duration-200 flex items-center justify-center space-x-2 ripple"
                    style={{ color: 'var(--text-primary)', backgroundColor: 'var(--primary)' }}
                >
                    <span>Go to Chat</span>
                    <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                </Link>
            ) : (
                  <>
                <Link 
                  to="/login" 
                      className="group frosted-glass btn-rounded-lg px-8 md:px-10 py-4 text-lg font-semibold hover-lift transition-all duration-200 flex items-center justify-center space-x-2 ripple"
                      style={{ color: 'white', backgroundColor: 'var(--primary)' }}
                >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      <span>Get Started</span>
                </Link>
                <Link 
                  to="/signup" 
                      className="group frosted-glass btn-rounded-lg px-8 md:px-10 py-4 text-lg font-medium hover-lift transition-all duration-200 flex items-center justify-center space-x-2"
                      style={{ color: 'var(--text-primary)', border: '2px solid var(--border)' }}
                      onMouseEnter={(e) => {
                        e.target.style.borderColor = 'var(--primary)'
                        e.target.style.backgroundColor = 'var(--surface)'
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.borderColor = 'var(--border)'
                        e.target.style.backgroundColor = 'transparent'
                      }}
                    >
                      <span>Learn More</span>
                      <svg className="w-5 h-5 transform group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                </Link>
                  </>
                )}
              </div>

              {/* Trust Indicators & Social Proof */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6 text-sm hero-trust" style={{ animation: 'fade-in-up 0.6s ease-out 0.5s forwards' }}>
                <div className="flex items-center space-x-2" style={{ color: 'var(--text-muted)' }}>
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>🔒 End-to-end encrypted</span>
                </div>
                <div className="flex items-center space-x-2" style={{ color: 'var(--text-muted)' }}>
                  <span>📱 Real-time messaging</span>
                </div>
              </div>

              {/* Feature Highlights */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 hero-features" style={{ animation: 'fade-in-up 0.6s ease-out 0.6s forwards' }}>
                <div className="flex flex-col items-center text-center p-4 rounded-xl hover-lift" style={{ backgroundColor: 'var(--surface)' }}>
                  <div className="text-3xl mb-2">⚡</div>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Real-time</span>
                </div>
                <div className="flex flex-col items-center text-center p-4 rounded-xl hover-lift" style={{ backgroundColor: 'var(--surface)' }}>
                  <div className="text-3xl mb-2">📸</div>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Image sharing</span>
                </div>
                <div className="flex flex-col items-center text-center p-4 rounded-xl hover-lift" style={{ backgroundColor: 'var(--surface)' }}>
                  <div className="text-3xl mb-2">🎤</div>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Voice messages</span>
                </div>
                <div className="flex flex-col items-center text-center p-4 rounded-xl hover-lift" style={{ backgroundColor: 'var(--surface)' }}>
                  <div className="text-3xl mb-2">👍</div>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Reactions</span>
                </div>
              </div>
            </div>

            {/* Right Side - Hero Image/Mockup */}
            <div className="relative hero-image" style={{ animation: 'fade-in-up 0.6s ease-out 0.3s forwards' }}>
              <div className="relative w-full max-w-lg mx-auto lg:max-w-full">
                {/* Phone Mockup Container */}
                <div className="relative float-animation" style={{
                  animation: 'float 3s ease-in-out infinite'
                }}>
                  <div className="frosted-glass rounded-3xl p-4 shadow-2xl" style={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                  }}>
                    {/* Mock Phone Screen */}
                    <div className="rounded-2xl overflow-hidden" style={{
                      backgroundColor: 'var(--background)',
                      aspectRatio: '9/16',
                      minHeight: '400px'
                    }}>
                      <div className="h-full flex flex-col">
                        {/* Mock Header */}
                        <div className="p-4 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-pink-500"></div>
                            <div className="flex-1">
                              <div className="h-4 rounded mb-2" style={{ backgroundColor: 'var(--surface-light)', width: '60%' }}></div>
                              <div className="h-2 rounded" style={{ backgroundColor: 'var(--surface-light)', width: '40%' }}></div>
                            </div>
                          </div>
                        </div>
                        {/* Mock Messages */}
                        <div className="flex-1 p-4 space-y-4">
                          <div className="flex justify-start">
                            <div className="rounded-2xl p-3 max-w-xs" style={{ backgroundColor: 'var(--surface-light)' }}>
                              <div className="h-4 rounded mb-2" style={{ backgroundColor: 'var(--surface)', width: '80%' }}></div>
                              <div className="h-4 rounded" style={{ backgroundColor: 'var(--surface)', width: '60%' }}></div>
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <div className="rounded-2xl p-3 max-w-xs" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' }}>
                              <div className="h-4 rounded mb-2 bg-white/80" style={{ width: '70%' }}></div>
                              <div className="h-4 rounded bg-white/80" style={{ width: '90%' }}></div>
                            </div>
                          </div>
                          <div className="flex justify-start">
                            <div className="rounded-2xl p-3 max-w-xs" style={{ backgroundColor: 'var(--surface-light)' }}>
                              <div className="h-4 rounded" style={{ backgroundColor: 'var(--surface)', width: '50%' }}></div>
                            </div>
                          </div>
                        </div>
                        {/* Mock Input */}
                        <div className="p-4 border-t" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
                          <div className="h-12 rounded-full" style={{ backgroundColor: 'var(--surface-light)' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Features</h2>
          <p className="text-xl" style={{ color: 'var(--text-muted)' }}>Everything you need for modern communication</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="frosted-glass rounded-2xl p-8 hover-lift transition-all duration-200 border" style={{ borderColor: 'var(--border)' }}>
              <div className="frosted-glass rounded-xl w-20 h-20 flex items-center justify-center mb-6 text-indigo-400 mx-auto">
                {feature.icon}
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-center" style={{ color: 'var(--text-primary)' }}>
                {feature.title}
              </h3>
              <p className="text-center leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section 
        id="testimonials" 
        className="w-full" 
        style={{ 
          padding: '100px 40px',
          background: 'linear-gradient(180deg, var(--background) 0%, rgba(15, 23, 42, 0.98) 100%)'
        }}
      >
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 
              className="text-5xl font-bold mb-4" 
              style={{ 
                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              What Our Users Say
            </h2>
            <p className="text-lg" style={{ color: 'var(--text-muted)' }}>
              Join thousands of satisfied users
            </p>
          </div>

          {/* Testimonials Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div 
              className="testimonial-card"
              style={{
                background: 'rgba(26, 32, 44, 0.6)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: '32px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)'
                e.currentTarget.style.boxShadow = '0 12px 48px rgba(139, 92, 246, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)'
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.2)'
              }}
            >
              <div className="mb-4" style={{ fontSize: '24px', color: '#fbbf24' }}>⭐⭐⭐⭐⭐</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: '1.6', marginBottom: '24px' }}>
                "BuildFast Chat has completely transformed how our team communicates. The real-time features and intuitive interface make collaboration seamless and enjoyable!"
              </p>
              <div className="flex items-center gap-3">
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)', padding: '3px' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--surface)' }}></div>
                </div>
                <div>
                  <div style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>Sarah Johnson</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Product Manager at TechCorp</div>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div 
              className="testimonial-card"
              style={{
                background: 'rgba(26, 32, 44, 0.6)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: '32px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)'
                e.currentTarget.style.boxShadow = '0 12px 48px rgba(139, 92, 246, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)'
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.2)'
              }}
            >
              <div className="mb-4" style={{ fontSize: '24px', color: '#fbbf24' }}>⭐⭐⭐⭐⭐</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: '1.6', marginBottom: '24px' }}>
                "I love the message reactions and voice notes! It's like WhatsApp but even better. The customization options are incredible."
              </p>
              <div className="flex items-center gap-3">
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)', padding: '3px' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--surface)' }}></div>
                </div>
                <div>
                  <div style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>Michael Chen</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Freelance Designer</div>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div 
              className="testimonial-card"
              style={{
                background: 'rgba(26, 32, 44, 0.6)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: '32px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)'
                e.currentTarget.style.boxShadow = '0 12px 48px rgba(139, 92, 246, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)'
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.2)'
              }}
            >
              <div className="mb-4" style={{ fontSize: '24px', color: '#fbbf24' }}>⭐⭐⭐⭐⭐</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: '1.6', marginBottom: '24px' }}>
                "The 2FA security gives me peace of mind. Finally, a chat app that takes privacy seriously while being super easy to use."
              </p>
              <div className="flex items-center gap-3">
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)', padding: '3px' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--surface)' }}></div>
                </div>
                <div>
                  <div style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>Emily Rodriguez</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Security Analyst</div>
                </div>
              </div>
            </div>

            {/* Testimonial 4 */}
            <div 
              className="testimonial-card"
              style={{
                background: 'rgba(26, 32, 44, 0.6)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: '32px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)'
                e.currentTarget.style.boxShadow = '0 12px 48px rgba(139, 92, 246, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)'
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.2)'
              }}
            >
              <div className="mb-4" style={{ fontSize: '24px', color: '#fbbf24' }}>⭐⭐⭐⭐⭐</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: '1.6', marginBottom: '24px' }}>
                "Scheduling messages has been a game-changer for my workflow. I can plan communications in advance and never miss important check-ins."
              </p>
              <div className="flex items-center gap-3">
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)', padding: '3px' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--surface)' }}></div>
                </div>
                <div>
                  <div style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>David Kim</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Sales Director</div>
                </div>
              </div>
            </div>

            {/* Testimonial 5 */}
            <div 
              className="testimonial-card"
              style={{
                background: 'rgba(26, 32, 44, 0.6)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: '32px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)'
                e.currentTarget.style.boxShadow = '0 12px 48px rgba(139, 92, 246, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)'
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.2)'
              }}
            >
              <div className="mb-4" style={{ fontSize: '24px', color: '#fbbf24' }}>⭐⭐⭐⭐⭐</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: '1.6', marginBottom: '24px' }}>
                "The video sharing quality is outstanding. We use it for client presentations and internal training videos. Highly recommend!"
              </p>
              <div className="flex items-center gap-3">
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)', padding: '3px' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--surface)' }}></div>
                </div>
                <div>
                  <div style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>Jessica Taylor</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Marketing Lead</div>
                </div>
              </div>
            </div>

            {/* Testimonial 6 */}
            <div 
              className="testimonial-card"
              style={{
                background: 'rgba(26, 32, 44, 0.6)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: '32px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)'
                e.currentTarget.style.boxShadow = '0 12px 48px rgba(139, 92, 246, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)'
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.2)'
              }}
            >
              <div className="mb-4" style={{ fontSize: '24px', color: '#fbbf24' }}>⭐⭐⭐⭐⭐</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: '1.6', marginBottom: '24px' }}>
                "Search functionality is lightning fast. Finding old conversations and specific messages takes seconds. Best feature ever!"
              </p>
              <div className="flex items-center gap-3">
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)', padding: '3px' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--surface)' }}></div>
                </div>
                <div>
                  <div style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>Alex Thompson</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Operations Manager</div>
                </div>
              </div>
            </div>

            {/* Testimonial 7 */}
            <div 
              className="testimonial-card"
              style={{
                background: 'rgba(26, 32, 44, 0.6)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: '32px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)'
                e.currentTarget.style.boxShadow = '0 12px 48px rgba(139, 92, 246, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)'
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.2)'
              }}
            >
              <div className="mb-4" style={{ fontSize: '24px', color: '#fbbf24' }}>⭐⭐⭐⭐⭐</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: '1.6', marginBottom: '24px' }}>
                "Message templates save me hours every week. I've created quick replies for common questions and it's boosted my productivity."
              </p>
              <div className="flex items-center gap-3">
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)', padding: '3px' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--surface)' }}></div>
                </div>
                <div>
                  <div style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>Rachel Green</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Customer Support</div>
                </div>
              </div>
            </div>

            {/* Testimonial 8 */}
            <div 
              className="testimonial-card"
              style={{
                background: 'rgba(26, 32, 44, 0.6)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: '32px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)'
                e.currentTarget.style.boxShadow = '0 12px 48px rgba(139, 92, 246, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)'
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.2)'
              }}
            >
              <div className="mb-4" style={{ fontSize: '24px', color: '#fbbf24' }}>⭐⭐⭐⭐⭐</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: '1.6', marginBottom: '24px' }}>
                "The ability to customize chat backgrounds makes each conversation feel personal. Love the attention to detail!"
              </p>
              <div className="flex items-center gap-3">
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)', padding: '3px' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--surface)' }}></div>
                </div>
                <div>
                  <div style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>Chris Martinez</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>UX Designer</div>
                </div>
              </div>
            </div>

            {/* Testimonial 9 */}
            <div 
              className="testimonial-card"
              style={{
                background: 'rgba(26, 32, 44, 0.6)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: '32px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)'
                e.currentTarget.style.boxShadow = '0 12px 48px rgba(139, 92, 246, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)'
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.2)'
              }}
            >
              <div className="mb-4" style={{ fontSize: '24px', color: '#fbbf24' }}>⭐⭐⭐⭐⭐</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: '1.6', marginBottom: '24px' }}>
                "Pinned messages keep important information accessible. No more scrolling through hundreds of messages to find what I need."
              </p>
              <div className="flex items-center gap-3">
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)', padding: '3px' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--surface)' }}></div>
                </div>
                <div>
                  <div style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>Laura Anderson</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Project Coordinator</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section 
        id="pricing" 
        className="w-full" 
        style={{ 
          padding: '100px 40px',
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, var(--background) 100%)'
        }}
      >
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 
              className="text-5xl font-bold mb-4" 
              style={{ 
                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg" style={{ color: 'var(--text-muted)' }}>
              Choose the plan that's right for you
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8 mb-8" style={{ flexWrap: 'wrap' }}>
            {/* TIER 1 - FREE */}
            <div 
              className="pricing-card"
              style={{
                background: 'rgba(26, 32, 44, 0.7)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '24px',
                padding: '40px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                position: 'relative',
                minHeight: '600px',
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: '340px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)'
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.2)'
              }}
            >
              {/* Plan Name */}
              <div className="text-2xl font-bold mb-2" style={{ color: 'white' }}>Starter</div>
              
              {/* Price */}
              <div className="mb-2">
                <span 
                  style={{ 
                    fontSize: '48px', 
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >$0</span>
                <span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>/month</span>
              </div>
              
              {/* Description */}
              <p className="mb-6" style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
                Perfect for personal use
              </p>
              
              {/* Features List */}
              <div className="flex-1 mb-6" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  'Unlimited messaging',
                  'Message reactions',
                  'Image sharing (up to 10MB)',
                  'Search messages',
                  'Basic customization',
                  '1GB storage'
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3" style={{ transition: 'transform 0.3s' }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                  >
                    <div style={{ 
                      width: '20px', 
                      height: '20px',
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'transform 0.3s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'rotate(360deg) scale(1.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'rotate(0deg) scale(1)'}
                    >
                      <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>✓</span>
                    </div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: '1.8' }}>{feature}</span>
                  </div>
                ))}
              </div>
              
              {/* Button */}
              <button 
                className="mt-auto"
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  background: 'transparent',
                  color: 'white',
                  border: '2px solid white',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)'
                  e.target.style.borderColor = 'transparent'
                  e.target.style.transform = 'scale(1.02)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent'
                  e.target.style.borderColor = 'white'
                  e.target.style.transform = 'scale(1)'
                }}
              >
                Get Started
              </button>
            </div>

            {/* TIER 2 - PRO (POPULAR) */}
            <div 
              className="pricing-card"
              style={{
                background: 'rgba(26, 32, 44, 0.7)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '24px',
                padding: '40px',
                boxShadow: '0 12px 48px rgba(139, 92, 246, 0.3)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                position: 'relative',
                minHeight: '600px',
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: '340px',
                transform: 'scale(1.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05) translateY(-5px)'
                e.currentTarget.style.boxShadow = '0 16px 56px rgba(139, 92, 246, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1.05) translateY(0)'
                e.currentTarget.style.boxShadow = '0 12px 48px rgba(139, 92, 246, 0.3)'
              }}
            >
              {/* Popular Badge */}
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                padding: '6px 20px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 'bold',
                color: 'white',
                textTransform: 'uppercase',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)'
              }}>
                Most Popular
              </div>
              
              {/* Plan Name */}
              <div className="text-2xl font-bold mb-2 mt-4" style={{ color: 'white' }}>Professional</div>
              
              {/* Price */}
              <div className="mb-2">
                <span 
                  style={{ 
                    fontSize: '48px', 
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >$9.99</span>
                <span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>/month</span>
              </div>
              
              {/* Description */}
              <p className="mb-6" style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
                For power users and teams
              </p>
              
              {/* Features List */}
              <div className="flex-1 mb-6" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  'Everything in Starter',
                  'Video sharing (up to 100MB)',
                  'Voice messages',
                  'Message scheduling',
                  'Custom backgrounds & themes',
                  'Message templates',
                  'Pin unlimited messages',
                  '2FA security',
                  'Priority support',
                  '50GB storage'
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3" style={{ transition: 'transform 0.3s' }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                  >
                    <div style={{ 
                      width: '20px', 
                      height: '20px',
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'transform 0.3s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'rotate(360deg) scale(1.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'rotate(0deg) scale(1)'}
                    >
                      <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>✓</span>
                    </div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: '1.8' }}>{feature}</span>
                  </div>
                ))}
              </div>
              
              {/* Button */}
              <button 
                className="mt-auto"
                onClick={handleProCheckout}
                disabled={checkoutLoading}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: checkoutLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                  color: 'white',
                  border: 'none',
                  outline: 'none',
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
                  opacity: checkoutLoading ? 0.7 : 1
                }}
                onMouseEnter={(e) => {
                  if (!checkoutLoading) {
                    e.target.style.transform = 'scale(1.05)'
                    e.target.style.boxShadow = '0 8px 20px rgba(139, 92, 246, 0.5)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!checkoutLoading) {
                    e.target.style.transform = 'scale(1)'
                    e.target.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)'
                  }
                }}
              >
                {checkoutLoading ? 'Processing...' : 'Start Pro Trial'}
              </button>
            </div>

            {/* TIER 3 - ENTERPRISE */}
            <div 
              className="pricing-card"
              style={{
                background: 'rgba(26, 32, 44, 0.7)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '24px',
                padding: '40px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                position: 'relative',
                minHeight: '600px',
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: '340px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)'
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.2)'
              }}
            >
              {/* Plan Name */}
              <div className="text-2xl font-bold mb-2" style={{ color: 'white' }}>Enterprise</div>
              
              {/* Price */}
              <div className="mb-2">
                <span 
                  style={{ 
                    fontSize: '48px', 
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >$19.99</span>
                <span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>/month</span>
              </div>
              
              {/* Description */}
              <p className="mb-6" style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
                For large organizations
              </p>
              
              {/* Features List */}
              <div className="flex-1 mb-6" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  'Everything in Pro',
                  'Unlimited storage',
                  'Advanced admin controls',
                  'Block & archive users',
                  'Delete & edit messages',
                  'Forward messages',
                  'Disappearing messages',
                  'Read receipts control',
                  'Custom integrations',
                  'Dedicated account manager',
                  '24/7 premium support',
                  'SLA guarantee'
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3" style={{ transition: 'transform 0.3s' }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                  >
                    <div style={{ 
                      width: '20px', 
                      height: '20px',
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'transform 0.3s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'rotate(360deg) scale(1.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'rotate(0deg) scale(1)'}
                    >
                      <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>✓</span>
                    </div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: '1.8' }}>{feature}</span>
                  </div>
                ))}
              </div>
              
              {/* Button */}
              <button 
                className="mt-auto"
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  background: 'transparent',
                  color: 'white',
                  border: '2px solid',
                  borderImage: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%) 1',
                  outline: 'none',
                  backgroundImage: 'linear-gradient(transparent, transparent), linear-gradient(135deg, #8b5cf6, #ec4899)',
                  backgroundOrigin: 'border-box',
                  backgroundClip: 'padding-box, border-box'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundImage = 'linear-gradient(135deg, #8b5cf6, #ec4899)'
                  e.target.style.borderImage = 'none'
                  e.target.style.transform = 'scale(1.02)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundImage = 'linear-gradient(transparent, transparent), linear-gradient(135deg, #8b5cf6, #ec4899)'
                  e.target.style.borderImage = 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%) 1'
                  e.target.style.transform = 'scale(1)'
                }}
              >
                Contact Sales
              </button>
            </div>
          </div>

          {/* Additional Info */}
          <div className="text-center mt-12">
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              All plans include end-to-end encryption • 30-day money-back guarantee
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer 
        style={{ 
          background: '#0a0d15',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '60px 40px 30px 40px'
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Main Footer Content - 3 Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-10">
            {/* Column 1 - Brand */}
            <div>
              <div 
                className="text-2xl font-bold mb-2"
                style={{ 
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                BuildFast Chat
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '16px', marginTop: '8px' }}>
                Connect, communicate, collaborate
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginTop: '16px' }}>
                The modern chat platform built for teams and individuals who value speed, security, and simplicity.
              </p>
            </div>

            {/* Column 2 - Quick Links */}
            <div>
              <h3 style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>
                Quick Links
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {[
                  { label: 'Home', action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
                  { label: 'Features', action: () => window.scrollTo({ top: 700, behavior: 'smooth' }) },
                  { label: 'Testimonials', action: () => document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' }) },
                  { label: 'Pricing', action: () => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }) },
                  { label: 'Privacy Policy', action: () => {} },
                  { label: 'Terms of Service', action: () => {} },
                  { label: 'Documentation', action: () => {} },
                  { label: 'Support', action: () => {} }
                ].map((link, idx) => (
                  <a
                    key={idx}
                    onClick={link.action}
                    style={{
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontSize: '15px',
                      lineHeight: '2.2',
                      cursor: 'pointer',
                      textDecoration: 'none',
                      transition: 'all 0.2s ease',
                      display: 'inline-block'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.color = 'white'
                      e.target.style.transform = 'translateX(4px)'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = 'rgba(255, 255, 255, 0.6)'
                      e.target.style.transform = 'translateX(0)'
                    }}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Column 3 - Contact Info */}
            <div>
              <h3 style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>
                Get In Touch
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <a
                  href="mailto:support@buildfastchat.com"
                  style={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '15px',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = 'white'
                    e.target.style.backgroundImage = 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)'
                    e.target.style.WebkitBackgroundClip = 'text'
                    e.target.style.backgroundClip = 'text'
                    e.target.style.WebkitTextFillColor = 'transparent'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = 'rgba(255, 255, 255, 0.6)'
                    e.target.style.backgroundImage = 'none'
                    e.target.style.WebkitTextFillColor = 'rgba(255, 255, 255, 0.6)'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  support@buildfastchat.com
                </a>
                
                <a
                  href="tel:+15551234567"
                  style={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '15px',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = 'white'
                    e.target.style.backgroundImage = 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)'
                    e.target.style.WebkitBackgroundClip = 'text'
                    e.target.style.backgroundClip = 'text'
                    e.target.style.WebkitTextFillColor = 'transparent'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = 'rgba(255, 255, 255, 0.6)'
                    e.target.style.backgroundImage = 'none'
                    e.target.style.WebkitTextFillColor = 'rgba(255, 255, 255, 0.6)'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                  +1 (555) 123-4567
                </a>
                
                <div
                  style={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  San Francisco, CA 94102
                </div>
              </div>
            </div>
          </div>

          {/* Social Media Icons */}
          <div style={{ 
            paddingTop: '40px',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            justifyContent: 'center',
            gap: '24px',
            marginBottom: '30px'
          }}>
            {[
              { name: 'Facebook', icon: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z', url: 'https://www.facebook.com' },
              { name: 'Twitter', icon: 'M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z', url: 'https://twitter.com' },
              { name: 'LinkedIn', icon: 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z M4 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z', url: 'https://www.linkedin.com' },
              { name: 'Instagram', icon: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z', url: 'https://www.instagram.com' },
              { name: 'GitHub', icon: 'M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22', url: 'https://github.com' }
            ].map((social, idx) => (
              <a
                key={idx}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.name}
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px) rotate(360deg)'
                  e.currentTarget.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)'
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(139, 92, 246, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) rotate(0deg)'
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ pointerEvents: 'none' }}>
                  <path d={social.icon}></path>
                </svg>
              </a>
            ))}
          </div>

          {/* Bottom Bar */}
          <div style={{ 
            paddingTop: '30px',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '14px', margin: 0 }}>
              © 2024 BuildFast Chat. All rights reserved.
            </p>
            <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '14px', margin: 0 }}>
              Made with ❤️ for amazing teams
            </p>
          </div>
        </div>
      </footer>

      {/* Back to Top Button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        style={{
          position: 'fixed',
          bottom: '40px',
          right: '40px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(139, 92, 246, 0.5)',
          transition: 'all 0.3s ease',
          zIndex: 10000,
          opacity: showBackToTop ? 1 : 0,
          pointerEvents: showBackToTop ? 'auto' : 'none',
          transform: showBackToTop ? 'translateY(0)' : 'translateY(20px)'
        }}
        onMouseEnter={(e) => {
          if (showBackToTop) {
            e.target.style.transform = 'translateY(-8px) scale(1.15)'
            e.target.style.boxShadow = '0 12px 32px rgba(139, 92, 246, 0.7)'
          }
        }}
        onMouseLeave={(e) => {
          if (showBackToTop) {
            e.target.style.transform = 'translateY(0) scale(1)'
            e.target.style.boxShadow = '0 8px 24px rgba(139, 92, 246, 0.5)'
          }
        }}
        aria-label="Back to top"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
      </button>
    </div>
  )
}

export default Home


