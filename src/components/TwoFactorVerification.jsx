import { useState, useEffect, useRef } from 'react'
import { verifyTOTPCode, verifyBackupCode, isDeviceTrusted, saveTrustedDevice, log2FAActivity } from '../utils/twoFactorAuth'
import { getDeviceFingerprint } from '../utils/twoFactorAuth'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

function TwoFactorVerification({ userId, userSecret, method, email, onSuccess, onCancel }) {
  const { user } = useAuth()
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [backupCode, setBackupCode] = useState('')
  const [rememberDevice, setRememberDevice] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [lockoutUntil, setLockoutUntil] = useState(null)
  const codeInputRefs = useRef([])
  const [emailCode, setEmailCode] = useState('')
  const [emailCodeSent, setEmailCodeSent] = useState(false)
  const [emailCodeResendCooldown, setEmailCodeResendCooldown] = useState(0)

  useEffect(() => {
    // Check if device is already trusted
    checkTrustedDevice()
    
    // Send email code if method is email
    if (method === 'email' && email && !emailCodeSent) {
      sendEmailCode()
    }
  }, [])

  useEffect(() => {
    // Start resend cooldown timer
    if (emailCodeResendCooldown > 0) {
      const timer = setTimeout(() => {
        setEmailCodeResendCooldown(emailCodeResendCooldown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [emailCodeResendCooldown])

  const checkTrustedDevice = async () => {
    if (!userId) return
    
    const fingerprint = getDeviceFingerprint()
    const trusted = await isDeviceTrusted(userId, fingerprint)
    if (trusted) {
      // Device is trusted, proceed without 2FA
      handleSuccess()
    }
  }

  const sendEmailCode = async () => {
    if (!userId || !email) return
    
    try {
      const { sendEmailVerificationCode } = await import('../utils/twoFactorAuth')
      const result = await sendEmailVerificationCode(userId, email)
      if (result.success) {
        setEmailCodeSent(true)
        setEmailCodeResendCooldown(30)
      }
    } catch (error) {
      console.error('Error sending email code:', error)
    }
  }

  const handleCodeInput = (index, value) => {
    if (!/^\d*$/.test(value)) return
    
    const newCode = [...code]
    newCode[index] = value.slice(-1)
    setCode(newCode)
    setError('')

    // Auto-advance
    if (value && index < 5) {
      const nextInput = document.getElementById(`verify-code-${index + 1}`)
      if (nextInput) nextInput.focus()
    }

    // Auto-submit
    if (newCode.every(c => c) && newCode.join('').length === 6) {
      handleVerify()
    }
  }

  const handleBackspace = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`verify-code-${index - 1}`)
      if (prevInput) prevInput.focus()
    }
  }

  const handleVerify = async () => {
    // Check lockout
    if (lockoutUntil && new Date() < new Date(lockoutUntil)) {
      const minutes = Math.ceil((new Date(lockoutUntil) - new Date()) / 60000)
      setError(`Too many failed attempts. Please try again in ${minutes} minute(s).`)
      return
    }

    if (attempts >= 5) {
      setLockoutUntil(new Date(Date.now() + 15 * 60 * 1000).toISOString())
      setError('Too many failed attempts. Account locked for 15 minutes.')
      return
    }

    setLoading(true)
    setError('')

    try {
      let verified = false
      
      if (useBackupCode) {
        const result = await verifyBackupCode(userId, backupCode)
        verified = result.success
        if (verified) {
          await log2FAActivity(userId, 'backup_code_used', true, {
            ipAddress: 'Unknown',
            userAgent: navigator.userAgent
          })
        }
      } else if (method === 'authenticator') {
        const codeToVerify = code.join('')
        verified = await verifyTOTPCode(userSecret, codeToVerify)
      } else if (method === 'email') {
        const codeToVerify = emailCode || code.join('')
        const { verifyEmailCode } = await import('../utils/twoFactorAuth')
        const emailResult = await verifyEmailCode(userId, codeToVerify)
        verified = emailResult.success
      }

      if (verified) {
        // Save trusted device if requested
        if (rememberDevice) {
          const fingerprint = getDeviceFingerprint()
          await saveTrustedDevice(userId, {
            deviceName: navigator.platform,
            browser: navigator.userAgent,
            location: 'Unknown',
            fingerprint: fingerprint,
            ipAddress: 'Unknown'
          })
        }

        await log2FAActivity(userId, 'verification_success', true, {
          ipAddress: 'Unknown',
          userAgent: navigator.userAgent
        })

        handleSuccess()
      } else {
        setAttempts(prev => prev + 1)
        setError(`Invalid code. Attempt ${attempts + 1} of 5.`)
        await log2FAActivity(userId, 'verification_failed', false, {
          ipAddress: 'Unknown',
          userAgent: navigator.userAgent
        })
        
        if (attempts + 1 >= 5) {
          setLockoutUntil(new Date(Date.now() + 15 * 60 * 1000).toISOString())
        }
      }
    } catch (error) {
      setError('Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSuccess = () => {
    onSuccess?.()
  }

  const handleResendEmail = () => {
    if (emailCodeResendCooldown > 0) return
    sendEmailCode()
    setEmailCodeResendCooldown(30)
  }

  const lockoutMinutes = lockoutUntil 
    ? Math.ceil((new Date(lockoutUntil) - new Date()) / 60000)
    : 0

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--background)' }}>
      <div className="max-w-md w-full">
        {/* Logo/App Name */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 gradient-text">BuildFast Chat</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Two-Factor Authentication</p>
        </div>

        {/* Verification Card */}
        <div className="frosted-glass rounded-xl p-8 shadow-xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--primary)' }}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Enter Verification Code
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {method === 'authenticator'
                ? 'Enter the 6-digit code from your authenticator app'
                : method === 'email'
                ? 'Enter the 6-digit code sent to your email'
                : 'Enter your verification code'}
            </p>
          </div>

          {lockoutUntil && new Date() < new Date(lockoutUntil) && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-400 text-center">
                Account locked. Please try again in {lockoutMinutes} minute(s).
              </p>
            </div>
          )}

          {!useBackupCode ? (
            <>
              {method === 'email' && !emailCode && (
                <div className="mb-6">
                  <input
                    type="text"
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-4 py-3 rounded-lg border text-center text-2xl font-mono"
                    style={{ 
                      backgroundColor: 'var(--surface-light)', 
                      borderColor: error ? '#ef4444' : 'var(--border)',
                      color: 'var(--text-primary)'
                    }}
                    placeholder="000000"
                    maxLength={6}
                    autoFocus
                  />
                  {emailCodeSent && (
                    <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
                      Code sent to {email?.replace(/(.{2})(.*)(@.*)/, '$1****$3')}
                    </p>
                  )}
                </div>
              )}

              {method !== 'email' && (
                <div className="flex items-center justify-center space-x-2 mb-6">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <input
                      key={index}
                      id={`verify-code-${index}`}
                      type="text"
                      maxLength={1}
                      value={code[index]}
                      onChange={(e) => handleCodeInput(index, e.target.value)}
                      onKeyDown={(e) => handleBackspace(index, e)}
                      className="w-12 h-16 text-center text-2xl font-semibold rounded-lg border transition-colors"
                      style={{ 
                        backgroundColor: 'var(--surface-light)', 
                        borderColor: error ? '#ef4444' : 'var(--border)',
                        color: 'var(--text-primary)'
                      }}
                      autoFocus={index === 0}
                    />
                  ))}
                </div>
              )}

              {error && (
                <p className="text-sm text-red-400 text-center mb-4">{error}</p>
              )}

              {attempts > 0 && attempts < 5 && !lockoutUntil && (
                <p className="text-xs text-center mb-4" style={{ color: 'var(--text-muted)' }}>
                  Attempt {attempts} of 5
                </p>
              )}

              <button
                onClick={handleVerify}
                disabled={loading || (method === 'email' ? emailCode.length !== 6 : code.join('').length !== 6) || (lockoutUntil && new Date() < new Date(lockoutUntil))}
                className="w-full py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                style={{ backgroundColor: 'var(--primary)', color: 'white' }}
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>

              {method === 'email' && (
                <div className="text-center mb-4">
                  <button
                    onClick={handleResendEmail}
                    disabled={emailCodeResendCooldown > 0}
                    className="text-sm transition-colors disabled:opacity-50"
                    style={{ color: 'var(--primary)' }}
                  >
                    {emailCodeResendCooldown > 0 
                      ? `Resend in ${emailCodeResendCooldown}s`
                      : "Didn't receive code? Resend"}
                  </button>
                </div>
              )}

              <button
                onClick={() => setUseBackupCode(true)}
                className="text-sm text-center w-full transition-colors"
                style={{ color: 'var(--primary)' }}
              >
                Use Backup Code
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Backup Code
                </label>
                <input
                  type="text"
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-lg border font-mono"
                  style={{ 
                    backgroundColor: 'var(--surface-light)', 
                    borderColor: error ? '#ef4444' : 'var(--border)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}

              <button
                onClick={handleVerify}
                disabled={loading || !backupCode || (lockoutUntil && new Date() < new Date(lockoutUntil))}
                className="w-full py-3 rounded-lg font-medium transition-colors disabled:opacity-50 mb-4"
                style={{ backgroundColor: 'var(--primary)', color: 'white' }}
              >
                {loading ? 'Verifying...' : 'Verify Backup Code'}
              </button>

              <button
                onClick={() => {
                  setUseBackupCode(false)
                  setBackupCode('')
                  setError('')
                }}
                className="text-sm text-center w-full transition-colors"
                style={{ color: 'var(--primary)' }}
              >
                Use Verification Code Instead
              </button>
            </div>
          )}

          {!useBackupCode && (
            <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: 'var(--primary)' }}
                />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Remember this computer for 30 days
                </span>
              </label>
            </div>
          )}

          {onCancel && (
            <button
              onClick={onCancel}
              className="mt-4 text-sm text-center w-full transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-6 text-center">
          <button className="text-sm transition-colors" style={{ color: 'var(--text-muted)' }}>
            Having trouble?
          </button>
        </div>
      </div>
    </div>
  )
}

export default TwoFactorVerification

