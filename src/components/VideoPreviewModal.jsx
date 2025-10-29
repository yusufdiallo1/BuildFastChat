import { useState, useRef, useEffect } from 'react'

function VideoPreviewModal({ video, isOpen, onClose, onSend, onCompress }) {
  const videoRef = useRef(null)
  const [message, setMessage] = useState('')
  const [isCompressing, setIsCompressing] = useState(false)
  const [compressedVideo, setCompressedVideo] = useState(null)
  const [compressionRatio, setCompressionRatio] = useState(null)

  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.load()
    }
  }, [isOpen, video])

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 MB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getResolution = (width, height) => {
    if (!width || !height) return 'Unknown'
    if (height >= 1080) return '1080p'
    if (height >= 720) return '720p'
    if (height >= 480) return '480p'
    return '360p'
  }

  const handleCompress = async () => {
    if (!video || !video.url) return

    setIsCompressing(true)
    try {
      // In a real implementation, this would use ffmpeg.js or server-side compression
      // For now, we'll just simulate it
      const compressed = {
        ...video,
        compressed: true
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate compression
      
      setCompressedVideo(compressed)
      setCompressionRatio(`${formatFileSize(video.size)} → ${formatFileSize(video.size * 0.6)}`)
      onCompress?.(compressed)
    } catch (error) {
      console.error('Error compressing video:', error)
      alert('Failed to compress video')
    } finally {
      setIsCompressing(false)
    }
  }

  const handleSend = () => {
    const videoToSend = compressedVideo || video
    onSend?.(message.trim(), videoToSend)
    setMessage('')
    setCompressedVideo(null)
    setCompressionRatio(null)
  }

  if (!isOpen || !video) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/50" onClick={onClose}>
      <div
        className="frosted-glass rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Video Preview
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
        </div>

        {/* Video Player */}
        <div className="p-6">
          <div className="relative mb-4 rounded-lg overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
            <video
              ref={videoRef}
              src={video.url}
              poster={video.thumbnail}
              controls
              preload="metadata"
              className="w-full h-full"
              style={{ maxHeight: '600px' }}
            />
          </div>

          {/* Video Details */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Filename: </span>
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{video.filename || 'video.mp4'}</span>
            </div>
            <div>
              <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Duration: </span>
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{formatDuration(video.duration)}</span>
            </div>
            <div>
              <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Size: </span>
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{formatFileSize(video.size)}</span>
            </div>
            <div>
              <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Resolution: </span>
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                {getResolution(video.width, video.height)}
              </span>
            </div>
          </div>

          {/* Compression Options */}
          <div className="mb-4 p-4 rounded-lg border" style={{ backgroundColor: 'var(--surface-light)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Compress video for faster sending
              </label>
              <button
                onClick={handleCompress}
                disabled={isCompressing || compressedVideo}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: compressedVideo ? 'var(--accent)' : 'var(--primary)',
                  color: 'white'
                }}
              >
                {isCompressing ? 'Compressing...' : compressedVideo ? 'Compressed' : 'Compress'}
              </button>
            </div>
            {compressionRatio && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {compressionRatio}
              </p>
            )}
          </div>

          {/* Message Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Add a message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Type a message..."
              className="w-full px-4 py-2 rounded-lg border resize-none"
              style={{
                backgroundColor: 'var(--surface-light)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--surface-light)', color: 'var(--text-primary)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              className="px-6 py-2 rounded-lg font-medium transition-colors"
              style={{ backgroundColor: 'var(--primary)', color: 'white' }}
            >
              Send Video
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VideoPreviewModal

