import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Portal from './Portal'

function MuteModal({ conversationId, conversationName, onClose, onMuteSuccess }) {
  const [selectedDuration, setSelectedDuration] = useState(null)
  const [muting, setMuting] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [muteInfo, setMuteInfo] = useState(null)
  const { user } = useAuth()

  const durationOptions = [
    { label: '1 hour', value: 1, unit: 'hours' },
    { label: '8 hours', value: 8, unit: 'hours' },
    { label: '1 week', value: 1, unit: 'weeks' },
    { label: 'Forever', value: null, unit: null }
  ]

  useEffect(() => {
    checkMuteStatus()
  }, [conversationId, user?.id])

  const checkMuteStatus = async () => {
    if (!conversationId || !user) return

    try {
      const { data, error } = await supabase
        .from('muted_conversations')
        .select('muted_until, created_at')
        .eq('user_id', user.id)
        .eq('conversation_id', conversationId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        const now = new Date()
        const mutedUntil = data.muted_until ? new Date(data.muted_until) : null
        
        // Check if mute has expired
        if (mutedUntil && mutedUntil > now) {
          setIsMuted(true)
          setMuteInfo(data)
        } else if (!mutedUntil) {
          // Forever muted
          setIsMuted(true)
          setMuteInfo(data)
        } else {
          // Mute expired, remove it
          await supabase
            .from('muted_conversations')
            .delete()
            .eq('user_id', user.id)
            .eq('conversation_id', conversationId)
          setIsMuted(false)
          setMuteInfo(null)
        }
      } else {
        setIsMuted(false)
        setMuteInfo(null)
      }
    } catch (error) {
      console.error('Error checking mute status:', error)
    }
  }

  const handleMute = async () => {
    if (!selectedDuration || muting || !conversationId || !user) return

    try {
      setMuting(true)

      let mutedUntil = null
      if (selectedDuration.value !== null) {
        const now = new Date()
        if (selectedDuration.unit === 'hours') {
          mutedUntil = new Date(now.getTime() + selectedDuration.value * 60 * 60 * 1000)
        } else if (selectedDuration.unit === 'weeks') {
          mutedUntil = new Date(now.getTime() + selectedDuration.value * 7 * 24 * 60 * 60 * 1000)
        }
      }

      const { error } = await supabase
        .from('muted_conversations')
        .upsert({
          user_id: user.id,
          conversation_id: conversationId,
          muted_until: mutedUntil
        }, {
          onConflict: 'user_id,conversation_id'
        })

      if (error) throw error

      setIsMuted(true)
      setMuteInfo({ muted_until: mutedUntil })
      
      if (onMuteSuccess) {
        onMuteSuccess()
      }
      
      onClose()
    } catch (error) {
      console.error('Error muting conversation:', error)
      alert('Failed to mute conversation: ' + (error?.message || 'Please try again.'))
    } finally {
      setMuting(false)
    }
  }

  const handleUnmute = async () => {
    if (muting || !conversationId || !user) return

    try {
      setMuting(true)

      const { error } = await supabase
        .from('muted_conversations')
        .delete()
        .eq('user_id', user.id)
        .eq('conversation_id', conversationId)

      if (error) throw error

      setIsMuted(false)
      setMuteInfo(null)
      
      if (onMuteSuccess) {
        onMuteSuccess()
      }
      
      onClose()
    } catch (error) {
      console.error('Error unmuting conversation:', error)
      alert('Failed to unmute conversation: ' + (error?.message || 'Please try again.'))
    } finally {
      setMuting(false)
    }
  }

  const formatMuteExpiry = (mutedUntil) => {
    if (!mutedUntil) return 'Forever'
    const now = new Date()
    const expiry = new Date(mutedUntil)
    
    if (expiry <= now) return 'Expired'
    
    const diffMs = expiry.getTime() - now.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffDays > 0) {
      return `Until ${expiry.toLocaleDateString()}`
    } else if (diffHours > 0) {
      return `Until ${diffHours} hour${diffHours !== 1 ? 's' : ''} from now`
    } else {
      const diffMins = Math.floor(diffMs / (1000 * 60))
      return `Until ${diffMins} minute${diffMins !== 1 ? 's' : ''} from now`
    }
  }

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <Portal>
      <div 
        className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div 
          className="frosted-glass rounded-2xl shadow-2xl w-full max-w-md border border-slate-600"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-600">
            <h2 className="text-2xl font-bold gradient-text">
              {isMuted ? 'Unmute Conversation' : 'Mute Conversation'}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {isMuted ? (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="text-6xl mb-4">🔕</div>
                  <p className="text-slate-300 text-lg mb-2">
                    This conversation is muted
                  </p>
                  <p className="text-slate-400 text-sm">
                    {muteInfo?.muted_until 
                      ? `Muted ${formatMuteExpiry(muteInfo.muted_until)}`
                      : 'Muted forever'
                    }
                  </p>
                </div>
                
                <button
                  onClick={handleUnmute}
                  disabled={muting}
                  className="w-full frosted-glass btn-rounded text-white px-6 py-3 font-medium hover-lift transition-all duration-200 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {muting ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Unmuting...
                    </div>
                  ) : (
                    'Unmute Conversation'
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-slate-300 text-center mb-6">
                  Mute <span className="font-semibold text-white">{conversationName}</span> for how long?
                </p>
                
                <div className="space-y-2">
                  {durationOptions.map((option) => (
                    <button
                      key={option.label}
                      onClick={() => setSelectedDuration(option)}
                      className={`w-full px-4 py-3 rounded-xl transition-all duration-200 text-left ${
                        selectedDuration?.label === option.label
                          ? 'bg-blue-600 text-white border-2 border-blue-500'
                          : 'frosted-glass text-slate-300 hover:text-white hover:bg-slate-700 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{option.label}</span>
                        {selectedDuration?.label === option.label && (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={onClose}
                    disabled={muting}
                    className="flex-1 frosted-glass btn-rounded text-slate-300 px-6 py-2 font-medium hover-lift transition-all duration-200 hover:text-white disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleMute}
                    disabled={!selectedDuration || muting}
                    className="flex-1 frosted-glass btn-rounded text-white px-6 py-2 font-medium hover-lift transition-all duration-200 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {muting ? (
                      <div className="flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Muting...
                      </div>
                    ) : (
                      'Mute'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  )
}

export default MuteModal


