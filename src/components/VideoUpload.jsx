import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const MAX_VIDEO_SIZE = 1500 * 1024 * 1024 // 1500MB (1.5GB)
const ACCEPTED_FORMATS = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.mp3']

function VideoUpload({ onVideoSelect, onUploadStart, onUploadComplete, onUploadError }) {
  const fileInputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadQueue, setUploadQueue] = useState([])
  const { user } = useAuth()

  const validateVideo = (file) => {
    // Check file size
    if (file.size > MAX_VIDEO_SIZE) {
      return { valid: false, error: 'Video must be under 1500MB (1.5GB)' }
    }

    // Check file extension
    const extension = '.' + file.name.split('.').pop().toLowerCase()
    if (!ACCEPTED_FORMATS.includes(extension)) {
      return { valid: false, error: 'Unsupported format. Use MP4, MOV, AVI, WEBM, MKV, or MP3' }
    }

    // Check MIME type
    const validMimeTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska', 'audio/mp3', 'audio/mpeg', 'audio/mp4']
    if (!validMimeTypes.includes(file.type)) {
      // Still allow if extension is valid (some browsers don't set MIME correctly)
      if (!ACCEPTED_FORMATS.includes(extension)) {
        return { valid: false, error: 'Invalid video/audio format' }
      }
    }

    return { valid: true }
  }

  const handleFileSelect = async (files) => {
    // Accept both video and audio files
    const videoFiles = Array.from(files).filter(file => 
      file.type.startsWith('video/') || file.type.startsWith('audio/') || 
      ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.mp3'].some(ext => file.name.toLowerCase().endsWith(ext))
    )
    
    if (videoFiles.length === 0) return

    // Validate all files
    for (const file of videoFiles) {
    const validation = validateVideo(file)
    if (!validation.valid) {
      alert(validation.error)
      return
    }
    }

    // Add to queue
    setUploadQueue(prev => [...prev, ...videoFiles])
    
    // Process queue
    for (const file of videoFiles) {
      await uploadVideo(file)
    }
  }

  const uploadVideo = async (file) => {
    if (!user) return

    setIsUploading(true)
    onUploadStart?.()

    try {
      // Create video/audio element to get metadata
      let metadata = { duration: 0, width: 0, height: 0 }
      
      // For audio files (MP3), use audio element
      if (file.type.startsWith('audio/') || file.name.toLowerCase().endsWith('.mp3')) {
        const audio = document.createElement('audio')
        audio.preload = 'metadata'
        
        const metadataPromise = new Promise((resolve, reject) => {
          audio.onloadedmetadata = () => {
            resolve({
              duration: audio.duration,
              width: 0,
              height: 0
            })
          }
          audio.onerror = reject
          audio.src = URL.createObjectURL(file)
        })
        
        metadata = await metadataPromise
      } else {
        // For video files, use video element
    const video = document.createElement('video')
    video.preload = 'metadata'
        
        const metadataPromise = new Promise((resolve, reject) => {
          video.onloadedmetadata = () => {
            resolve({
              duration: video.duration,
              width: video.videoWidth,
              height: video.videoHeight
            })
          }
          video.onerror = reject
    video.src = URL.createObjectURL(file)
        })
        
        metadata = await metadataPromise
      }

      // Upload to storage (use voice-messages bucket as fallback if videos bucket doesn't exist)
      const fileName = `video-${Date.now()}-${Math.random().toString(36).substring(2)}.${file.name.split('.').pop()}`
      const filePath = `${user.id}/${fileName}`

      let bucketName = 'videos'
      let uploadData = null
      let uploadError = null
      
      // Optimized upload for large files - Supabase handles large files well
      const uploadResult = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '31536000', // 1 year cache for better performance
          upsert: false,
          contentType: file.type,
          onUploadProgress: (progress) => {
            if (progress.total > 0) {
              const percent = (progress.loaded / progress.total) * 100
              setUploadProgress(percent)
            }
          }
        })
      
      uploadData = uploadResult.data
      uploadError = uploadResult.error

      // If bucket not found, try to use chat-images (but warn about size limit)
      // Note: We can't use voice-messages because it only accepts audio MIME types
      if (uploadError && (uploadError.message?.includes('not found') || uploadError.message?.includes('Bucket not found'))) {
        // Check file size - chat-images has 5MB limit
        if (file.size > 5 * 1024 * 1024) {
          throw new Error('Video file too large for temporary storage. Please create a "videos" bucket in Supabase Storage with a 1500MB limit and allow video MIME types (video/mp4, video/quicktime, video/webm, etc.)')
        }
        
        console.warn('Videos bucket not found, using chat-images bucket as temporary fallback (5MB limit)')
        bucketName = 'chat-images'
        const uploadResult = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            onUploadProgress: (progress) => {
              const percent = (progress.loaded / progress.total) * 100
              setUploadProgress(percent)
            }
          })
        uploadData = uploadResult.data
        uploadError = uploadResult.error
      }

      // Handle MIME type errors
      if (uploadError && uploadError.message?.includes('mime type') && uploadError.message?.includes('not supported')) {
        throw new Error('Video format not supported by storage bucket. Please create a "videos" bucket in Supabase Storage with a 1500MB limit and allow video MIME types: video/mp4, video/quicktime, video/webm, video/x-msvideo, video/x-matroska')
      }

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath)

      // Generate thumbnail from first frame
      const thumbnail = await generateThumbnail(file, metadata)

      // Upload thumbnail to video-thumbnails bucket
      const thumbnailFileName = `thumb-${fileName.split('.')[0]}.jpg`
      const thumbnailPath = `${user.id}/${thumbnailFileName}`
      
      let thumbBucketName = 'video-thumbnails'
      let thumbError = null
      let { error: uploadThumbError } = await supabase.storage
        .from(thumbBucketName)
        .upload(thumbnailPath, thumbnail, {
          cacheControl: '31536000', // 1 year cache
          upsert: false,
          contentType: 'image/jpeg'
        })
      
      thumbError = uploadThumbError

      // Fallback to videos bucket if video-thumbnails bucket doesn't exist
      if (thumbError && (thumbError.message?.includes('not found') || thumbError.message?.includes('Bucket not found'))) {
        console.warn('Video-thumbnails bucket not found, using videos bucket as fallback')
        thumbBucketName = 'videos'
        const thumbResult = await supabase.storage
          .from(thumbBucketName)
          .upload(thumbnailPath, thumbnail, {
            cacheControl: '31536000',
            upsert: false,
            contentType: 'image/jpeg'
          })
        thumbError = thumbResult.error
      }

      const thumbnailUrl = thumbError ? null : supabase.storage
        .from(thumbBucketName)
        .getPublicUrl(thumbnailPath).data.publicUrl

      const videoData = {
        url: publicUrl,
        path: filePath,
        filename: fileName,
        size: file.size,
        type: file.type,
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        thumbnail: thumbnailUrl
      }

      // Remove from queue
      setUploadQueue(prev => prev.filter(f => f !== file))
      setUploadProgress(0)
      
      onVideoSelect?.(videoData)
      onUploadComplete?.()
    } catch (error) {
      console.error('Error uploading video:', error)
      setUploadQueue(prev => prev.filter(f => f !== file))
      setUploadProgress(0)
      onUploadError?.(error)
      
      // Provide helpful error message
      let errorMessage = error?.message || 'Please try again.'
      if (errorMessage.includes('mime type') || errorMessage.includes('not supported')) {
        errorMessage = 'Video format not supported. Please create a "videos" bucket in Supabase Dashboard:\n\n1. Go to Storage\n2. Create bucket: "videos"\n3. Set public access\n4. Add MIME types: video/mp4, video/quicktime, video/webm, video/x-msvideo, video/x-matroska\n5. Set file size limit: 1500MB'
      }
      
      alert('Failed to upload video: ' + errorMessage)
    } finally {
      setIsUploading(false)
    }
  }

  const generateThumbnail = (file, metadata) => {
    return new Promise((resolve, reject) => {
      // For audio files, create a simple waveform or placeholder
      if (file.type.startsWith('audio/') || file.name.toLowerCase().endsWith('.mp3')) {
        // Create a simple audio waveform placeholder
        const canvas = document.createElement('canvas')
        canvas.width = 400
        canvas.height = 200
        const ctx = canvas.getContext('2d')
        
        // Draw a simple audio waveform visualization
        ctx.fillStyle = '#6366f1'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = '#ffffff'
        ctx.font = '24px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('🎵 Audio', canvas.width / 2, canvas.height / 2 - 10)
        ctx.font = '14px Arial'
        ctx.fillText('MP3', canvas.width / 2, canvas.height / 2 + 15)
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to generate thumbnail'))
          }
        }, 'image/jpeg', 0.8)
        return
      }
      
      // For video files, extract first frame
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      video.onloadeddata = () => {
        // Seek to first frame
        video.currentTime = 0.1
      }

      video.onseeked = () => {
        try {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to generate thumbnail'))
            }
          }, 'image/jpeg', 0.8)
        } catch (error) {
          reject(error)
        }
      }

      video.onerror = reject
      video.src = URL.createObjectURL(file)
    })
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files)
    }
  }

  const cancelUpload = () => {
    setUploadQueue([])
    setUploadProgress(0)
    setIsUploading(false)
    onUploadError?.(new Error('Upload cancelled'))
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,audio/mp3,audio/mpeg,audio/mp4,.mp4,.mov,.avi,.webm,.mkv,.mp3"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <button
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        disabled={isUploading}
        className="w-12 h-12 frosted-glass btn-rounded flex items-center justify-center focus-ring transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'}
          onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
          title="Upload video"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      
      {/* Upload Progress */}
      {(isUploading || uploadQueue.length > 0) && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 frosted-glass rounded-lg p-4 border min-w-80"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {uploadQueue.length > 1 ? `${uploadQueue.length} videos in queue` : 'Uploading video...'}
            </span>
              <button
              onClick={cancelUpload}
              className="text-xs transition-colors"
              style={{ color: 'var(--text-muted)' }}
              >
              ✕
              </button>
            </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-light)' }}>
            <div
              className="h-full transition-all duration-300 rounded-full"
                  style={{
                width: `${uploadProgress}%`,
                backgroundColor: 'var(--primary)'
              }}
            />
          </div>
          {uploadProgress > 0 && (
            <span className="text-xs mt-1 block" style={{ color: 'var(--text-muted)' }}>
              {Math.round(uploadProgress)}%
            </span>
          )}
        </div>
      )}
    </>
  )
}

export default VideoUpload
