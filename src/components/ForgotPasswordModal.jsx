import { useState } from 'react'
import { supabase } from '../lib/supabase'

function ForgotPasswordModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1) // 1: email, 2: code, 3: new password, 4: success
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  // Generate a unique 6-digit code
  const generateUniqueCode = async () => {
    let code
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      // Generate random 6-digit code
      code = Math.floor(100000 + Math.random() * 900000).toString()

      // Check if code already exists in database
      const { data, error } = await supabase
        .from('password_reset_codes')
        .select('code')
        .eq('code', code)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single()

      // If no existing code found, we can use this one
      if (error && error.code === 'PGRST116') {
        return code
      }

      // If code exists, try again
      attempts++
    }

    // Fallback: if we can't find a unique code after max attempts, still return one
    // (very unlikely but handles edge case)
    return code || Math.floor(100000 + Math.random() * 900000).toString()
  }

  const handleSendCode = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    try {
      // Generate unique 6-digit code
      const resetCode = await generateUniqueCode()

      // Set expiration to 10 minutes from now
      const expiresAt = new Date()
      expiresAt.setMinutes(expiresAt.getMinutes() + 10)

      // Store code in database
      const { error: insertError } = await supabase
        .from('password_reset_codes')
        .insert({
          email,
          code: resetCode,
          expires_at: expiresAt.toISOString(),
          used: false,
          user_id: null // Will be set by Edge Function if user exists
        })

      if (insertError) {
        console.error('Error storing code:', insertError)
        setError('Failed to generate reset code. Please try again.')
        setLoading(false)
        return
      }

      // Send email with code using Edge Function (explicit Authorization to satisfy verify_jwt)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/send-password-reset-code`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnon}`,
            'apikey': supabaseAnon,
          },
          body: JSON.stringify({ email, code: resetCode }),
        })

        if (!res.ok) {
          const text = await res.text().catch(() => '')
          console.error('Edge Function error:', res.status, text)
          console.log('Password reset code (for testing):', resetCode)
          setError('Failed to send email. Please check your email or try again.')
          setLoading(false)
          return
        }
      } catch (err) {
        console.error('Edge Function fetch failed:', err)
        console.log('Password reset code (for testing):', resetCode)
        setError('Failed to send email. Please check your email or try again.')
        setLoading(false)
        return
      }

      setStep(2)
      setSuccess(true)
    } catch (err) {
      setError('Failed to send code. Please try again.')
      console.error('Send code error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!code || code.length !== 6) {
      setError('Please enter the 6-digit code')
      setLoading(false)
      return
    }

    try {
      // Verify code from database
      const { data: codeData, error: verifyError } = await supabase
        .from('password_reset_codes')
        .select('*')
        .eq('email', email)
        .eq('code', code)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (verifyError || !codeData) {
        setError('Invalid or expired code. Please request a new code.')
        setLoading(false)
        return
      }

      // Mark code as used
      await supabase
        .from('password_reset_codes')
        .update({ used: true })
        .eq('id', codeData.id)

      // Code verified successfully - proceed to password reset step
      setStep(3)
      setSuccess(true)
    } catch (err) {
      setError('Verification failed. Please try again.')
      console.error('Verify code error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')

    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      // Use Edge Function to update password (explicit Authorization to satisfy verify_jwt)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(`${supabaseUrl}/functions/v1/reset-password-with-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnon}`,
          'apikey': supabaseAnon,
        },
        body: JSON.stringify({ email, newPassword }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        setError(text || 'Unable to reset password. Please try again.')
        setLoading(false)
        return
      }

      // Password reset successful
      setStep(4)
      setSuccess(true)
      setTimeout(() => {
        onClose()
        // Reset state
        setStep(1)
        setEmail('')
        setCode('')
        setNewPassword('')
        setConfirmPassword('')
        setError('')
        setSuccess(false)
      }, 2000)
    } catch (err) {
      setError('Failed to reset password. Please try again.')
      console.error('Reset password error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStep(1)
    setEmail('')
    setCode('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    setSuccess(false)
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/50"
      onClick={handleClose}
    >
      <div
        className="frosted-glass rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 border transition-colors duration-300"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold gradient-text">Reset Password</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step 1: Enter Email */}
        {step === 1 && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Enter your email and we'll send you a 6‑digit code to reset your password.
            </p>
            
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border transition-colors"
                style={{ 
                  backgroundColor: 'var(--surface-light)', 
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)'
                }}
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--surface-light)', color: 'var(--text-primary)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !email}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--primary)', color: 'white' }}
              >
                {loading ? 'Sending...' : 'Send Code'}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Enter Code */}
        {step === 2 && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Enter the 6‑digit code sent to <strong>{email}</strong>
            </p>
            
            {success && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                <p className="text-sm text-green-400">Code sent! Check your email.</p>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Verification Code
              </label>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 rounded-lg border text-center text-2xl font-mono tracking-widest transition-colors"
                style={{ 
                  backgroundColor: 'var(--surface-light)', 
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)'
                }}
                placeholder="000000"
                maxLength={6}
                required
                autoFocus
              />
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep(1)
                  setCode('')
                  setError('')
                }}
                className="flex-1 px-4 py-2 rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--surface-light)', color: 'var(--text-primary)' }}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--primary)', color: 'white' }}
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Enter New Password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Create a new password for your account.
            </p>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border pr-10 transition-colors"
                  style={{ 
                    backgroundColor: 'var(--surface-light)', 
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="••••••••"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-200"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.879 16.121A4.995 4.995 0 0112 15c.794 0 1.547.173 2.245.499M12 12v.01" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border pr-10 transition-colors"
                  style={{ 
                    backgroundColor: 'var(--surface-light)', 
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-200"
                >
                  {showConfirmPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.879 16.121A4.995 4.995 0 0112 15c.794 0 1.547.173 2.245.499M12 12v.01" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542-7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep(2)
                  setNewPassword('')
                  setConfirmPassword('')
                  setError('')
                }}
                className="flex-1 px-4 py-2 rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--surface-light)', color: 'var(--text-primary)' }}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--primary)', color: 'white' }}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              Password Reset Successful!
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Your password has been reset. You can now log in with your new password.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ForgotPasswordModal

