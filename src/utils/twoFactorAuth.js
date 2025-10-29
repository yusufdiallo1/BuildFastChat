import { TOTP, Secret } from 'otpauth'
import QRCode from 'qrcode'
import { supabase } from '../lib/supabase'

/**
 * Generate a new TOTP secret for a user
 */
export const generateTOTPSecret = (userId, email) => {
  const secret = new Secret({ size: 20 })
  const totp = new TOTP({
    issuer: 'BuildFast Chat',
    label: email || 'User',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: secret
  })
  
  return {
    secret: secret.base32,
    uri: totp.toString(),
    manualKey: secret.base32
  }
}

/**
 * Generate QR code data URL from TOTP URI
 */
export const generateQRCode = async (totpURI) => {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(totpURI, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
    return qrCodeDataURL
  } catch (error) {
    console.error('Error generating QR code:', error)
    throw error
  }
}

/**
 * Verify TOTP code
 */
export const verifyTOTPCode = async (secret, code) => {
  try {
    const totp = new TOTP({
      secret: secret,
      algorithm: 'SHA1',
      digits: 6,
      period: 30
    })
    
    const token = totp.generate()
    // Check if code matches current token or validate with window (allows for time drift)
    if (token === code) {
      return true
    }
    // Validate with a window of ±1 (current, previous, next)
    const delta = totp.validate({ token: code, window: 1 })
    return delta !== null
  } catch (error) {
    console.error('Error verifying TOTP code:', error)
    return false
  }
}

/**
 * Generate backup codes
 */
export const generateBackupCodes = (count = 8) => {
  const codes = []
  for (let i = 0; i < count; i++) {
    const code = generateBackupCode()
    codes.push(code)
  }
  return codes
}

/**
 * Generate a single backup code (format: XXXX-XXXX-XXXX-XXXX)
 */
const generateBackupCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Excludes confusing chars
  let code = ''
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) {
      code += '-'
    }
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Save backup codes to database
 */
export const saveBackupCodes = async (userId, codes) => {
  try {
    const codesToInsert = codes.map(code => ({
      user_id: userId,
      code: code,
      used: false
    }))

    const { error } = await supabase
      .from('two_factor_backup_codes')
      .insert(codesToInsert)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error saving backup codes:', error)
    return { success: false, error }
  }
}

/**
 * Verify backup code
 */
export const verifyBackupCode = async (userId, code) => {
  try {
    const { data, error } = await supabase
      .from('two_factor_backup_codes')
      .select('*')
      .eq('user_id', userId)
      .eq('code', code.toUpperCase().replace(/-/g, ''))
      .eq('used', false)
      .single()

    if (error || !data) {
      return { success: false, error: 'Invalid backup code' }
    }

    // Mark code as used
    await supabase
      .from('two_factor_backup_codes')
      .update({ 
        used: true,
        used_at: new Date().toISOString()
      })
      .eq('id', data.id)

    return { success: true }
  } catch (error) {
    console.error('Error verifying backup code:', error)
    return { success: false, error }
  }
}

/**
 * Get unused backup codes for user
 */
export const getBackupCodes = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('two_factor_backup_codes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, codes: data || [] }
  } catch (error) {
    console.error('Error fetching backup codes:', error)
    return { success: false, error }
  }
}

/**
 * Regenerate backup codes
 */
export const regenerateBackupCodes = async (userId) => {
  try {
    // Delete existing unused codes
    await supabase
      .from('two_factor_backup_codes')
      .delete()
      .eq('user_id', userId)

    // Generate and save new codes
    const codes = generateBackupCodes()
    const result = await saveBackupCodes(userId, codes)
    
    if (result.success) {
      return { success: true, codes }
    }
    return result
  } catch (error) {
    console.error('Error regenerating backup codes:', error)
    return { success: false, error }
  }
}

/**
 * Enable 2FA for user
 */
export const enable2FA = async (userId, secret, method, emailAddress = null) => {
  try {
    const updates = {
      two_factor_enabled: true,
      two_factor_secret: secret,
      two_factor_method: method,
      two_factor_enabled_at: new Date().toISOString()
    }

    if (method === 'email' && emailAddress) {
      updates.email_2fa_address = emailAddress
    }

    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error enabling 2FA:', error)
    return { success: false, error }
  }
}

/**
 * Disable 2FA for user
 */
export const disable2FA = async (userId) => {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        two_factor_method: null,
        two_factor_enabled_at: null,
        email_2fa_address: null
      })
      .eq('id', userId)

    if (error) throw error

    // Delete backup codes
    await supabase
      .from('two_factor_backup_codes')
      .delete()
      .eq('user_id', userId)

    // Delete trusted devices
    await supabase
      .from('trusted_devices')
      .delete()
      .eq('user_id', userId)

    return { success: true }
  } catch (error) {
    console.error('Error disabling 2FA:', error)
    return { success: false, error }
  }
}

/**
 * Check if 2FA is enabled for user
 */
export const is2FAEnabled = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('two_factor_enabled, two_factor_method, email_2fa_address')
      .eq('id', userId)
      .single()

    if (error) throw error
    return data?.two_factor_enabled || false
  } catch (error) {
    console.error('Error checking 2FA status:', error)
    return false
  }
}

/**
 * Get device fingerprint
 */
export const getDeviceFingerprint = () => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx.textBaseline = 'top'
  ctx.font = '14px Arial'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#f60'
  ctx.fillRect(125, 1, 62, 20)
  ctx.fillStyle = '#069'
  ctx.fillText('BuildFast Chat', 2, 15)
  ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
  ctx.fillText('BuildFast Chat', 4, 17)
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL()
  ].join('|')
  
  // Simple hash
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

/**
 * Save trusted device
 */
export const saveTrustedDevice = async (userId, deviceInfo) => {
  try {
    const { error } = await supabase
      .from('trusted_devices')
      .upsert({
        user_id: userId,
        device_name: deviceInfo.deviceName || 'Unknown Device',
        browser: deviceInfo.browser || navigator.userAgent,
        location: deviceInfo.location || 'Unknown',
        fingerprint: deviceInfo.fingerprint,
        ip_address: deviceInfo.ipAddress || 'Unknown',
        last_used_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      }, {
        onConflict: 'user_id,fingerprint'
      })

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error saving trusted device:', error)
    return { success: false, error }
  }
}

/**
 * Check if device is trusted
 */
export const isDeviceTrusted = async (userId, fingerprint) => {
  try {
    const { data, error } = await supabase
      .from('trusted_devices')
      .select('*')
      .eq('user_id', userId)
      .eq('fingerprint', fingerprint)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return !!data
  } catch (error) {
    console.error('Error checking trusted device:', error)
    return false
  }
}

/**
 * Log 2FA activity
 */
export const log2FAActivity = async (userId, eventType, success, additionalInfo = {}) => {
  try {
    await supabase
      .from('two_factor_activity')
      .insert({
        user_id: userId,
        event_type: eventType,
        success: success,
        ip_address: additionalInfo.ipAddress || 'Unknown',
        user_agent: additionalInfo.userAgent || navigator.userAgent,
        location: additionalInfo.location || 'Unknown'
      })
  } catch (error) {
    console.error('Error logging 2FA activity:', error)
  }
}

/**
 * Send email verification code
 */
export const sendEmailVerificationCode = async (userId, email) => {
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    
    const { error } = await supabase
      .from('email_verification_codes')
      .insert({
        user_id: userId,
        code: code,
        email: email,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
      })

    if (error) throw error

    // TODO: Integrate with email service to actually send the email
    // For now, we'll log it - in production, use your email service
    console.log(`Email verification code for ${email}: ${code}`)
    
    return { success: true, code } // Return code for development - remove in production
  } catch (error) {
    console.error('Error sending email verification code:', error)
    return { success: false, error }
  }
}

/**
 * Verify email code
 */
export const verifyEmailCode = async (userId, code) => {
  try {
    const { data, error } = await supabase
      .from('email_verification_codes')
      .select('*')
      .eq('user_id', userId)
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      // Increment attempts
      if (data && data.id) {
        await supabase
          .from('email_verification_codes')
          .update({ attempts: (data.attempts || 0) + 1 })
          .eq('id', data.id)
      }
      return { success: false, error: 'Invalid or expired code' }
    }

    // Mark as used
    await supabase
      .from('email_verification_codes')
      .update({ used: true })
      .eq('id', data.id)

    return { success: true }
  } catch (error) {
    console.error('Error verifying email code:', error)
    return { success: false, error }
  }
}

