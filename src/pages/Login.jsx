import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import TwoFactorVerification from '../components/TwoFactorVerification'
import { is2FAEnabled, isDeviceTrusted, getDeviceFingerprint } from '../utils/twoFactorAuth'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [needs2FA, setNeeds2FA] = useState(false)
  const [userId, setUserId] = useState(null)
  const [userSecret, setUserSecret] = useState(null)
  const [twoFactorMethod, setTwoFactorMethod] = useState(null)
  const [emailAddress, setEmailAddress] = useState(null)
  const navigate = useNavigate()
  const { user } = useAuth()

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/chat', { replace: true })
    }
  }, [user, navigate])

  // Don't render if already logged in
  if (user) {
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: supabaseError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (supabaseError) {
        // Handle specific error cases
        if (supabaseError.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please try again.')
        } else {
          setError('Invalid email or password. Please try again.')
        }
        setLoading(false)
        return
      }

      if (data.user) {
        // Check if 2FA is enabled
        const enabled = await is2FAEnabled(data.user.id)
        
        if (enabled) {
          // Check if device is trusted
          const fingerprint = getDeviceFingerprint()
          const trusted = await isDeviceTrusted(data.user.id, fingerprint)
          
          if (trusted) {
            // Device is trusted, proceed to chat
            navigate('/chat')
            return
          }

          // Need 2FA verification
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('two_factor_secret, two_factor_method, email_2fa_address')
            .eq('id', data.user.id)
            .single()

          setUserId(data.user.id)
          setUserSecret(profile?.two_factor_secret)
          setTwoFactorMethod(profile?.two_factor_method || 'authenticator')
          setEmailAddress(profile?.email_2fa_address)
          setNeeds2FA(true)
        } else {
          // No 2FA, proceed to chat
          navigate('/chat')
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }

  const handle2FASuccess = () => {
    setNeeds2FA(false)
    navigate('/chat')
  }

  const handle2FACancel = () => {
    setNeeds2FA(false)
    setPassword('')
    setUserId(null)
    setUserSecret(null)
    setTwoFactorMethod(null)
    setEmailAddress(null)
    // Sign out the user
    supabase.auth.signOut()
  }

  if (needs2FA) {
    return (
      <TwoFactorVerification
        userId={userId}
        userSecret={userSecret}
        method={twoFactorMethod}
        email={emailAddress}
        onSuccess={handle2FASuccess}
        onCancel={handle2FACancel}
      />
    )
  }

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ backgroundColor: 'var(--background)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <header className="frosted-glass border-b transition-colors duration-300" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex-shrink-0">
              <Link to="/" className="text-3xl font-bold gradient-text">BuildFast Chat</Link>
            </div>
            <nav className="flex space-x-6">
              <Link to="/" className="px-3 py-2 rounded-lg transition-colors" style={{ color: 'var(--text-secondary)' }} onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}>Home</Link>
              <Link to="/signup" className="frosted-glass btn-rounded px-6 py-2 font-medium hover-lift transition-all duration-200" style={{ color: 'var(--text-primary)' }}>Sign Up</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center p-4">
      <div className="frosted-glass rounded-2xl shadow-2xl p-10 w-full max-w-md border transition-colors duration-300" style={{ borderColor: 'var(--border)' }}>
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-6 frosted-glass btn-rounded flex items-center justify-center">
            <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Welcome Back</h1>
          <p className="text-lg" style={{ color: 'var(--text-muted)' }}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="frosted-glass rounded-xl p-4 border text-red-200 text-sm" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full px-5 py-4 frosted-glass btn-rounded focus-ring disabled:opacity-50 transition-colors duration-300"
              style={{ color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full px-5 py-4 frosted-glass btn-rounded focus-ring disabled:opacity-50 transition-colors duration-300"
              style={{ color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full frosted-glass btn-rounded-lg py-4 text-lg font-semibold focus-ring disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center hover-lift transition-all duration-200"
            style={{ color: 'var(--text-primary)' }}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" style={{ color: 'var(--text-primary)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Logging In...
              </>
            ) : (
              'Log In'
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-lg" style={{ color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 font-semibold hover-lift transition-all duration-200">
              Sign up
            </Link>
          </p>
        </div>
      </div>
      </div>
    </div>
  )
}

export default Login


