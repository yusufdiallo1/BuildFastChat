import { useState, useEffect } from 'react'
import Portal from './Portal'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import OnboardingManager from './OnboardingManager'

const TERMS_VERSION = '1.0'

function TermsModal() {
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [showDeclineWarning, setShowDeclineWarning] = useState(false)
  const [isChecked, setIsChecked] = useState(false)
  const [isAccepting, setIsAccepting] = useState(false)
  const [showOnboardingAfterAccept, setShowOnboardingAfterAccept] = useState(false)

  useEffect(() => {
    // Check if terms have been accepted
    const checkTermsAcceptance = async () => {
      const termsAccepted = localStorage.getItem('termsAccepted')
      const storedVersion = localStorage.getItem('termsVersion')

      // If terms not accepted or version mismatch, show modal
      if (termsAccepted !== 'true' || storedVersion !== TERMS_VERSION) {
        setShowModal(true)
        return
      }

      // For logged-in users, also check database as backup
      if (user) {
        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('terms_accepted_date, terms_version')
            .eq('id', user.id)
            .single()

          if (error && error.code !== 'PGRST116') {
            // PGRST116 = no rows returned, which is fine for new users
            console.error('Error checking database terms:', error)
          }

          // If database has acceptance, restore localStorage if needed
          if (data?.terms_accepted_date) {
            if (data.terms_version !== storedVersion) {
              // Database has different version, show modal
              setShowModal(true)
            }
            // Restore localStorage from database if localStorage was cleared
            if (!termsAccepted) {
              localStorage.setItem('termsAccepted', 'true')
              localStorage.setItem('termsVersion', data.terms_version || TERMS_VERSION)
            }
          } else if (data && !data.terms_accepted_date) {
            // User profile exists but hasn't accepted terms in database
            // Trust localStorage - if localStorage says accepted, that's fine
            // But if version mismatch, show modal
            if (storedVersion !== TERMS_VERSION) {
              setShowModal(true)
            }
          }
          // If no data found (PGRST116), trust localStorage
        } catch (error) {
          console.error('Error checking database terms:', error)
          // On error, trust localStorage
        }
      }
    }

    // Small delay to ensure auth context is ready
    const timer = setTimeout(() => {
      checkTermsAcceptance()
    }, 100)

    return () => clearTimeout(timer)
  }, [user])

  const handleAccept = async () => {
    if (!isChecked) return

    setIsAccepting(true)

    try {
      // Save to localStorage
      localStorage.setItem('termsAccepted', 'true')
      localStorage.setItem('termsVersion', TERMS_VERSION)
      localStorage.setItem('termsAcceptedDate', new Date().toISOString())

      // Save to database if user is logged in
      if (user) {
        const { error } = await supabase
          .from('user_profiles')
          .update({
            terms_accepted_date: new Date().toISOString(),
            terms_version: TERMS_VERSION
          })
          .eq('id', user.id)

        if (error) {
          console.error('Error saving terms acceptance to database:', error)
          // Still proceed even if database save fails
        }
      }

      // Close modal with fade animation and trigger onboarding
      setTimeout(() => {
        setShowModal(false)
        setIsAccepting(false)
        // Check if onboarding should be shown (only if not completed)
        const onboardingCompleted = localStorage.getItem('onboardingCompleted')
        if (onboardingCompleted !== 'true') {
          setShowOnboardingAfterAccept(true)
        }
      }, 300)
    } catch (error) {
      console.error('Error accepting terms:', error)
      setIsAccepting(false)
      alert('Failed to save terms acceptance. Please try again.')
    }
  }

  const handleDecline = () => {
    setShowDeclineWarning(true)
  }

  const handleGoBack = () => {
    setShowDeclineWarning(false)
  }

  const handleExit = () => {
    // Redirect to homepage or close app
    window.location.href = '/'
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && isChecked && !isAccepting) {
      handleAccept()
    }
    if (e.key === 'Escape' && showDeclineWarning) {
      handleGoBack()
    }
  }

  useEffect(() => {
    if (showModal) {
      document.addEventListener('keydown', handleKeyDown)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [showModal, isChecked, showDeclineWarning, isAccepting])

  if (!showModal) return null

  return (
    <Portal>
      {/* Backdrop */}
      <div
        className="terms-modal-backdrop"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 999998,
          isolation: 'isolate',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeIn 0.3s ease',
          padding: '20px'
        }}
      >
        {/* Main Modal */}
        <div
          className="terms-modal-card"
          style={{
            width: '100%',
            maxWidth: '600px',
            maxHeight: '80vh',
            backgroundColor: 'var(--surface)',
            borderRadius: '24px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideInUp 0.3s ease',
            overflow: 'hidden',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Section with Logo and Heading */}
          <div style={{ padding: '40px 40px 24px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
            {/* Logo */}
            <div style={{ marginBottom: '24px' }}>
              <div
                className="text-3xl font-bold"
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                BuildFast Chat
              </div>
            </div>

            {/* Heading */}
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}
            >
              Terms of Service & Privacy Policy
            </h1>

            {/* Subheading */}
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
              Please read and accept to continue
            </p>

            {/* Decorative Line */}
            <div
              style={{
                height: '3px',
                width: '80px',
                margin: '16px auto 0',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                borderRadius: '2px'
              }}
            />
          </div>

          {/* Scrollable Content */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '32px 40px',
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--surface-light) var(--surface)'
            }}
          >
            {/* Section 1: Introduction */}
            <section style={{ marginBottom: '24px' }}>
              <h2
                style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: 'var(--text-primary)',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  1
                </span>
                Introduction
              </h2>
              <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)', margin: 0 }}>
                Welcome to BuildFast Chat. By using our service, you agree to these terms which are designed to maintain respectful, ethical, and halal communication in accordance with Islamic values.
              </p>
            </section>

            {/* Section 2: Halal Communication Standards */}
            <section style={{ marginBottom: '24px' }}>
              <h2
                style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: 'var(--text-primary)',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  2
                </span>
                Halal Communication Standards
              </h2>
              <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                All users must:
              </p>
              <ul style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)', paddingLeft: '20px', margin: 0 }}>
                <li>Communicate with respect and kindness (Adab)</li>
                <li>Avoid inappropriate, vulgar, or offensive language</li>
                <li>Respect privacy and confidentiality (Amanah)</li>
                <li>Not share or request inappropriate images or content</li>
                <li>Not use the platform for haram (forbidden) activities</li>
                <li>Maintain modesty in conversations and shared media</li>
                <li>Treat all users with dignity regardless of background</li>
              </ul>
            </section>

            {/* Section 3: Prohibited Activities */}
            <section style={{ marginBottom: '24px' }}>
              <h2
                style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: 'var(--text-primary)',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  3
                </span>
                Prohibited Activities
              </h2>
              <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                The following are strictly prohibited:
              </p>
              <ul style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)', paddingLeft: '20px', margin: 0 }}>
                <li>Sharing explicit, inappropriate, or immodest content</li>
                <li>Harassment, bullying, or threatening behavior</li>
                <li>Spreading false information or gossip (Gheebah)</li>
                <li>Any form of ribā (interest-based transactions) discussions</li>
                <li>Promoting haram activities</li>
                <li>Impersonation or fraud</li>
                <li>Spamming or unsolicited marketing</li>
              </ul>
            </section>

            {/* Section 4: Privacy and Data Protection */}
            <section style={{ marginBottom: '24px' }}>
              <h2
                style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: 'var(--text-primary)',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  4
                </span>
                Privacy and Data Protection
              </h2>
              <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                We protect your privacy as an Amanah (trust):
              </p>
              <ul style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)', paddingLeft: '20px', margin: 0 }}>
                <li>Your messages are encrypted end-to-end</li>
                <li>We do not sell your data to third parties</li>
                <li>We collect minimal information necessary for service</li>
                <li>You can delete your account and data at any time</li>
                <li>We comply with Islamic principles of confidentiality</li>
              </ul>
            </section>

            {/* Section 5: User Responsibilities */}
            <section style={{ marginBottom: '24px' }}>
              <h2
                style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: 'var(--text-primary)',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  5
                </span>
                User Responsibilities
              </h2>
              <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                As a user, you are responsible for:
              </p>
              <ul style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)', paddingLeft: '20px', margin: 0 }}>
                <li>Keeping your account credentials secure</li>
                <li>Any content you share or send</li>
                <li>Respecting intellectual property rights</li>
                <li>Reporting violations of these terms</li>
                <li>Understanding that you are accountable for your actions</li>
              </ul>
            </section>

            {/* Section 6: Content Moderation */}
            <section style={{ marginBottom: '24px' }}>
              <h2
                style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: 'var(--text-primary)',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  6
                </span>
                Content Moderation
              </h2>
              <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)', margin: 0 }}>
                We reserve the right to review reported content for violations, remove content that violates Islamic standards, suspend or terminate accounts that violate terms, and cooperate with legal authorities when required.
              </p>
            </section>

            {/* Section 7: Age Requirement */}
            <section style={{ marginBottom: '24px' }}>
              <h2
                style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: 'var(--text-primary)',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  7
                </span>
                Age Requirement
              </h2>
              <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)', margin: 0 }}>
                Users must be at least 13 years old to use this service. Users under 18 should have parental consent.
              </p>
            </section>

            {/* Section 8: Disclaimer */}
            <section style={{ marginBottom: '24px' }}>
              <h2
                style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: 'var(--text-primary)',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  8
                </span>
                Disclaimer
              </h2>
              <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)', margin: 0 }}>
                This service is provided as-is. While we strive for 100% uptime, we cannot guarantee uninterrupted service. We are not liable for any loss of data or communication failures.
              </p>
            </section>

            {/* Section 9: Changes to Terms */}
            <section style={{ marginBottom: '24px' }}>
              <h2
                style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: 'var(--text-primary)',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  9
                </span>
                Changes to Terms
              </h2>
              <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)', margin: 0 }}>
                We may update these terms. Continued use after updates means you accept the new terms. Major changes will be communicated via email or notification.
              </p>
            </section>

            {/* Section 10: Contact */}
            <section style={{ marginBottom: '24px' }}>
              <h2
                style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: 'var(--text-primary)',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  10
                </span>
                Contact
              </h2>
              <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)', margin: 0 }}>
                For questions or concerns, contact us at:{' '}
                <a
                  href="mailto:support@buildfastchat.com"
                  style={{
                    color: '#8b5cf6',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                  onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                >
                  support@buildfastchat.com
                </a>
              </p>
            </section>
          </div>

          {/* Sticky Footer with Checkbox and Buttons */}
          <div
            style={{
              padding: '24px 40px',
              borderTop: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              position: 'sticky',
              bottom: 0
            }}
          >
            {/* Checkbox Section */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px'
              }}
            >
              <input
                type="checkbox"
                id="terms-checkbox"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                style={{
                  width: '20px',
                  height: '20px',
                  cursor: 'pointer',
                  accentColor: '#8b5cf6',
                  transform: isChecked ? 'scale(1.1)' : 'scale(1)',
                  transition: 'transform 0.2s ease'
                }}
                onKeyDown={(e) => {
                  if (e.key === ' ') {
                    e.preventDefault()
                    setIsChecked(!isChecked)
                  }
                }}
              />
              <label
                htmlFor="terms-checkbox"
                style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                I have read and agree to the Terms of Service and Privacy Policy
              </label>
            </div>

            {/* Buttons Section */}
            <div
              style={{
                display: 'flex',
                gap: '16px',
                flexWrap: 'wrap'
              }}
            >
              {/* Decline Button */}
              <button
                onClick={handleDecline}
                style={{
                  flex: '1',
                  minWidth: '140px',
                  padding: '12px 32px',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  border: '1px solid #ef4444',
                  backgroundColor: 'transparent',
                  color: '#ef4444',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent'
                }}
                onFocus={(e) => {
                  e.target.style.outline = '2px solid rgba(239, 68, 68, 0.5)'
                  e.target.style.outlineOffset = '2px'
                }}
                onBlur={(e) => {
                  e.target.style.outline = 'none'
                }}
              >
                Decline
              </button>

              {/* Accept Button */}
              <button
                onClick={handleAccept}
                disabled={!isChecked || isAccepting}
                style={{
                  flex: '1',
                  minWidth: '140px',
                  padding: '12px 32px',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: isChecked && !isAccepting ? 'pointer' : 'not-allowed',
                  border: 'none',
                  background: isChecked && !isAccepting
                    ? 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)'
                    : 'gray',
                  color: 'white',
                  opacity: isChecked && !isAccepting ? 1 : 0.5,
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  if (isChecked && !isAccepting) {
                    e.target.style.transform = 'scale(1.02)'
                    e.target.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)'
                  e.target.style.boxShadow = 'none'
                }}
                onFocus={(e) => {
                  if (isChecked && !isAccepting) {
                    e.target.style.outline = '2px solid rgba(139, 92, 246, 0.5)'
                    e.target.style.outlineOffset = '2px'
                  }
                }}
                onBlur={(e) => {
                  e.target.style.outline = 'none'
                }}
              >
                {isAccepting ? 'Processing...' : 'Accept & Continue'}
              </button>
            </div>
          </div>
        </div>

        {/* Decline Warning Modal */}
        {showDeclineWarning && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              animation: 'fadeIn 0.2s ease'
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleGoBack()
              }
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '400px',
                backgroundColor: 'var(--surface)',
                borderRadius: '20px',
                padding: '32px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                border: '2px solid #ef4444',
                animation: 'slideInDown 0.3s ease',
                margin: '20px'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#ef4444',
                  marginBottom: '16px'
                }}
              >
                Warning
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: 'var(--text-secondary)',
                  marginBottom: '24px'
                }}
              >
                You must accept the Terms of Service to use BuildFast Chat. Are you sure you want to decline?
              </p>
              <div
                style={{
                  display: 'flex',
                  gap: '12px'
                }}
              >
                <button
                  onClick={handleGoBack}
                  style={{
                    flex: 1,
                    padding: '10px 24px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface-light)',
                    color: 'var(--text-primary)',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'var(--surface)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'var(--surface-light)'
                  }}
                >
                  Go Back
                </button>
                <button
                  onClick={handleExit}
                  style={{
                    flex: 1,
                    padding: '10px 24px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    border: '1px solid #ef4444',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#dc2626'
                    e.target.style.transform = 'scale(1.02)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#ef4444'
                    e.target.style.transform = 'scale(1)'
                  }}
                >
                  Exit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Onboarding Manager */}
      {showOnboardingAfterAccept && (
        <OnboardingManager shouldShowAfterTerms={showOnboardingAfterAccept} />
      )}

      <style>{`
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

        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 768px) {
          .terms-modal-card {
            max-width: 90% !important;
            max-height: 90vh !important;
          }
        }

        @media (max-width: 640px) {
          .terms-modal-card {
            max-width: 95% !important;
            border-radius: 16px !important;
          }

          .terms-modal-card > div:first-child {
            padding: 24px !important;
          }

          .terms-modal-card > div:nth-child(2) {
            padding: 24px !important;
          }

          .terms-modal-card > div:last-child {
            padding: 24px !important;
            flex-direction: column;
          }

          .terms-modal-card > div:last-child > div:last-child {
            flex-direction: column !important;
          }

          .terms-modal-card > div:last-child > div:last-child > button {
            width: 100% !important;
            min-height: 48px !important;
          }
        }
      `}</style>
    </Portal>
  )
}

export default TermsModal

