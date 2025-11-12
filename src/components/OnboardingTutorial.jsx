import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Portal from './Portal'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const SLIDES_TOTAL = 5

function OnboardingTutorial({ onClose, isReplay = false }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isCompleting, setIsCompleting] = useState(false)
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50

  const handleTouchStart = (e) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe && currentSlide < SLIDES_TOTAL - 1) {
      handleNext()
    }
    if (isRightSwipe && currentSlide > 0) {
      handlePrevious()
    }
  }

  const handleNext = () => {
    if (currentSlide < SLIDES_TOTAL - 1) {
      setCurrentSlide(currentSlide + 1)
    }
  }

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  const handleGoToSlide = (index) => {
    setCurrentSlide(index)
  }

  const handleSkip = async () => {
    if (!isReplay) {
      await markAsCompleted()
      // Show message after a brief delay
      setTimeout(() => {
        alert('You can view the tutorial anytime in Settings')
      }, 300)
    }
    onClose()
  }

  const handleUpgradeToPro = async () => {
    if (!user) {
      // If not logged in, redirect to signup first
      onClose()
      setTimeout(() => {
        navigate('/signup')
      }, 300)
      return
    }

    try {
      // Get session token
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token

      if (!token) {
        throw new Error('Please log in to continue')
      }

      // Call backend API to create Stripe customer portal session
      const backendEnv = import.meta.env.VITE_BACKEND_URL
      const backendUrl = backendEnv && backendEnv.trim() !== ''
        ? backendEnv
        : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173')
      
      const response = await fetch(`${backendUrl}/api/stripe/create-portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user.id,
          returnUrl: `${window.location.origin}/settings`,
          customerEmail: user.email || undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        
        if (response.status === 503 || errorData.error?.includes('Stripe is not configured')) {
          throw new Error('Stripe is not configured on backend. Add STRIPE_SECRET_KEY to server/.env')
        }
        
        throw new Error(errorData.error || `Server returned ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      if (!data.url || !data.url.startsWith('https://')) {
        throw new Error('Invalid portal URL returned from backend')
      }
      
      // Close modal first
      onClose()
      
      // Redirect to external Stripe customer portal website
      // This will open the Stripe billing portal (external site)
      // URL will be like: https://billing.stripe.com/p/session/xxxxx
      window.location.replace(data.url)
      return
    } catch (error) {
      console.error('Error opening Stripe portal:', error)
      
      // If backend isn't set up, show error and navigate to pricing
      onClose()
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        const isWindows = navigator.platform.toLowerCase().includes('win')
        const command = isWindows ? 'npm run server' : 'npm run server'
        
        const message = `Cannot connect to backend server.

To fix this:

1. Open a NEW terminal window
2. Navigate to: cd server
3. Run: npm run dev
   (OR from project root: ${command})

4. Wait for: "🚀 Server running on http://localhost:3000"

5. Then try again

Make sure you have:
✅ server/.env file created
✅ STRIPE_SECRET_KEY added to server/.env
✅ Server running on port 3000

See START_BACKEND.md for detailed instructions.`
        
        alert(message)
        navigate('/#pricing')
      } else if (error.message.includes('Stripe is not configured')) {
        alert(`Stripe is not configured on backend.

Please:
1. Go to server directory
2. Create server/.env file
3. Add: STRIPE_SECRET_KEY=sk_test_your_key_here
4. Get key from: https://dashboard.stripe.com/test/apikeys
5. Restart server

See START_BACKEND.md for help.`)
        navigate('/#pricing')
      } else {
        alert(`Unable to open Stripe customer portal:\n\n${error.message}\n\nPlease check your backend server configuration.\n\nSee START_BACKEND.md for help.`)
        navigate('/#pricing')
      }
    }
  }

  const handleGetStarted = async () => {
    setIsCompleting(true)

    if (!isReplay) {
      await markAsCompleted()
    }

    // Show success message
    setTimeout(() => {
      onClose()
      
      // Show success message
      if (!isReplay) {
        // Small delay to allow modal to close first
        setTimeout(() => {
          alert('You\'re all set! Start chatting 🎉')
        }, 300)
      }
      
      // Redirect based on login status (only if not logged in)
      if (!user && !isReplay) {
        setTimeout(() => {
          navigate('/signup')
        }, 1000)
      }
    }, 500)
  }

  const markAsCompleted = async () => {
    try {
      localStorage.setItem('onboardingCompleted', 'true')
      localStorage.setItem('onboardingCompletedDate', new Date().toISOString())

      // Save to database if user is logged in
      if (user) {
        const { error } = await supabase
          .from('user_profiles')
          .update({
            onboarding_completed_date: new Date().toISOString()
          })
          .eq('id', user.id)

        if (error) {
          console.error('Error saving onboarding completion to database:', error)
        }
      }
    } catch (error) {
      console.error('Error marking onboarding as completed:', error)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight' && currentSlide < SLIDES_TOTAL - 1) {
      handleNext()
    } else if (e.key === 'ArrowLeft' && currentSlide > 0) {
      handlePrevious()
    } else if (e.key === 'Escape') {
      handleSkip()
    } else if (e.key === 'Enter') {
      if (currentSlide === SLIDES_TOTAL - 1) {
        handleGetStarted()
      } else {
        handleNext()
      }
    }
  }

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    // Add class to body to ensure modal is on top
    document.body.classList.add('onboarding-open')

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
      document.body.classList.remove('onboarding-open')
    }
  }, [currentSlide])

  const slides = [
    {
      number: 1,
      illustration: (
        <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'float 3s ease-in-out infinite' }}>
          <div
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 40px rgba(139, 92, 246, 0.5)',
              animation: 'pulseGlow 2s ease-in-out infinite'
            }}
          >
            <span style={{ fontSize: '48px' }}>💬</span>
          </div>
        </div>
      ),
      heading: 'Welcome to BuildFast Chat! 👋',
      description: 'Your modern, secure messaging platform built for meaningful connections. Let\'s take a quick tour to get you started. This will only take a minute!',
      features: null,
      specialButton: null
    },
    {
      number: 2,
      illustration: (
        <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', animation: 'fadeInUp 0.6s ease-out' }}>
          <div style={{ fontSize: '64px' }}>💬</div>
          <div style={{ fontSize: '64px', animation: 'fadeInUp 0.6s ease-out 0.2s both' }}>👤</div>
          <div style={{ fontSize: '64px', animation: 'fadeInUp 0.6s ease-out 0.4s both' }}>🔍</div>
        </div>
      ),
      heading: 'Start a Conversation 💬',
      description: 'Click the \'New Chat\' button or search for a user\'s name in the search bar. Select any contact to start chatting instantly with real-time messaging.',
      features: [
        { icon: '⚡', text: 'Real-time messaging' },
        { icon: '🔍', text: 'Search users' },
        { icon: '💬', text: 'Start conversations' }
      ],
      specialButton: null
    },
    {
      number: 3,
      illustration: (
        <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', maxWidth: '400px', margin: '0 auto', animation: 'fadeInUp 0.6s ease-out' }}>
          <div style={{ fontSize: '48px', animation: 'fadeInUp 0.6s ease-out 0.1s both' }}>👍</div>
          <div style={{ fontSize: '48px', animation: 'fadeInUp 0.6s ease-out 0.2s both' }}>📸</div>
          <div style={{ fontSize: '48px', animation: 'fadeInUp 0.6s ease-out 0.3s both' }}>🎤</div>
          <div style={{ fontSize: '48px', animation: 'fadeInUp 0.6s ease-out 0.4s both' }}>📎</div>
        </div>
      ),
      heading: 'Express Yourself Fully 🎨',
      description: 'React to messages with emojis, send images and videos, record voice messages, or share files. Multiple ways to communicate beyond just text!',
      features: [
        { icon: '👍', text: 'React with emojis' },
        { icon: '📸', text: 'Share images & videos' },
        { icon: '🎤', text: 'Send voice messages' },
        { icon: '📎', text: 'Attach files' }
      ],
      specialButton: null
    },
    {
      number: 4,
      illustration: (
        <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', maxWidth: '450px', margin: '0 auto', animation: 'fadeInUp 0.6s ease-out' }}>
          <div style={{ fontSize: '56px', animation: 'fadeInUp 0.6s ease-out 0.1s both' }}>📌</div>
          <div style={{ fontSize: '56px', animation: 'fadeInUp 0.6s ease-out 0.2s both' }}>🔍</div>
          <div style={{ fontSize: '56px', animation: 'fadeInUp 0.6s ease-out 0.3s both' }}>⏰</div>
          <div style={{ fontSize: '56px', animation: 'fadeInUp 0.6s ease-out 0.4s both' }}>📝</div>
        </div>
      ),
      heading: 'Stay Organized 📌',
      description: 'Pin important messages, search your chat history instantly, schedule messages for later, and use templates for quick replies. Everything you need to stay on top of conversations.',
      features: [
        { icon: '📌', text: 'Pin important messages' },
        { icon: '🔍', text: 'Search conversations' },
        { icon: '⏰', text: 'Schedule messages' },
        { icon: '📝', text: 'Use message templates' }
      ],
      specialButton: null
    },
    {
      number: 5,
      illustration: (
        <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeInUp 0.6s ease-out' }}>
          <div
            style={{
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 60px rgba(139, 92, 246, 0.6)',
              position: 'relative'
            }}
          >
            <span style={{ fontSize: '72px' }}>⭐</span>
            <div
              style={{
                position: 'absolute',
                top: '-10px',
                right: '-10px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(251, 191, 36, 0.4)',
                animation: 'pulse 2s ease-in-out infinite'
              }}
            >
              <span style={{ fontSize: '24px' }}>👑</span>
            </div>
          </div>
        </div>
      ),
      heading: 'Unlock More with Pro ⭐',
      description: 'Upgrade to Pro for custom backgrounds, unlimited storage, advanced features, and priority support. Start with a 7-day free trial!',
      features: [
        { icon: '✨', text: 'Custom themes & backgrounds' },
        { icon: '💾', text: '50GB storage' },
        { icon: '🎯', text: 'Advanced features' },
        { icon: '🚀', text: 'Priority support' }
      ],
      specialButton: 'upgrade'
    }
  ]

  const currentSlideData = slides[currentSlide]

  return (
    <Portal>
      <div
        className="onboarding-tutorial-backdrop"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          animation: 'fadeIn 0.4s ease',
          touchAction: 'pan-y',
          isolation: 'isolate'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Modal Card */}
        <div
          className="onboarding-modal-card"
          style={{
            width: '100%',
            maxWidth: '700px',
            maxHeight: '85vh',
            backgroundColor: 'white',
            borderRadius: '24px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
            animation: 'slideInUp 0.4s ease',
            zIndex: 999999
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Slide Number Indicator */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              fontSize: '14px',
              color: '#9ca3af',
              fontWeight: '500',
              zIndex: 10
            }}
          >
            {currentSlide + 1} of {SLIDES_TOTAL}
          </div>

          {/* Content Area */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 40px 40px',
              overflowY: 'auto',
              position: 'relative'
            }}
          >
            {/* Illustration */}
            <div
              key={currentSlide}
              style={{
                width: '100%',
                marginBottom: '32px',
                animation: 'fadeInSlide 0.4s ease-in-out'
              }}
            >
              {currentSlideData.illustration}
            </div>

            {/* Heading */}
            <h2
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                marginBottom: '16px',
                textAlign: 'center',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              {currentSlideData.heading}
            </h2>

            {/* Description */}
            <p
              style={{
                fontSize: '16px',
                color: '#6b7280',
                textAlign: 'center',
                lineHeight: '1.6',
                marginBottom: currentSlideData.features ? '24px' : '0',
                maxWidth: '600px'
              }}
            >
              {currentSlideData.description}
            </p>

            {/* Features List */}
            {currentSlideData.features && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px',
                  justifyContent: 'center',
                  marginTop: '24px',
                  maxWidth: '600px'
                }}
              >
                {currentSlideData.features.map((feature, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      backgroundColor: '#f3f4f6',
                      fontSize: '14px',
                      color: '#374151',
                      animation: `fadeInUp 0.4s ease-out ${idx * 0.1}s both`
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>{feature.icon}</span>
                    <span>{feature.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Special Button for Slide 6 */}
            {currentSlideData.specialButton === 'upgrade' && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  marginTop: '32px',
                  width: '100%',
                  maxWidth: '400px',
                  paddingRight: '20px'
                }}
              >
                <button
                  onClick={handleUpgradeToPro}
                  style={{
                    padding: '14px 32px',
                    borderRadius: '10px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                    color: 'white',
                    border: 'none',
                    width: '100%',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                  className="btn-glow"
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.05)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)'
                  }}
                >
                  Upgrade to Pro
                </button>
                <button
                  onClick={handleGetStarted}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    color: '#6b7280',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.textDecoration = 'underline'
                    e.target.style.color = '#374151'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.textDecoration = 'none'
                    e.target.style.color = '#6b7280'
                  }}
                >
                  Maybe Later
                </button>
              </div>
            )}
          </div>

          {/* Progress Dots */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              padding: '20px',
              borderTop: '1px solid #e5e7eb'
            }}
          >
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => handleGoToSlide(index)}
                style={{
                  width: index === currentSlide ? '12px' : '8px',
                  height: index === currentSlide ? '12px' : '8px',
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                  background: index === currentSlide
                    ? 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)'
                    : '#d1d5db',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  if (index !== currentSlide) {
                    e.target.style.backgroundColor = '#9ca3af'
                  }
                }}
                onMouseLeave={(e) => {
                  if (index !== currentSlide) {
                    e.target.style.backgroundColor = '#d1d5db'
                  }
                }}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '12px',
              padding: '20px 40px 20px 60px',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb'
            }}
          >
            {/* Previous Button */}
            {currentSlide > 0 && (
              <button
                onClick={handlePrevious}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.02)'
                  e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)'
                  e.target.style.boxShadow = 'none'
                }}
              >
                Previous
              </button>
            )}

            {/* Next/Get Started Button */}
            <button
              onClick={currentSlide === SLIDES_TOTAL - 1 ? handleGetStarted : handleNext}
              disabled={isCompleting}
              style={{
                padding: '12px 32px',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isCompleting ? 'not-allowed' : 'pointer',
                background: isCompleting
                  ? '#9ca3af'
                  : 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                color: 'white',
                border: 'none',
                transition: 'all 0.2s ease',
                outline: 'none',
                opacity: isCompleting ? 0.7 : 1,
                marginLeft: 'auto'
              }}
              onMouseEnter={(e) => {
                if (!isCompleting) {
                  e.target.style.transform = 'scale(1.05)'
                  e.target.style.boxShadow = '0 8px 20px rgba(139, 92, 246, 0.4)'
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = 'none'
              }}
            >
              {isCompleting
                ? 'Loading...'
                : currentSlide === SLIDES_TOTAL - 1
                ? 'Get Started'
                : 'Next'}
            </button>
          </div>

          {/* Skip Link (all slides except last) */}
          {currentSlide < SLIDES_TOTAL - 1 && (
            <div
              style={{
                padding: '0 40px 20px',
                textAlign: 'center'
              }}
            >
              <button
                onClick={handleSkip}
                style={{
                  fontSize: '14px',
                  color: '#9ca3af',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  e.target.style.textDecoration = 'underline'
                  e.target.style.color = '#6b7280'
                }}
                onMouseLeave={(e) => {
                  e.target.style.textDecoration = 'none'
                  e.target.style.color = '#9ca3af'
                }}
              >
                Skip Tutorial
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .onboarding-tutorial-backdrop {
          z-index: 999999 !important;
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
        }
        
        .onboarding-modal-card {
          z-index: 999999 !important;
          position: relative !important;
        }

        /* Ensure nothing can overlap when modal is open */
        body.onboarding-open {
          overflow: hidden !important;
        }

        /* Force modal to be on top of everything */
        body.onboarding-open .onboarding-tutorial-backdrop {
          z-index: 999999 !important;
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
        }

        body.onboarding-open .onboarding-modal-card {
          z-index: 999999 !important;
          position: relative !important;
        }

        /* Ensure navigation and other elements stay below */
        body.onboarding-open header[style*="z-index"],
        body.onboarding-open nav[style*="z-index"],
        body.onboarding-open div[style*="z-index"]:not(.onboarding-tutorial-backdrop):not(.onboarding-modal-card) {
          z-index: 9999 !important;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes pulseGlow {
          0%, 100% {
            box-shadow: 0 0 40px rgba(139, 92, 246, 0.5);
          }
          50% {
            box-shadow: 0 0 60px rgba(139, 92, 246, 0.7);
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        @media (max-width: 1024px) {
          .onboarding-modal-card {
            max-width: 85% !important;
          }
        }

        @media (max-width: 768px) {
          .onboarding-modal-card {
            max-width: 95% !important;
            border-radius: 16px !important;
          }

          .onboarding-modal-card > div:first-child > h2 {
            font-size: 24px !important;
          }

          .onboarding-modal-card > div:first-child > p {
            font-size: 14px !important;
          }

          .onboarding-modal-card > div:nth-child(3) {
            flex-direction: column !important;
            gap: 12px !important;
          }

          .onboarding-modal-card > div:nth-child(3) > button {
            width: 100% !important;
            min-height: 48px !important;
          }
        }
      `}</style>
    </Portal>
  )
}

export default OnboardingTutorial

