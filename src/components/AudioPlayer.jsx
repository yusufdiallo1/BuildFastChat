import { useState, useRef, useEffect } from 'react'

function AudioPlayer({ audioUrl, duration, isSent = false }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [waveformData, setWaveformData] = useState([])
  const audioRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const animationRef = useRef(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    const handleLoadStart = () => {
      setIsLoading(true)
    }

    const handleCanPlay = () => {
      setIsLoading(false)
      generateWaveform()
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('canplay', handleCanPlay)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('canplay', handleCanPlay)
    }
  }, [audioUrl])

  const generateWaveform = async () => {
    try {
      const audio = audioRef.current
      if (!audio) return

      // Create audio context for waveform analysis
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      const source = audioContextRef.current.createMediaElementSource(audio)
      analyserRef.current = audioContextRef.current.createAnalyser()
      
      analyserRef.current.fftSize = 256
      analyserRef.current.smoothingTimeConstant = 0.8
      source.connect(analyserRef.current)
      analyserRef.current.connect(audioContextRef.current.destination)

      // Generate waveform data
      const bufferLength = analyserRef.current.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      
      // Create simplified waveform (20 bars)
      const waveformBars = []
      const step = Math.floor(bufferLength / 20)
      
      for (let i = 0; i < 20; i++) {
        const start = i * step
        const end = start + step
        let sum = 0
        
        for (let j = start; j < end; j++) {
          sum += dataArray[j]
        }
        
        const average = sum / step
        waveformBars.push(Math.max(average / 128, 0.1)) // Normalize to 0.1-1
      }
      
      setWaveformData(waveformBars)
    } catch (error) {
      console.error('Error generating waveform:', error)
      // Fallback: create a simple static waveform
      setWaveformData(Array(20).fill(0.5))
    }
  }

  const togglePlayPause = (e) => {
    e.stopPropagation() // Prevent triggering parent click handlers
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play()
      setIsPlaying(true)
    }
  }

  const handleSeek = (e) => {
    const audio = audioRef.current
    if (!audio) return

    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const width = rect.width
    const newTime = (clickX / width) * duration

    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className={`flex items-center space-x-3 p-3 rounded-lg glass hover-lift ${
      isSent 
        ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white' 
        : 'bg-slate-700 text-slate-100'
    }`}>
      {/* Play/Pause Button */}
      <button
        onClick={togglePlayPause}
        disabled={isLoading}
        className={`w-8 h-8 frosted-glass btn-rounded flex items-center justify-center focus-ring ${
          isLoading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
        ) : isPlaying ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
          </svg>
        ) : (
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        )}
      </button>

      {/* Waveform Visualization */}
      <div className="flex items-center space-x-1 h-8 flex-1">
        {waveformData.length > 0 ? (
          waveformData.map((height, index) => (
            <div
              key={index}
              className={`rounded-full transition-all duration-100 ${
                isSent ? 'bg-white' : 'bg-gray-300'
              }`}
              style={{
                width: '3px',
                height: `${Math.max(height * 24 + 4, 4)}px`,
                opacity: 0.8
              }}
            />
          ))
        ) : (
          // Fallback waveform while loading
          Array(20).fill(0).map((_, index) => (
            <div
              key={index}
              className={`rounded-full transition-all duration-100 ${
                isSent ? 'bg-white' : 'bg-gray-300'
              }`}
              style={{
                width: '3px',
                height: `${Math.random() * 20 + 4}px`,
                opacity: 0.6
              }}
            />
          ))
        )}
      </div>

      {/* Duration Badge */}
      <div className={`px-2 py-1 rounded text-xs font-mono ${
        isSent 
          ? 'bg-indigo-700 text-indigo-100' 
          : 'bg-slate-600 text-slate-300'
      }`}>
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
      />
    </div>
  )
}

export default AudioPlayer
