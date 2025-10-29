import { useEffect, useRef } from 'react'

const VoiceCallModal = ({
  callState, // 'calling', 'incoming', 'active'
  otherUser,
  isMuted,
  callDuration,
  connectionError,
  onAccept,
  onReject,
  onEnd,
  onToggleMute
}) => {
  const callingAudioRef = useRef(null)
  const incomingAudioRef = useRef(null)

  // Play calling/incoming ringtone
  useEffect(() => {
    if (callState === 'calling' || callState === 'incoming') {
      // Create a simple beep ringtone using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      let oscillator = null
      let gainNode = null

      const playRingtone = () => {
        oscillator = audioContext.createOscillator()
        gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        oscillator.frequency.value = 800
        oscillator.type = 'sine'
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.5)
      }

      const ringInterval = setInterval(playRingtone, 1500)

      return () => {
        clearInterval(ringInterval)
        if (oscillator) oscillator.stop()
      }
    }
  }, [callState])

  // Format duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // Parse duration string
  const parseDuration = (durationStr) => {
    const parts = durationStr.split(':')
    return parseInt(parts[0]) * 60 + parseInt(parts[1] || 0)
  }

  const getInitials = (name) => {
    if (!name) return 'U'
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  if (!callState || !otherUser) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 backdrop-blur-md">
      <div className="w-full max-w-md mx-4 flex flex-col items-center justify-center">
        
        {/* Profile Picture */}
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-full bg-blue-500 opacity-20 animate-pulse"></div>
          {otherUser.profilePicture ? (
            <img
              src={otherUser.profilePicture}
              alt={otherUser.name}
              className="relative w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-white shadow-2xl"
            />
          ) : (
            <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-r from-indigo-500 to-pink-500 flex items-center justify-center border-4 border-white shadow-2xl">
              <span className="text-white font-bold text-4xl md:text-5xl">
                {getInitials(otherUser.name)}
              </span>
            </div>
          )}
          {/* Pulsing ring effect */}
          <div className="absolute inset-0 rounded-full border-4 border-blue-400 animate-ping opacity-75"></div>
        </div>

        {/* User Name */}
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 text-center">
          {otherUser.name}
        </h2>

        {/* Status Text */}
        <div className="text-gray-300 text-lg mb-8 text-center">
          {callState === 'calling' && (
            <div className="flex items-center justify-center space-x-2">
              <span>Calling</span>
              <span className="flex space-x-1">
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
              </span>
            </div>
          )}
          {callState === 'incoming' && (
            <span>Incoming voice call...</span>
          )}
          {callState === 'active' && (
            <>
              <span className="text-green-400">Connected</span>
              <div className="text-3xl md:text-4xl font-mono font-bold text-white mt-4">
                {callDuration || '00:00'}
              </div>
            </>
          )}
        </div>

        {/* Error Message */}
        {connectionError && (
          <div className="bg-red-600 text-white px-4 py-2 rounded-lg mb-4 text-center max-w-sm">
            {connectionError}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-center space-x-6 md:space-x-8">
          {callState === 'incoming' && (
            <>
              {/* Accept Button */}
              <button
                onClick={onAccept}
                className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center shadow-lg transform hover:scale-110 transition-all duration-300"
                title="Accept call"
              >
                <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>

              {/* Reject Button */}
              <button
                onClick={onReject}
                className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-lg transform hover:scale-110 transition-all duration-300"
                title="Decline call"
              >
                <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          )}

          {callState === 'calling' && (
            <>
              {/* End Call Button */}
              <button
                onClick={onEnd}
                className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-lg transform hover:scale-110 transition-all duration-300"
                title="End call"
              >
                <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>
            </>
          )}

          {callState === 'active' && (
            <>
              {/* Mute Button */}
              <button
                onClick={onToggleMute}
                className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-all duration-300 ${
                  isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <svg className="w-6 h-6 md:w-7 md:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 md:w-7 md:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </button>

              {/* End Call Button */}
              <button
                onClick={onEnd}
                className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-lg transform hover:scale-110 transition-all duration-300"
                title="End call"
              >
                <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Muted indicator */}
        {callState === 'active' && isMuted && (
          <div className="mt-6 text-yellow-400 text-sm flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>You are muted</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default VoiceCallModal

