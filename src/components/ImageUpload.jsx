import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react'
import { supabase } from '../lib/supabase'

const ImageUpload = forwardRef(({ onImageSelect, onUploadStart, onUploadComplete, onUploadError }, ref) => {
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (!file) return

    console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type)

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, GIF, WebP, or SVG)')
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    console.log('File validation passed, creating preview...')

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      console.log('Preview created successfully')
      setPreview(e.target.result)
      onImageSelect(file, e.target.result)
    }
    reader.readAsDataURL(file)
  }

  const uploadImage = async (file) => {
    if (!file) return null

    try {
      setUploading(true)
      onUploadStart?.()

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `chat-images/${fileName}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('chat-images')
        .upload(filePath, file)

      if (error) throw error

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-images')
        .getPublicUrl(filePath)

      onUploadComplete?.(publicUrl, filePath)
      return { url: publicUrl, path: filePath }

    } catch (error) {
      console.error('Error uploading image:', error)
      onUploadError?.(error)
      return null
    } finally {
      setUploading(false)
    }
  }

  const clearPreview = () => {
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onImageSelect(null, null)
  }

  // Expose clearPreview function to parent via ref
  useImperativeHandle(ref, () => ({
    clearPreview: clearPreview
  }))

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="text-gray-400 hover:text-white transition-colors p-2 disabled:opacity-50"
        title="Upload image"
      >
        {uploading ? (
          <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
      </button>

      {preview && (
        <div className="absolute bottom-full left-0 mb-2 p-2 bg-gray-800 rounded-lg border border-gray-600 shadow-lg">
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="max-w-48 max-h-48 object-contain rounded"
              style={{ aspectRatio: 'auto' }}
            />
            <button
              onClick={clearPreview}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Click to remove</p>
        </div>
      )}
    </div>
  )
})

export default ImageUpload
