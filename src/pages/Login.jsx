import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import TwoFactorVerification from '../components/TwoFactorVerification'
import { is2FAEnabled, isDeviceTrusted, getDeviceFingerprint } from '../utils/twoFactorAuth'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetNotice, setResetNotice] = useState('')
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
    setResetNotice('')
    setLoading(true)

    try {
      // Check if Supabase is configured
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      if (!supabaseUrl) {
        setError('❌ Configuration Error: Supabase credentials are missing! Please create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Check SETUP_ENV.md for instructions.')
        setLoading(false)
        return
      }

      const { data, error: supabaseError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (supabaseError) {
        // Handle specific error cases
        if (supabaseError.message.includes('Invalid login credentials') || supabaseError.message.includes('Invalid')) {
          setError('Invalid email or password. Please try again.')
        } else if (supabaseError.message.includes('Failed to fetch')) {
          setError('❌ Connection Error: Cannot connect to Supabase. Your project may be PAUSED. Go to https://supabase.com/dashboard and restore your project. See TEST_SUPABASE_CONNECTION.md for details.')
        } else {
          setError(supabaseError.message || 'An error occurred. Please try again.')
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

  const handleForgotPassword = async () => {
    setError('')
    setResetNotice('')
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter your email address to reset your password.')
      return
    }
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`
      })
      if (resetError) {
        setError(resetError.message || 'Failed to send reset email. Please try again.')
        return
      }
      setResetNotice('If this email exists, a password reset link has been sent.')
    } catch (e) {
      setError('Failed to send reset email. Please try again.')
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
          {resetNotice && (
            <div className="frosted-glass rounded-xl p-4 border text-emerald-200 text-sm" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {resetNotice}
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
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full px-5 py-4 frosted-glass btn-rounded focus-ring disabled:opacity-50 transition-colors duration-300 pr-12"
                style={{ color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-200"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M9.88 9.88A3 3 0 0112 9c1.657 0 3 1.343 3 3 0 .74-.267 1.417-.712 1.94M6.343 6.343C4.78 7.53 3.5 9.11 2.458 11.003a1.043 1.043 0 000 .994C4.55 16.117 8.013 18 12 18c1.57 0 3.06-.287 4.414-.81M15 15a3 3 0 01-3 3" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12.003C3.732 8.943 7.523 6 12 6c4.477 0 8.268 2.943 9.542 6.003a1.043 1.043 0 010 .994C20.268 16.057 16.477 19 12 19c-4.477 0-8.268-2.943-9.542-6.003a1.043 1.043 0 010-.994z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            <div className="mt-2 text-right">
              <button type="button" onClick={handleForgotPassword} className="text-indigo-400 hover:text-indigo-300 text-sm">
                Forgot password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full frosted-glass btn-rounded-lg btn-glow py-4 text-lg font-semibold focus-ring disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center hover-lift transition-all duration-200"
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


