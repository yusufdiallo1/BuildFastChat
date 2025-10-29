import { useState, useRef, useEffect } from 'react'

function VoiceRecorder({ onRecordingComplete, onCancel }) {
  const [isRecording, setIsRecording] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [waveformData, setWaveformData] = useState([])
  const [hasPermission, setHasPermission] = useState(null)
  const [isLoading, setIsLoading] = useState(false) // Loading state for sending
  
  console.log('VoiceRecorder component loaded, isLoading:', isLoading)
  
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const timerRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const animationRef = useRef(null)

  useEffect(() => {
    // Request microphone permission
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        setHasPermission(true)
      })
      .catch(() => {
        setHasPermission(false)
      })

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      if (audioContextRef.current) audioContextRef.current.close()
      setIsLoading(false)
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
          channelCount: 1,
          volume: 1.0
        } 
      })
      
      // Set up audio context for waveform visualization
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      source.connect(analyserRef.current)

      // Set up media recorder with proper configuration for long recordings
      const options = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 64000 // Lower bitrate for longer recordings
      }

      // Fallback to other MIME types if WebM/Opus is not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          options.mimeType = 'audio/webm'
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options.mimeType = 'audio/mp4'
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          options.mimeType = 'audio/wav'
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          options.mimeType = 'audio/ogg'
        }
      }

      mediaRecorderRef.current = new MediaRecorder(stream, options)

      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: options.mimeType })
        const audioUrl = URL.createObjectURL(audioBlob)
        setAudioBlob(audioBlob)
        setAudioUrl(audioUrl)
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event.error)
        console.error('MediaRecorder state:', mediaRecorderRef.current.state)
        stopRecording()
      }

      mediaRecorderRef.current.onpause = () => {
        console.log('MediaRecorder paused')
      }

      mediaRecorderRef.current.onresume = () => {
        console.log('MediaRecorder resumed')
      }

      mediaRecorderRef.current.onstart = () => {
        console.log('MediaRecorder started successfully')
      }

      // Start recording with longer timeslice to prevent browser timeouts
      if (mediaRecorderRef.current.state === 'inactive') {
        // Use no timeslice parameter to prevent automatic stopping
        mediaRecorderRef.current.start()
        console.log('Starting MediaRecorder without timeslice to prevent auto-stop')
      } else {
        console.error('MediaRecorder not in inactive state:', mediaRecorderRef.current.state)
        throw new Error('MediaRecorder not ready to start')
      }
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1
          console.log('Recording time:', newTime, 'seconds')
          
          // Request data every 5 seconds to keep MediaRecorder active
          if (newTime % 5 === 0 && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            console.log('Requesting data to keep MediaRecorder active')
            mediaRecorderRef.current.requestData()
          }
          
          // Auto-stop at 10 minutes (600 seconds)
          if (newTime >= 600) {
            console.log('Reached 10 minute limit, stopping recording')
            stopRecording()
          }
          return newTime
        })
      }, 1000)

      // Start waveform animation
      animateWaveform()

    } catch (error) {
      console.error('Error starting recording:', error)
      setHasPermission(false)
    }
  }

  const stopRecording = () => {
    console.log('stopRecording called, isRecording:', isRecording)
    if (mediaRecorderRef.current && isRecording) {
      console.log('MediaRecorder state before stop:', mediaRecorderRef.current.state)
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsLocked(false)
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
        console.log('Timer cleared')
      }
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        console.log('Animation frame cancelled')
      }
    }
  }

  const toggleLock = () => {
    if (isRecording) {
      setIsLocked(!isLocked)
    }
  }

  const animateWaveform = () => {
    if (!analyserRef.current) return

    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    
    const updateWaveform = () => {
      if (!isRecording) return
      
      analyserRef.current.getByteFrequencyData(dataArray)
      
      // Create simplified waveform data (8 bars)
      const waveformBars = []
      const step = Math.floor(bufferLength / 8)
      
      for (let i = 0; i < 8; i++) {
        const start = i * step
        const end = start + step
        let sum = 0
        
        for (let j = start; j < end; j++) {
          sum += dataArray[j]
        }
        
        const average = sum / step
        waveformBars.push(Math.min(average / 128, 1)) // Normalize to 0-1
      }
      
      setWaveformData(waveformBars)
      animationRef.current = requestAnimationFrame(updateWaveform)
    }
    
    updateWaveform()
  }

  const handleSend = () => {
    if (audioBlob && !isLoading) {
      setIsLoading(true)
      onRecordingComplete(audioBlob, recordingTime)
    }
  }

  const handleCancel = () => {
    stopRecording()
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setIsLoading(false)
    onCancel()
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (hasPermission === false) {
    return (
      <div className="flex items-center justify-center p-4 bg-red-900/20 border border-red-500 rounded-lg">
        <div className="text-center">
          <svg className="w-8 h-8 text-red-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-red-400 text-sm">Microphone access denied</p>
          <p className="text-red-300 text-xs mt-1">Please enable microphone permissions to record voice messages</p>
        </div>
      </div>
    )
  }

  if (hasPermission === null) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
      {!isRecording && !audioBlob ? (
        // Initial state - show record button
        <div className="flex items-center justify-center space-x-4">
          <button
            onMouseDown={startRecording}
            onTouchStart={startRecording}
            className="w-12 h-12 frosted-glass btn-rounded flex items-center justify-center focus-ring"
          >
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </button>
          <div className="text-center">
            <p className="text-gray-300 text-sm">Hold to record</p>
            <p className="text-gray-400 text-xs">or tap to lock recording</p>
          </div>
        </div>
      ) : isRecording ? (
        // Recording state
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full animate-pulse ${
                recordingTime >= 540 ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <span className={`font-mono text-lg ${
                recordingTime >= 540 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {formatTime(recordingTime)}
              </span>
              {recordingTime >= 540 && (
                <span className="text-yellow-400 text-xs">Time limit approaching</span>
              )}
            </div>
            
            <button
              onClick={toggleLock}
              className={`px-3 py-1 frosted-glass btn-rounded text-xs font-medium ${
                isLocked 
                  ? 'text-indigo-300' 
                  : 'text-slate-300'
              }`}
            >
              {isLocked ? 'Locked' : 'Tap to Lock'}
            </button>
          </div>

          {/* Waveform visualization */}
          <div className="flex items-center justify-center space-x-1 h-8">
            {waveformData.map((height, index) => (
              <div
                key={index}
                className="bg-red-500 rounded-full transition-all duration-100"
                style={{
                  width: '3px',
                  height: `${Math.max(height * 24 + 4, 4)}px`,
                  opacity: 0.8
                }}
              />
            ))}
          </div>

          <div className="flex items-center justify-center space-x-4">
            <button
              onMouseUp={!isLocked ? stopRecording : undefined}
              onTouchEnd={!isLocked ? stopRecording : undefined}
              onMouseLeave={!isLocked ? stopRecording : undefined}
              onClick={isLocked ? stopRecording : undefined}
              className="w-12 h-12 frosted-glass btn-rounded flex items-center justify-center focus-ring"
            >
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
              </svg>
            </button>
            
            <button
              onClick={handleCancel}
              className="w-10 h-10 frosted-glass btn-rounded flex items-center justify-center focus-ring"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        // Playback state
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-300 font-mono text-lg">{formatTime(recordingTime)}</span>
            <span className="text-gray-400 text-sm">Voice message ready</span>
          </div>

          <audio controls className="w-full">
            <source src={audioUrl} type="audio/webm" />
            Your browser does not support the audio element.
          </audio>

          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="frosted-glass btn-rounded-lg text-white px-6 py-2 font-medium focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Sending...
                </>
              ) : (
                'Send Voice Message'
              )}
            </button>
            
            <button
              onClick={handleCancel}
              className="frosted-glass btn-rounded-lg text-white px-6 py-2 font-medium focus-ring"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default VoiceRecorder
