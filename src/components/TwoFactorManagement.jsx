import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import TwoFactorSetupWizard from './TwoFactorSetupWizard'
import { 
  is2FAEnabled, 
  disable2FA, 
  getBackupCodes, 
  regenerateBackupCodes,
  getDeviceFingerprint 
} from '../utils/twoFactorAuth'

function TwoFactorManagement() {
  const { user, userProfile } = useAuth()
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [twoFAMethod, setTwoFAMethod] = useState(null)
  const [emailAddress, setEmailAddress] = useState(null)
  const [enabledDate, setEnabledDate] = useState(null)
  const [showSetup, setShowSetup] = useState(false)
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [backupCodes, setBackupCodes] = useState([])
  const [password, setPassword] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showDisableModal, setShowDisableModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [trustedDevices, setTrustedDevices] = useState([])
  const [activityLog, setActivityLog] = useState([])

  useEffect(() => {
    if (userProfile) {
      setTwoFAEnabled(userProfile.two_factor_enabled || false)
      setTwoFAMethod(userProfile.two_factor_method)
      setEmailAddress(userProfile.email_2fa_address)
      setEnabledDate(userProfile.two_factor_enabled_at)
      
      if (userProfile.two_factor_enabled) {
        loadBackupCodes()
        loadTrustedDevices()
        loadActivityLog()
      }
    }
  }, [userProfile])

  const loadBackupCodes = async () => {
    if (!user?.id) return
    const result = await getBackupCodes(user.id)
    if (result.success) {
      setBackupCodes(result.codes || [])
    }
  }

  const loadTrustedDevices = async () => {
    if (!user?.id) return
    try {
      const { data, error } = await supabase
        .from('trusted_devices')
        .select('*')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('last_used_at', { ascending: false })

      if (error) throw error
      setTrustedDevices(data || [])
    } catch (error) {
      console.error('Error loading trusted devices:', error)
    }
  }

  const loadActivityLog = async () => {
    if (!user?.id) return
    try {
      const { data, error } = await supabase
        .from('two_factor_activity')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setActivityLog(data || [])
    } catch (error) {
      console.error('Error loading activity log:', error)
    }
  }

  const handleDisable2FA = async () => {
    if (!password || !verifyCode || !user?.id) {
      alert('Please enter password and verification code')
      return
    }

    setLoading(true)
    
    try {
      // Verify password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password
      })

      if (authError) {
        alert('Incorrect password')
        setLoading(false)
        return
      }

      // Verify 2FA code
      const { verifyTOTPCode, verifyEmailCode } = await import('../utils/twoFactorAuth')
      
      let verified = false
      if (twoFAMethod === 'authenticator') {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('two_factor_secret')
          .eq('id', user.id)
          .single()
        
        if (profile?.two_factor_secret) {
          verified = await verifyTOTPCode(profile.two_factor_secret, verifyCode)
        }
      } else if (twoFAMethod === 'email') {
        const result = await verifyEmailCode(user.id, verifyCode)
        verified = result.success
      }

      if (!verified) {
        alert('Invalid verification code')
        setLoading(false)
        return
      }

      // Disable 2FA
      const result = await disable2FA(user.id)
      if (result.success) {
        setTwoFAEnabled(false)
        setShowDisableModal(false)
        setPassword('')
        setVerifyCode('')
        alert('2FA has been disabled')
        // Reload profile
        window.location.reload()
      } else {
        alert('Failed to disable 2FA')
      }
    } catch (error) {
      console.error('Error disabling 2FA:', error)
      alert('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerateBackupCodes = async () => {
    if (!user?.id) return
    
    if (!window.confirm('This will invalidate all existing backup codes. Continue?')) {
      return
    }

    const result = await regenerateBackupCodes(user.id)
    if (result.success) {
      setBackupCodes(result.codes.map(code => ({ code, used: false })))
      alert('Backup codes regenerated. Please save them securely.')
    } else {
      alert('Failed to regenerate backup codes')
    }
  }

  const handleViewBackupCodes = async () => {
    if (!password || !user?.id) {
      alert('Please enter your password')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password
      })

      if (error) {
        alert('Incorrect password')
        setLoading(false)
        return
      }

      setShowBackupCodes(true)
      setPassword('')
    } catch (error) {
      alert('Failed to verify password')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveTrustedDevice = async (deviceId) => {
    if (!window.confirm('Remove this trusted device?')) return

    try {
      const { error } = await supabase
        .from('trusted_devices')
        .delete()
        .eq('id', deviceId)

      if (error) throw error
      loadTrustedDevices()
    } catch (error) {
      console.error('Error removing device:', error)
      alert('Failed to remove device')
    }
  }

  const handleRemoveAllDevices = async () => {
    if (!window.confirm('Remove all trusted devices?')) return

    try {
      const { error } = await supabase
        .from('trusted_devices')
        .delete()
        .eq('user_id', user.id)

      if (error) throw error
      loadTrustedDevices()
      alert('All trusted devices removed')
    } catch (error) {
      console.error('Error removing devices:', error)
      alert('Failed to remove devices')
    }
  }

  const unusedCodes = backupCodes.filter(c => !c.used).length

  return (
    <div className="space-y-6">
      {/* 2FA Status Card */}
      <div className="frosted-glass rounded-lg p-6 border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Two-Factor Authentication
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Add an extra layer of security to your account
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              twoFAEnabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
            }`}>
              {twoFAEnabled ? 'Active' : 'Disabled'}
            </span>
            {!twoFAEnabled && (
              <button
                onClick={() => setShowSetup(true)}
                className="px-4 py-2 rounded-lg font-medium transition-colors"
                style={{ backgroundColor: 'var(--primary)', color: 'white' }}
              >
                Enable 2FA
              </button>
            )}
          </div>
        </div>

        {twoFAEnabled && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--text-secondary)' }}>Method:</span>
              <span style={{ color: 'var(--text-primary)' }}>
                {twoFAMethod === 'authenticator' ? '📱 Authenticator App' : `📧 Email: ${emailAddress?.replace(/(.{2})(.*)(@.*)/, '$1****$3') || 'N/A'}`}
              </span>
            </div>
            {enabledDate && (
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>Enabled:</span>
                <span style={{ color: 'var(--text-primary)' }}>
                  {new Date(enabledDate).toLocaleDateString()}
                </span>
              </div>
            )}
            {unusedCodes <= 2 && unusedCodes > 0 && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-sm text-yellow-400">
                  ⚠️ You have {unusedCodes} backup code{unusedCodes === 1 ? '' : 's'} remaining. Consider regenerating backup codes.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {twoFAEnabled && (
        <>
          {/* Management Actions */}
          <div className="frosted-glass rounded-lg p-6 border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Management
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => setShowSetup(true)}
                className="w-full px-4 py-2 rounded-lg transition-colors text-left"
                style={{ backgroundColor: 'var(--surface-light)', color: 'var(--text-primary)' }}
              >
                Change Authentication Method
              </button>
              
              {!showBackupCodes ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                      Password to view backup codes
                    </label>
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border pr-10"
                          style={{ 
                            backgroundColor: 'var(--surface-light)', 
                            borderColor: 'var(--border)',
                            color: 'var(--text-primary)'
                          }}
                          placeholder="Enter password"
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
                      <button
                        onClick={handleViewBackupCodes}
                        disabled={loading || !password}
                        className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                        style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                      >
                        View Codes
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>Backup Codes</h4>
                    <button
                      onClick={() => setShowBackupCodes(false)}
                      className="text-sm transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Hide
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {backupCodes.map((item, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border font-mono text-sm text-center ${
                          item.used ? 'opacity-50 line-through' : ''
                        }`}
                        style={{ 
                          backgroundColor: 'var(--surface-light)', 
                          borderColor: 'var(--border)',
                          color: item.used ? 'var(--text-muted)' : 'var(--text-primary)'
                        }}
                      >
                        {item.code}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleRegenerateBackupCodes}
                    className="w-full px-4 py-2 rounded-lg transition-colors"
                    style={{ backgroundColor: 'var(--surface-light)', color: 'var(--text-primary)' }}
                  >
                    Regenerate Codes
                  </button>
                </div>
              )}

              <button
                onClick={() => setShowDisableModal(true)}
                className="w-full px-4 py-2 rounded-lg transition-colors text-left text-red-400 hover:bg-red-500/10"
              >
                Disable 2FA
              </button>
            </div>
          </div>

          {/* Trusted Devices */}
          <div className="frosted-glass rounded-lg p-6 border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Trusted Devices
              </h3>
              {trustedDevices.length > 0 && (
                <button
                  onClick={handleRemoveAllDevices}
                  className="text-sm transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Remove All
                </button>
              )}
            </div>
            
            {trustedDevices.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                No trusted devices
              </p>
            ) : (
              <div className="space-y-3">
                {trustedDevices.map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ backgroundColor: 'var(--surface-light)' }}
                  >
                    <div className="flex-1">
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {device.device_name || 'Unknown Device'}
                      </div>
                      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {device.browser} • Last used {new Date(device.last_used_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveTrustedDevice(device.id)}
                      className="px-3 py-1 rounded-lg text-sm transition-colors text-red-400 hover:bg-red-500/10"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Log */}
          <div className="frosted-glass rounded-lg p-6 border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Recent Activity
            </h3>
            {activityLog.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                No activity logged
              </p>
            ) : (
              <div className="space-y-2">
                {activityLog.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between text-sm p-2 rounded"
                    style={{ backgroundColor: 'var(--surface-light)' }}
                  >
                    <div>
                      <span className={activity.success ? 'text-green-400' : 'text-red-400'}>
                        {activity.success ? '✓' : '✗'}
                      </span>
                      <span className="ml-2" style={{ color: 'var(--text-primary)' }}>
                        {activity.event_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(activity.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Setup Wizard */}
      {showSetup && (
        <TwoFactorSetupWizard
          isOpen={showSetup}
          onClose={() => setShowSetup(false)}
          onComplete={() => {
            setShowSetup(false)
            window.location.reload()
          }}
        />
      )}

      {/* Disable Modal */}
      {showDisableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/50" onClick={() => setShowDisableModal(false)}>
          <div
            className="frosted-glass rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 border"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Disable Two-Factor Authentication
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Your account will be less secure. Please enter your password and verification code to confirm.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border pr-10"
                    style={{ 
                      backgroundColor: 'var(--surface-light)', 
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)'
                    }}
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
                  Verification Code
                </label>
                <input
                  type="text"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{ 
                    backgroundColor: 'var(--surface-light)', 
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="000000"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDisableModal(false)
                    setPassword('')
                    setVerifyCode('')
                  }}
                  className="flex-1 px-4 py-2 rounded-lg transition-colors"
                  style={{ backgroundColor: 'var(--surface-light)', color: 'var(--text-primary)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDisable2FA}
                  disabled={loading || !password || !verifyCode}
                  className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 bg-red-500 text-white"
                >
                  {loading ? 'Disabling...' : 'Disable 2FA'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TwoFactorManagement

