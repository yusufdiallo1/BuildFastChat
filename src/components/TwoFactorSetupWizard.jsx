import { useState, useEffect } from 'react'
import { generateTOTPSecret, generateQRCode, verifyTOTPCode, generateBackupCodes, saveBackupCodes, enable2FA, sendEmailVerificationCode } from '../utils/twoFactorAuth'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

function TwoFactorSetupWizard({ isOpen, onClose, onComplete }) {
  const { user, userProfile } = useAuth()
  const [step, setStep] = useState(1)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [method, setMethod] = useState('authenticator') // 'authenticator' or 'email'
  const [secret, setSecret] = useState(null)
  const [qrCodeUrl, setQrCodeUrl] = useState(null)
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', ''])
  const [backupCodes, setBackupCodes] = useState([])
  const [email, setEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [sentCode, setSentCode] = useState(null) // For development - stores sent email code
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const codeInputRefs = []

  useEffect(() => {
    if (isOpen && step === 1) {
      setStep(1)
      setPassword('')
      setMethod('authenticator')
      setSecret(null)
      setQrCodeUrl(null)
      setVerificationCode(['', '', '', '', '', ''])
      setBackupCodes([])
      setError('')
    }
  }, [isOpen, step])

  const handlePasswordConfirm = async () => {
    if (!password || !user) return
    
    setLoading(true)
    setPasswordError('')
    
    try {
      // Verify password by attempting to re-authenticate
      const { data, error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password
      })

      if (error) {
        setPasswordError('Incorrect password')
        setLoading(false)
        return
      }

      // Password is correct, proceed to next step
      if (method === 'authenticator') {
        // Generate secret and QR code
        const totpData = generateTOTPSecret(user.id, user.email)
        setSecret(totpData)
        
        const qrUrl = await generateQRCode(totpData.uri)
        setQrCodeUrl(qrUrl)
        setStep(3) // Skip step 2, go to QR code
      } else {
        setStep(2) // Go to email setup
      }
      setLoading(false)
    } catch (error) {
      setPasswordError('Failed to verify password')
      setLoading(false)
    }
  }

  const handleMethodSelect = () => {
    if (method === 'email') {
      setEmail(user.email || '')
    }
    setStep(3)
  }

  const handleEmailSetup = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const result = await sendEmailVerificationCode(user.id, email)
      if (result.success) {
        // In development, store the code for testing purposes
        if (result.code) {
          setSentCode(result.code)
        }
        // Show code input
        setStep(4)
      } else {
        setError('Failed to send verification email')
      }
      setLoading(false)
    } catch (error) {
      setError('Failed to send verification email')
      setLoading(false)
    }
  }

  const handleCodeInput = (index, value) => {
    if (!/^\d*$/.test(value)) return // Only allow digits
    
    const newCode = [...verificationCode]
    newCode[index] = value.slice(-1) // Only take last character
    setVerificationCode(newCode)

    // Auto-advance to next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-input-${index + 1}`)
      if (nextInput) nextInput.focus()
    }

    // Auto-submit if all 6 digits entered
    if (newCode.every(c => c) && newCode.join('').length === 6) {
      handleVerifyCode(newCode.join(''))
    }
  }

  const handleBackspace = (index, e) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      const prevInput = document.getElementById(`code-input-${index - 1}`)
      if (prevInput) prevInput.focus()
    }
  }

  const handleVerifyCode = async (code = null) => {
    const codeToVerify = code || verificationCode.join('')
    
    if (codeToVerify.length !== 6) {
      setError('Please enter a 6-digit code')
      return
    }

    setLoading(true)
    setError('')

    try {
      let verified = false
      
      if (method === 'authenticator') {
        verified = await verifyTOTPCode(secret.secret, codeToVerify)
      } else if (method === 'email') {
        const { verifyEmailCode } = await import('../utils/twoFactorAuth')
        const result = await verifyEmailCode(user.id, codeToVerify)
        verified = result.success
      }

      if (verified) {
        // Generate and save backup codes
        const codes = generateBackupCodes()
        const saveResult = await saveBackupCodes(user.id, codes)
        
        if (saveResult.success) {
          setBackupCodes(codes)
          
          // Enable 2FA
          const enableResult = await enable2FA(
            user.id,
            method === 'authenticator' ? secret.secret : null,
            method,
            method === 'email' ? email : null
          )
          
          if (enableResult.success) {
            setStep(5) // Show backup codes
          } else {
            setError('Failed to enable 2FA')
            setLoading(false)
          }
        } else {
          setError('Failed to save backup codes')
          setLoading(false)
        }
      } else {
        setError('Invalid code. Please try again.')
        setLoading(false)
      }
    } catch (error) {
      setError('Verification failed. Please try again.')
      setLoading(false)
    }
  }

  const handleDownloadBackupCodes = () => {
    const content = backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')
    const blob = new Blob([`BuildFast Chat - Two-Factor Authentication Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\nIMPORTANT: Store these codes securely. You will need them if you lose access to your authenticator app.\n\nBackup Codes:\n${content}`], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '2FA_Backup_Codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopyCodes = () => {
    const text = backupCodes.join('\n')
    navigator.clipboard.writeText(text)
    // Show toast notification
    alert('Backup codes copied to clipboard!')
  }

  const handlePrintCodes = () => {
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head><title>2FA Backup Codes</title></head>
        <body>
          <h1>BuildFast Chat - Two-Factor Authentication Backup Codes</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <p><strong>IMPORTANT: Store these codes securely.</strong></p>
          <div style="font-family: monospace; font-size: 14px; line-height: 2;">
            ${backupCodes.map((code, i) => `<div>${i + 1}. ${code}</div>`).join('')}
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const handleComplete = () => {
    setStep(1)
    setPassword('')
    setSecret(null)
    setQrCodeUrl(null)
    setVerificationCode(['', '', '', '', '', ''])
    setBackupCodes([])
    setError('')
    onComplete?.()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/50" onClick={onClose}>
      <div 
        className="frosted-glass rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Set Up Two-Factor Authentication
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress Indicator */}
          <div className="mt-4 flex items-center justify-center space-x-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    s < step ? 'bg-green-600 text-white' :
                    s === step ? 'bg-indigo-600 text-white' :
                    'bg-gray-700 text-gray-400'
                  }`}
                >
                  {s < step ? '✓' : s}
                </div>
                {s < 5 && (
                  <div
                    className={`w-12 h-1 mx-1 ${
                      s < step ? 'bg-green-600' : 'bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Password Confirmation */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Please enter your password to continue setting up two-factor authentication.
                </p>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handlePasswordConfirm()}
                  className="w-full px-4 py-3 rounded-lg border transition-colors"
                  style={{ 
                    backgroundColor: 'var(--surface-light)', 
                    borderColor: passwordError ? '#ef4444' : 'var(--border)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="Enter your password"
                  autoFocus
                />
                {passwordError && (
                  <p className="text-sm text-red-400 mt-1">{passwordError}</p>
                )}
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg transition-colors"
                  style={{ color: 'var(--text-secondary)', backgroundColor: 'transparent' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordConfirm}
                  disabled={!password || loading}
                  className="px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  style={{ 
                    backgroundColor: 'var(--primary)', 
                    color: 'white'
                  }}
                >
                  {loading ? 'Verifying...' : 'Continue'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Choose Method */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  Choose Authentication Method
                </h3>
                <div className="space-y-4">
                  <button
                    onClick={() => setMethod('authenticator')}
                    className={`w-full p-4 rounded-lg border-2 transition-all ${
                      method === 'authenticator' ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-700'
                    }`}
                    style={{ backgroundColor: method === 'authenticator' ? 'var(--surface-light)' : 'transparent' }}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="text-3xl">📱</div>
                      <div className="text-left flex-1">
                        <div className="font-medium" style={{ color: 'var(--text-primary)' }}>Authenticator App</div>
                        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          Use an app like Google Authenticator or Authy
                        </div>
                      </div>
                      {method === 'authenticator' && (
                        <svg className="w-6 h-6 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>

                  <button
                    onClick={() => setMethod('email')}
                    className={`w-full p-4 rounded-lg border-2 transition-all ${
                      method === 'email' ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-700'
                    }`}
                    style={{ backgroundColor: method === 'email' ? 'var(--surface-light)' : 'transparent' }}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="text-3xl">📧</div>
                      <div className="text-left flex-1">
                        <div className="font-medium" style={{ color: 'var(--text-primary)' }}>Email Verification</div>
                        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          Receive verification codes via email
                        </div>
                      </div>
                      {method === 'email' && (
                        <svg className="w-6 h-6 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-lg transition-colors"
                  style={{ color: 'var(--text-secondary)', backgroundColor: 'transparent' }}
                >
                  Back
                </button>
                <button
                  onClick={handleMethodSelect}
                  className="px-6 py-2 rounded-lg font-medium transition-colors"
                  style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: QR Code / Email Setup */}
          {step === 3 && method === 'authenticator' && secret && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Scan QR Code
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
                
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-white rounded-lg shadow-lg">
                    {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code" className="w-[300px] h-[300px]" />}
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Can't scan? Enter this code manually:
                  </p>
                  <div className="flex items-center space-x-2">
                    <code className="px-4 py-2 rounded-lg font-mono text-sm bg-gray-800 text-gray-100 flex-1">
                      {secret.manualKey}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(secret.manualKey)}
                      className="px-4 py-2 rounded-lg transition-colors"
                      style={{ backgroundColor: 'var(--surface-light)', color: 'var(--text-primary)' }}
                      title="Copy"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setStep(4)}
                  className="px-6 py-2 rounded-lg font-medium transition-colors"
                  style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && method === 'email' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Email Address
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                  Enter the email address where you'd like to receive verification codes.
                </p>
                
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
                  placeholder="your@email.com"
                  autoFocus
                />
                
                {error && (
                  <p className="text-sm text-red-400 mt-1">{error}</p>
                )}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 rounded-lg transition-colors"
                  style={{ color: 'var(--text-secondary)', backgroundColor: 'transparent' }}
                >
                  Back
                </button>
                <button
                  onClick={handleEmailSetup}
                  disabled={!email || loading}
                  className="px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                >
                  {loading ? 'Sending...' : 'Send Test Code'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Verify Code */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Enter Verification Code
                </h3>
                <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                  {method === 'authenticator' 
                    ? 'Enter the 6-digit code from your authenticator app'
                    : 'Enter the 6-digit code sent to your email'}
                </p>

                {method === 'email' && sentCode && (
                  <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <p className="text-xs text-blue-400 text-center">
                      Development Mode: Code sent to email is {sentCode}
                    </p>
                  </div>
                )}
                
                <div className="flex items-center justify-center space-x-2 mb-4">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <input
                      key={index}
                      id={`code-input-${index}`}
                      type="text"
                      maxLength={1}
                      value={verificationCode[index]}
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

                {error && (
                  <p className="text-sm text-red-400 text-center">{error}</p>
                )}

                <div className="flex justify-center mt-4">
                  <button
                    onClick={() => handleVerifyCode()}
                    disabled={loading || verificationCode.join('').length !== 6}
                    className="px-8 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                    style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                  >
                    {loading ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Backup Codes */}
          {step === 5 && backupCodes.length > 0 && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Store These Backup Codes Securely
                  </h3>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <strong className="text-yellow-500">Important:</strong> Save these codes in a safe place. 
                    You'll need them to access your account if you lose your authenticator device.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  {backupCodes.map((code, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg border font-mono text-sm text-center"
                      style={{ 
                        backgroundColor: 'var(--surface-light)', 
                        borderColor: 'var(--border)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      {code}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3 justify-center mb-6">
                  <button
                    onClick={handleDownloadBackupCodes}
                    className="px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                    style={{ backgroundColor: 'var(--surface-light)', color: 'var(--text-primary)' }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download</span>
                  </button>
                  <button
                    onClick={handleCopyCodes}
                    className="px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                    style={{ backgroundColor: 'var(--surface-light)', color: 'var(--text-primary)' }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Copy All</span>
                  </button>
                  <button
                    onClick={handlePrintCodes}
                    className="px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                    style={{ backgroundColor: 'var(--surface-light)', color: 'var(--text-primary)' }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span>Print</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleComplete}
                  className="px-6 py-2 rounded-lg font-medium transition-colors"
                  style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TwoFactorSetupWizard

