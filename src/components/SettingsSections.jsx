import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

// Password Change Section
export function PasswordChange() {
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const getPasswordStrength = (password) => {
    if (!password) return { level: '', color: '' }
    if (password.length < 8) return { level: 'Weak', color: 'red' }
    if (password.length < 12 && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) return { level: 'Medium', color: 'yellow' }
    return { level: 'Strong', color: 'green' }
  }

  const passwordStrength = getPasswordStrength(newPassword)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      // Verify current password
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      })

      if (verifyError) {
        setError('Current password is incorrect')
        setLoading(false)
        return
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) throw updateError

      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="frosted-glass rounded-lg p-6 border mb-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Change Password</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            Current Password
          </label>
          <div className="relative">
            <input
              type={showPasswords.current ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border pr-10"
              style={{ backgroundColor: 'var(--surface-light)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showPasswords.current ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            New Password
          </label>
          <div className="relative">
            <input
              type={showPasswords.new ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border pr-10"
              style={{ backgroundColor: 'var(--surface-light)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showPasswords.new ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          {newPassword && (
            <div className="mt-1">
              <div className="flex items-center space-x-2">
                <div className={`h-2 flex-1 rounded ${passwordStrength.color === 'red' ? 'bg-red-500' : passwordStrength.color === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                <span className="text-xs" style={{ color: `var(--text-${passwordStrength.color})` }}>
                  {passwordStrength.level}
                </span>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            Confirm New Password
          </label>
          <div className="relative">
            <input
              type={showPasswords.confirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border pr-10"
              style={{ backgroundColor: 'var(--surface-light)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showPasswords.confirm ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="text-sm text-green-400">Password updated successfully!</p>}

        <button
          type="submit"
          disabled={loading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
          className="w-full px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          style={{ backgroundColor: 'var(--primary)', color: 'white' }}
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}

// Username Change Section
export function UsernameChange() {
  const { user, userProfile, setUserProfile } = useAuth()
  const [username, setUsername] = useState(userProfile?.username || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const isUsernameValid = username.length >= 3 && username.length <= 20 && /^[a-zA-Z0-9]+$/.test(username)

  const checkAvailability = async () => {
    if (!isUsernameValid) return false
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', username)
        .neq('id', user.id)
        .single()

      return !data && !error
    } catch {
      return true
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!isUsernameValid) {
      setError('Username must be 3-20 characters and alphanumeric only')
      return
    }

    const available = await checkAvailability()
    if (!available) {
      setError('Username is already taken')
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ username: username.trim() })
        .eq('id', user.id)

      if (updateError) throw updateError

      setSuccess(true)
      setUserProfile({ ...userProfile, username: username.trim() })
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message || 'Failed to update username')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="frosted-glass rounded-lg p-6 border mb-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Change Username</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
            placeholder={userProfile?.username || 'Enter username'}
            className="w-full px-4 py-2 rounded-lg border"
            style={{ backgroundColor: 'var(--surface-light)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            maxLength={20}
            required
          />
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {username.length}/20 characters
            </span>
            {username && (
              <span className={`text-xs ${isUsernameValid ? 'text-green-400' : 'text-red-400'}`}>
                {isUsernameValid ? '✓ Available' : 'Invalid format'}
              </span>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="text-sm text-green-400">Username updated successfully!</p>}

        <button
          type="submit"
          disabled={loading || !isUsernameValid || username === userProfile?.username}
          className="w-full px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          style={{ backgroundColor: 'var(--primary)', color: 'white' }}
        >
          {loading ? 'Updating...' : 'Update Username'}
        </button>
      </form>
    </div>
  )
}

// Theme Toggle Section
export function ThemeToggle() {
  const { userProfile, setUserProfile } = useAuth()
  const [loading, setLoading] = useState(false)

  const currentTheme = userProfile?.theme_preference || 'dark'

  const handleThemeChange = async (theme) => {
    if (loading) return
    setLoading(true)

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ theme_preference: theme })
        .eq('id', userProfile.id)

      if (error) throw error

      setUserProfile({ ...userProfile, theme_preference: theme })
      document.documentElement.setAttribute('data-theme', theme)
    } catch (error) {
      console.error('Error updating theme:', error)
      alert('Failed to update theme')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="frosted-glass rounded-lg p-6 border mb-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Appearance</h3>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">☀️</span>
          <span style={{ color: 'var(--text-primary)' }}>Light Mode</span>
        </div>
        
        <button
          onClick={() => handleThemeChange(currentTheme === 'dark' ? 'light' : 'dark')}
          disabled={loading}
          className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${
            currentTheme === 'dark' ? 'bg-indigo-600' : 'bg-gray-400'
          }`}
        >
          <span
            className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 ${
              currentTheme === 'dark' ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
        
        <div className="flex items-center space-x-3">
          <span style={{ color: 'var(--text-primary)' }}>Dark Mode</span>
          <span className="text-2xl">🌙</span>
        </div>
      </div>
    </div>
  )
}

// Read Receipts Toggle
export function ReadReceiptsToggle() {
  const { userProfile, setUserProfile } = useAuth()
  const [loading, setLoading] = useState(false)

  const sendReadReceipts = userProfile?.send_read_receipts ?? true

  const handleToggle = async () => {
    if (loading) return
    setLoading(true)

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ send_read_receipts: !sendReadReceipts })
        .eq('id', userProfile.id)

      if (error) throw error

      setUserProfile({ ...userProfile, send_read_receipts: !sendReadReceipts })
    } catch (error) {
      console.error('Error updating read receipts:', error)
      alert('Failed to update read receipts setting')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="frosted-glass rounded-lg p-6 border mb-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Send Read Receipts</h3>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            When enabled, others can see when you've read their messages
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${
            sendReadReceipts ? 'bg-indigo-600' : 'bg-gray-400'
          }`}
        >
          <span
            className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 ${
              sendReadReceipts ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  )
}

