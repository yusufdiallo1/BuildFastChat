import { useState, useRef, useEffect } from 'react'

function VideoPlayer({ video, thumbnail, duration, messageId, onPlayStart, onPlayEnd, onDownload, onForward, onDelete, onCopyLink }) {
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showControls, setShowControls] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [loadTimeoutReached, setLoadTimeoutReached] = useState(false)
  const controlsTimeoutRef = useRef(null)
  const menuRef = useRef(null)
  const loadTimeoutRef = useRef(null)

  // Lazy load video - only load when visible or when user clicks to play
  // Also pause when scrolled out of view for performance
  useEffect(() => {
    if (!containerRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const videoEl = videoRef.current
          
          // Load video when it becomes visible (with 100px margin)
          if (entry.isIntersecting) {
            setShouldLoad(true)
            // Preload metadata only (fast)
            if (videoEl && !videoLoaded) {
              videoEl.preload = 'metadata'
            }
          } else {
            // Pause video when scrolled out of view (save resources)
            if (videoEl && isPlaying) {
              videoEl.pause()
              setIsPlaying(false)
            }
          }
        })
      },
      {
        rootMargin: '100px', // Start loading 100px before video enters viewport
        threshold: 0.1
      }
    )

    observer.observe(containerRef.current)

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current)
      }
    }
  }, [isPlaying, videoLoaded])

  // Load video source only when needed (user clicks play or video is visible)
  // Optimized for fast loading (target: <15 seconds)
  useEffect(() => {
    const videoEl = videoRef.current
    if (!videoEl || !shouldLoad) return

    // Only set src when needed to avoid unnecessary downloads
    if (!videoLoaded && shouldLoad) {
      // Start with aggressive preload for fast playback
      videoEl.preload = 'auto' // Change to 'auto' for faster loading
      videoEl.src = video
      
      // Enable range requests for better streaming
      videoEl.crossOrigin = 'anonymous'
      
      // Set buffer size for faster playback start
      if (videoEl.buffered) {
        // Request larger buffer for smoother playback
        videoEl.playbackRate = 1.0
      }
      
      // Load immediately
      videoEl.load()
      setVideoLoaded(true)
      
      // Set 15-second timeout for loading
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current)
      }
      
      loadTimeoutRef.current = setTimeout(() => {
        setLoadTimeoutReached(true)
        console.warn('Video loading exceeded 15 seconds - optimizing for faster playback')
        // Force video to start loading more aggressively
        if (videoEl && videoEl.readyState < 2) {
          videoEl.preload = 'auto'
          videoEl.load()
        }
      }, 15000) // 15 second timeout
      
      // Start playback immediately when enough data is buffered (streaming)
    const handleCanPlayThrough = () => {
      setIsLoading(false)
      setLoadTimeoutReached(false)
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current)
      }
    }
    
    const handleProgress = () => {
      // Track buffering progress
      if (videoEl.buffered.length > 0) {
        const bufferedEnd = videoEl.buffered.end(videoEl.buffered.length - 1)
        const duration = videoEl.duration
        if (duration > 0) {
          const bufferedPercent = (bufferedEnd / duration) * 100
          // If we have enough buffered (5 seconds or 5%), we're ready
          if (bufferedEnd >= 5 || bufferedPercent >= 5) {
            setIsLoading(false)
          }
        }
      }
    }
      
      // Start loading data immediately for fast playback - use canplay (not canplaythrough)
      // This allows playback to start as soon as some data is available
      const handleCanPlay = () => {
        setIsLoading(false)
        setLoadTimeoutReached(false)
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current)
        }
        // Video can start playing now - don't wait for full buffer
      }
      
      const handleLoadedMetadata = () => {
        setIsLoading(false)
        setLoadTimeoutReached(false)
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current)
        }
      }
      
      // Use canplay for fastest possible playback start (don't wait for full buffer)
      videoEl.addEventListener('canplay', handleCanPlay, { once: true })
      videoEl.addEventListener('canplaythrough', handleCanPlayThrough, { once: true })
      videoEl.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true })
    }

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current)
      }
    }
  }, [shouldLoad, video, videoLoaded, isLoading])

  useEffect(() => {
    const videoEl = videoRef.current
    if (!videoEl) return

    const handleLoadedMetadata = () => {
      setIsLoading(false)
      setLoadTimeoutReached(false)
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current)
      }
      if (videoEl) {
        videoEl.volume = volume
      }
    }

    const handleLoadedData = () => {
      setIsLoading(false)
      setLoadTimeoutReached(false)
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current)
      }
    }

    const handleCanPlay = () => {
      setIsLoading(false)
      setLoadTimeoutReached(false)
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current)
      }
      // Video ready to play - start buffering more aggressively for smooth playback
      if (videoEl.preload !== 'auto') {
        videoEl.preload = 'auto'
      }
    }
    
    const handleProgress = () => {
      // Track buffering progress
      if (videoEl.buffered.length > 0) {
        const bufferedEnd = videoEl.buffered.end(videoEl.buffered.length - 1)
        const duration = videoEl.duration
        if (duration > 0) {
          const bufferedPercent = (bufferedEnd / duration) * 100
          // If we have enough buffered (5 seconds or 5%), we're ready
          if (bufferedEnd >= 5 || bufferedPercent >= 5) {
            setIsLoading(false)
          }
        }
      }
    }

    const handleWaiting = () => {
      setIsLoading(true)
    }

    const handleTimeUpdate = () => setCurrentTime(videoEl.currentTime)
    const handlePlay = () => {
      setIsPlaying(true)
      
      // Ensure video starts playing quickly
      const playPromise = videoEl.play()
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Video playing
            // Switch to full preload when playing
            if (videoEl.preload !== 'auto') {
              videoEl.preload = 'auto'
            }
            // Start buffering more aggressively
            videoEl.preload = 'auto'
          })
          .catch((error) => {
            console.log('Auto-play prevented:', error)
          })
      }
      
      // Notify parent component
      if (onPlayStart && messageId) {
        onPlayStart(messageId)
      }
    }
    const handlePause = () => {
      setIsPlaying(false)
      if (onPlayEnd && messageId) {
        onPlayEnd(messageId)
      }
    }
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
      if (onPlayEnd && messageId) {
        onPlayEnd(messageId)
      }
    }
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    videoEl.addEventListener('loadedmetadata', handleLoadedMetadata)
    videoEl.addEventListener('loadeddata', handleLoadedData)
    videoEl.addEventListener('canplay', handleCanPlay)
    videoEl.addEventListener('canplaythrough', handleCanPlayThrough)
    videoEl.addEventListener('waiting', handleWaiting)
    videoEl.addEventListener('progress', handleProgress)
    videoEl.addEventListener('timeupdate', handleTimeUpdate)
    videoEl.addEventListener('play', handlePlay)
    videoEl.addEventListener('pause', handlePause)
    videoEl.addEventListener('ended', handleEnded)
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    // Auto-hide controls
    const handleMouseMove = () => {
      setShowControls(true)
      clearTimeout(controlsTimeoutRef.current)
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) setShowControls(false)
      }, 2000)
    }

    document.addEventListener('mousemove', handleMouseMove)

    return () => {
      videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata)
      videoEl.removeEventListener('loadeddata', handleLoadedData)
      videoEl.removeEventListener('canplay', handleCanPlay)
      videoEl.removeEventListener('canplaythrough', handleCanPlayThrough)
      videoEl.removeEventListener('waiting', handleWaiting)
      videoEl.removeEventListener('progress', handleProgress)
      videoEl.removeEventListener('timeupdate', handleTimeUpdate)
      videoEl.removeEventListener('play', handlePlay)
      videoEl.removeEventListener('pause', handlePause)
      videoEl.removeEventListener('ended', handleEnded)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('mousemove', handleMouseMove)
      clearTimeout(controlsTimeoutRef.current)
    }
  }, [isPlaying, volume, messageId, onPlayStart, onPlayEnd])

  // Listen for pause events from other videos (concurrent limit)
  useEffect(() => {
    const handlePauseEvent = (e) => {
      if (e.detail?.messageId === messageId && isPlaying) {
        const videoEl = videoRef.current
        if (videoEl) {
          videoEl.pause()
          setIsPlaying(false)
        }
      }
    }

    document.addEventListener('pauseVideo', handlePauseEvent)
    return () => document.removeEventListener('pauseVideo', handlePauseEvent)
  }, [messageId, isPlaying])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('click', handleClickOutside)
    }

    return () => document.removeEventListener('click', handleClickOutside)
  }, [showMenu])

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handlePlayPause = () => {
    const videoEl = videoRef.current
    if (!videoEl) return

    // Ensure video is loaded before playing - optimized for speed
    if (!videoLoaded || !videoEl.src) {
      setShouldLoad(true)
      setVideoLoaded(true)
      videoEl.src = video
      videoEl.preload = 'auto' // Full preload for instant playback
      videoEl.crossOrigin = 'anonymous' // Enable range requests
      
      // Load immediately
      videoEl.load()
      
      // Set loading to false once metadata loads
      const handleReady = () => {
        setIsLoading(false)
        // Attempt to start playback immediately
        if (!isPlaying) {
          videoEl.play().catch(() => {
            // Auto-play might be blocked
          })
        }
      }
      
      if (videoEl.readyState >= 2) {
        handleReady()
      } else {
        videoEl.addEventListener('canplay', handleReady, { once: true })
      }
    }

    if (isPlaying) {
      videoEl.pause()
    } else {
      // Optimize for fast playback start
      const playPromise = videoEl.play()
      
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.error('Error playing video:', err)
        })
      }
    }
  }

  const handleSeek = (e) => {
    const videoEl = videoRef.current
    if (!videoEl) return

    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    videoEl.currentTime = percent * videoEl.duration
  }

  const handleVolumeChange = (e) => {
    const videoEl = videoRef.current
    if (!videoEl) return

    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    const newVolume = Math.max(0, Math.min(1, percent))
    setVolume(newVolume)
    videoEl.volume = newVolume
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    const videoEl = videoRef.current
    if (!videoEl) return

    if (isMuted) {
      videoEl.volume = volume || 0.5
      setIsMuted(false)
    } else {
      videoEl.volume = 0
      setIsMuted(true)
    }
  }

  const toggleFullscreen = () => {
    const videoEl = videoRef.current?.parentElement
    if (!videoEl) return

    if (!document.fullscreenElement) {
      videoEl.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen()
    }
  }

    const handleKeyDown = (e) => {
    const videoEl = videoRef.current
    if (!videoEl) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
        handlePlayPause()
          break
        case 'ArrowLeft':
          e.preventDefault()
        videoEl.currentTime = Math.max(0, videoEl.currentTime - 5)
          break
        case 'ArrowRight':
          e.preventDefault()
        videoEl.currentTime = Math.min(videoEl.duration, videoEl.currentTime + 5)
          break
        case 'ArrowUp':
          e.preventDefault()
        const newVolume = Math.min(1, videoEl.volume + 0.1)
        videoEl.volume = newVolume
        setVolume(newVolume)
        setIsMuted(false)
          break
        case 'ArrowDown':
          e.preventDefault()
        const lowerVolume = Math.max(0, videoEl.volume - 0.1)
        videoEl.volume = lowerVolume
        setVolume(lowerVolume)
        setIsMuted(lowerVolume === 0)
          break
        case 'f':
        case 'F':
        e.preventDefault()
          toggleFullscreen()
          break
        case 'm':
        case 'M':
        e.preventDefault()
          toggleMute()
          break
        case 'Escape':
        if (document.fullscreenElement) {
          document.exitFullscreen()
          }
          break
      }
    }

  const handleDownload = () => {
    if (onDownload) {
      onDownload(video)
    } else {
      window.open(video, '_blank')
    }
  }

  const handleCopyLink = () => {
    if (onCopyLink) {
      onCopyLink(video)
    } else {
      navigator.clipboard.writeText(video)
      alert('Video link copied to clipboard')
    }
  }

  const handleForward = () => {
    onForward?.()
  }

  const handleDelete = () => {
    onDelete?.()
  }

  return (
    <div
      ref={containerRef}
      className="relative rounded-lg overflow-hidden bg-black group max-w-md"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{ maxWidth: '400px' }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={shouldLoad ? video : undefined}
        poster={thumbnail} // Use thumbnail as poster for instant display
        preload={shouldLoad ? "auto" : "none"} // Aggressive preload when visible for fast playback
        playsInline // Better mobile performance
        loading="lazy" // Browser-level lazy loading
        decoding="async" // Async decoding for better performance
        crossOrigin="anonymous" // Enable range requests for streaming
        className="w-full h-auto"
        onClick={handlePlayPause}
        style={{ display: videoLoaded || shouldLoad ? 'block' : 'none' }}
      />

      {/* Loading Skeleton with timeout warning */}
      {isLoading && !thumbnail && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800 animate-pulse">
          <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center mb-2">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          {loadTimeoutReached && (
            <p className="text-xs text-white/70 mt-2">Loading taking longer than expected...</p>
          )}
        </div>
      )}

      {/* Thumbnail Overlay (when not playing or not loaded) */}
      {(!isPlaying || !videoLoaded) && thumbnail && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={handlePlayPause}
          style={{ 
            backgroundImage: `url(${thumbnail})`, 
            backgroundSize: 'cover', 
            backgroundPosition: 'center',
            display: videoLoaded && isPlaying ? 'none' : 'flex'
          }}
        >
          <div className="absolute inset-0 bg-black/30" />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          {!isLoading && (
            <div className="relative w-16 h-16 rounded-full bg-white/90 flex items-center justify-center hover:scale-110 transition-transform">
              <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--primary)' }}>
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          )}
        </div>
      )}

      {/* Duration Badge */}
      {duration && (
        <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 text-white text-xs font-mono">
          {formatTime(duration)}
        </div>
      )}

      {/* Menu Button */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-8 h-8 rounded-full bg-black/70 flex items-center justify-center text-white"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
        </button>

        {/* Context Menu */}
        {showMenu && (
          <div
            ref={menuRef}
            className="absolute top-10 right-0 frosted-glass rounded-lg border shadow-lg py-1 z-50"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', minWidth: '180px' }}
          >
            <button
              onClick={handleDownload}
              className="w-full px-4 py-2 text-left text-sm transition-colors hover:bg-opacity-50"
              style={{ color: 'var(--text-primary)' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--surface-light)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              Download Video
            </button>
            <button
              onClick={() => window.open(video, '_blank')}
              className="w-full px-4 py-2 text-left text-sm transition-colors"
              style={{ color: 'var(--text-primary)' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--surface-light)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              Open in New Tab
            </button>
            <button
              onClick={handleCopyLink}
              className="w-full px-4 py-2 text-left text-sm transition-colors"
              style={{ color: 'var(--text-primary)' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--surface-light)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              Copy Video Link
            </button>
            {onForward && (
              <button
                onClick={handleForward}
                className="w-full px-4 py-2 text-left text-sm transition-colors"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--surface-light)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                Forward Video
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                className="w-full px-4 py-2 text-left text-sm transition-colors"
                style={{ color: 'var(--error)' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--surface-light)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                Delete Video
              </button>
            )}
          </div>
        )}
      </div>

      {/* Custom Controls */}
      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
            {/* Seek Bar */}
          <div className="mb-2">
            <div
              className="h-1 rounded-full cursor-pointer"
              style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}
              onClick={handleSeek}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(currentTime / (videoRef.current?.duration || 1)) * 100}%`,
                  backgroundColor: 'var(--primary)'
                }}
              />
            </div>
            </div>

          {/* Control Bar */}
            <div className="flex items-center space-x-3">
              <button
              onClick={handlePlayPause}
                className="text-white hover:text-gray-300 transition-colors"
              >
                {isPlaying ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <span className="text-white text-sm font-mono">
              {formatTime(currentTime)} / {formatTime(videoRef.current?.duration || 0)}
              </span>

            <div className="flex-1" />

                <button
              onClick={toggleMute}
                  className="text-white hover:text-gray-300 transition-colors"
                >
                  {isMuted || volume === 0 ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38.31 2.63.95 3.69 1.81L19 20.27 20.27 19l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                    </svg>
                  ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    </svg>
                  )}
                </button>

            <div
              className="w-20 h-1 rounded-full cursor-pointer"
              style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}
              onClick={handleVolumeChange}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(isMuted ? 0 : volume) * 100}%`,
                  backgroundColor: 'white'
                }}
              />
              </div>

              <select
                value={playbackRate}
              onChange={(e) => {
                const rate = parseFloat(e.target.value)
                setPlaybackRate(rate)
                if (videoRef.current) {
                  videoRef.current.playbackRate = rate
                }
              }}
              className="px-2 py-1 rounded text-sm bg-black/50 text-white border-none"
                onClick={(e) => e.stopPropagation()}
              >
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1">1x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
              </select>

              <button
              onClick={toggleFullscreen}
              className="text-white hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default VideoPlayer
