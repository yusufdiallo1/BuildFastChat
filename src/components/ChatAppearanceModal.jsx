import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// Preset background images (using placeholder URLs - replace with actual images)
const PRESET_BACKGROUNDS = [
  { id: 'nature-1', name: 'Forest', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80' },
  { id: 'nature-2', name: 'Ocean', url: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800&q=80' },
  { id: 'nature-3', name: 'Mountains', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80' },
  { id: 'nature-4', name: 'Desert', url: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80' },
  { id: 'abstract-1', name: 'Abstract Blue', url: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800&q=80' },
  { id: 'abstract-2', name: 'Abstract Purple', url: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800&q=80' },
  { id: 'geometric-1', name: 'Geometric Pattern', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80' },
  { id: 'geometric-2', name: 'Grid Pattern', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80' },
  { id: 'texture-1', name: 'Paper Texture', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80' },
  { id: 'texture-2', name: 'Fabric Texture', url: 'https://images.unsplash.com/photo-1515378791036-0648a814c963?w=800&q=80' },
  { id: 'solid-1', name: 'Solid Light', url: null, color: '#f8f9fa' },
  { id: 'solid-2', name: 'Solid Dark', url: null, color: '#1a1a1a' },
]

// Preset gradients
const PRESET_GRADIENTS = [
  { name: 'Sunset', colors: ['#ff6b6b', '#ffa500', '#ffd93d'], direction: 'diagonal' },
  { name: 'Ocean', colors: ['#00c9ff', '#92fe9d'], direction: 'linear' },
  { name: 'Forest', colors: ['#134e5e', '#71b280'], direction: 'radial' },
  { name: 'Purple Dream', colors: ['#667eea', '#764ba2'], direction: 'diagonal' },
  { name: 'Vibrant', colors: ['#f093fb', '#f5576c'], direction: 'linear' },
  { name: 'Cool', colors: ['#4facfe', '#00f2fe'], direction: 'radial' },
]

function ChatAppearanceModal({ conversationId, isGroupChat, onClose }) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('background')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Background Settings
  const [backgroundType, setBackgroundType] = useState('default')
  const [selectedBackgroundImage, setSelectedBackgroundImage] = useState(null)
  const [backgroundBlur, setBackgroundBlur] = useState(0)
  const [backgroundBrightness, setBackgroundBrightness] = useState(0)
  const [backgroundColor, setBackgroundColor] = useState('#ffffff')
  const [gradientColors, setGradientColors] = useState(['#667eea', '#764ba2'])
  const [gradientDirection, setGradientDirection] = useState('diagonal')
  
  // Bubble Settings
  const [myBubbleColor, setMyBubbleColor] = useState('#3b82f6')
  const [theirBubbleColor, setTheirBubbleColor] = useState('#4b5563')
  const [bubbleOpacity, setBubbleOpacity] = useState(1.0)
  const [bubbleShape, setBubbleShape] = useState('rounded')
  const [bubbleTail, setBubbleTail] = useState(true)
  const [bubbleShadow, setBubbleShadow] = useState('medium')
  const [bubbleStyle, setBubbleStyle] = useState('filled')
  const [messageSpacing, setMessageSpacing] = useState('normal')
  
  // Typography
  const [fontSize, setFontSize] = useState('medium')
  const [messageAlignment, setMessageAlignment] = useState('standard')
  
  // Scope
  const [applyToAll, setApplyToAll] = useState(false)
  
  // Upload
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [conversationId, user])

  const fetchSettings = async () => {
    if (!user || !conversationId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      // Try to fetch conversation-specific settings first
      const { data, error } = await supabase
        .from('chat_appearance_settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('conversation_id', conversationId)
        .single()

      // If any error occurs (including table missing/RLS/406), just ignore and fall back
      if (error && error.code !== 'PGRST116') {
        console.warn('Appearance settings not available, falling back:', error)
      }

      if (data) {
        // Load saved settings
        setBackgroundType(data.background_type || 'default')
        setSelectedBackgroundImage(data.background_image_url)
        setBackgroundBlur(data.background_image_blur || 0)
        setBackgroundBrightness(data.background_image_brightness || 0)
        setBackgroundColor(data.background_color || '#ffffff')
        if (data.background_gradient) {
          const gradient = JSON.parse(data.background_gradient)
          setGradientColors(gradient.colors || ['#667eea', '#764ba2'])
          setGradientDirection(gradient.direction || 'diagonal')
        }
        setMyBubbleColor(data.my_bubble_color || '#3b82f6')
        setTheirBubbleColor(data.their_bubble_color || '#4b5563')
        setBubbleOpacity(data.bubble_opacity ?? 1.0)
        setBubbleShape(data.bubble_shape || 'rounded')
        setBubbleTail(data.bubble_tail ?? true)
        setBubbleShadow(data.bubble_shadow || 'medium')
        setBubbleStyle(data.bubble_style || 'filled')
        setMessageSpacing(data.message_spacing || 'normal')
        setFontSize(data.font_size || 'medium')
        setMessageAlignment(data.message_alignment || 'standard')
      }
    } catch (error) {
      console.error('Error fetching appearance settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    if (file.size > 6 * 1024 * 1024) {
      alert('Image must be less than 6MB')
      return
    }

    try {
      setUploadingImage(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      
      const { error: uploadError, data } = await supabase.storage
        .from('chat-backgrounds')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        // Try to create bucket if it doesn't exist
        if (uploadError.message.includes('not found')) {
          alert('Storage bucket not configured. Please contact support.')
          return
        }
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from('chat-backgrounds')
        .getPublicUrl(fileName)

      setSelectedBackgroundImage(publicUrl)
      setBackgroundType('image')
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Failed to upload image. Please try again.')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSave = async () => {
    if (!user) return

    try {
      setSaving(true)

      const settings = {
        user_id: user.id,
        conversation_id: applyToAll ? null : conversationId,
        is_global: applyToAll,
        background_type: backgroundType,
        background_image_url: selectedBackgroundImage,
        background_image_blur: backgroundBlur,
        background_image_brightness: backgroundBrightness,
        background_color: backgroundColor,
        background_gradient: JSON.stringify({ colors: gradientColors, direction: gradientDirection }),
        my_bubble_color: myBubbleColor,
        their_bubble_color: theirBubbleColor,
        bubble_opacity: bubbleOpacity,
        bubble_shape: bubbleShape,
        bubble_tail: bubbleTail,
        bubble_shadow: bubbleShadow,
        bubble_style: bubbleStyle,
        message_spacing: messageSpacing,
        font_size: fontSize,
        message_alignment: messageAlignment,
      }

      // Upsert settings
      const { error } = await supabase
        .from('chat_appearance_settings')
        .upsert(settings, {
          onConflict: 'user_id,conversation_id,is_global'
        })

      if (error) throw error

      // Apply settings to the chat interface
      applySettingsToChat()
      
      alert('Chat appearance updated successfully!')
      onClose()
    } catch (error) {
      console.error('Error saving appearance settings:', error)
      alert('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const applySettingsToChat = () => {
    // Apply settings to the message list container via CSS variables
    const messageList = document.querySelector('.message-list-container')
    if (!messageList) return

    const root = messageList.style

    // Background
    if (backgroundType === 'image' && selectedBackgroundImage) {
      root.backgroundImage = `url(${selectedBackgroundImage})`
      root.backgroundSize = 'cover'
      root.backgroundPosition = 'center'
      root.backgroundRepeat = 'no-repeat'
      root.filter = `blur(${backgroundBlur}px) brightness(${100 + backgroundBrightness}%)`
    } else if (backgroundType === 'color') {
      root.backgroundImage = 'none'
      root.backgroundColor = backgroundColor
      root.filter = 'none'
    } else if (backgroundType === 'gradient') {
      const gradientCSS = buildGradientCSS()
      root.backgroundImage = gradientCSS
      root.filter = 'none'
    } else {
      root.backgroundImage = 'none'
      root.backgroundColor = ''
      root.filter = 'none'
    }

    // Store settings in localStorage for persistence
    localStorage.setItem('chatAppearanceSettings', JSON.stringify({
      conversationId: applyToAll ? 'global' : conversationId,
      backgroundType,
      selectedBackgroundImage,
      backgroundBlur,
      backgroundBrightness,
      backgroundColor,
      gradientColors,
      gradientDirection,
      myBubbleColor,
      theirBubbleColor,
      bubbleOpacity,
      bubbleShape,
      bubbleTail,
      bubbleShadow,
      bubbleStyle,
      messageSpacing,
      fontSize,
      messageAlignment,
    }))
  }

  const buildGradientCSS = () => {
    const directionMap = {
      'linear': 'linear-gradient(to bottom,',
      'horizontal': 'linear-gradient(to right,',
      'diagonal': 'linear-gradient(135deg,',
      'radial': 'radial-gradient(circle,'
    }
    
    const prefix = directionMap[gradientDirection] || directionMap.diagonal
    return `${prefix} ${gradientColors.join(', ')})`
  }

  const handleReset = () => {
    setBackgroundType('default')
    setSelectedBackgroundImage(null)
    setBackgroundBlur(0)
    setBackgroundBrightness(0)
    setBackgroundColor('#ffffff')
    setGradientColors(['#667eea', '#764ba2'])
    setGradientDirection('diagonal')
    setMyBubbleColor('#3b82f6')
    setTheirBubbleColor('#4b5563')
    setBubbleOpacity(1.0)
    setBubbleShape('rounded')
    setBubbleTail(true)
    setBubbleShadow('medium')
    setBubbleStyle('filled')
    setMessageSpacing('normal')
    setFontSize('medium')
    setMessageAlignment('standard')
  }

  const getPreviewBackground = () => {
    if (backgroundType === 'image' && selectedBackgroundImage) {
      return {
        backgroundImage: `url(${selectedBackgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: `blur(${backgroundBlur * 0.1}px) brightness(${100 + backgroundBrightness}%)`
      }
    } else if (backgroundType === 'color') {
      return { backgroundColor: backgroundColor }
    } else if (backgroundType === 'gradient') {
      return { backgroundImage: buildGradientCSS() }
    }
    return {}
  }

  const getBubbleRadius = () => {
    const radiusMap = {
      'rounded': '18px',
      'pill': '24px',
      'squared': '8px',
      'minimal': '4px'
    }
    return radiusMap[bubbleShape] || '18px'
  }

  const getShadowCSS = () => {
    const shadowMap = {
      'none': 'none',
      'subtle': '0 1px 2px rgba(0,0,0,0.1)',
      'medium': '0 2px 8px rgba(0,0,0,0.15)',
      'elevated': '0 4px 16px rgba(0,0,0,0.2)'
    }
    return shadowMap[bubbleShadow] || shadowMap.medium
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="frosted-glass rounded-2xl p-8">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span style={{ color: 'var(--text-primary)' }}>Loading settings...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="frosted-glass rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] max-h-[900px] flex flex-col overflow-hidden"
        style={{ borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-2xl font-bold gradient-text">Chat Appearance</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'}
            onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Tabs */}
          <div className="w-64 border-r p-4 flex flex-col" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
            <div className="space-y-2">
              <button
                onClick={() => setActiveTab('background')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                  activeTab === 'background' ? 'frosted-glass' : ''
                }`}
                style={{
                  color: activeTab === 'background' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  backgroundColor: activeTab === 'background' ? 'var(--surface-light)' : 'transparent'
                }}
              >
                🎨 Background
              </button>
              <button
                onClick={() => setActiveTab('colors')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                  activeTab === 'colors' ? 'frosted-glass' : ''
                }`}
                style={{
                  color: activeTab === 'colors' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  backgroundColor: activeTab === 'colors' ? 'var(--surface-light)' : 'transparent'
                }}
              >
                🌈 Colors & Gradients
              </button>
              <button
                onClick={() => setActiveTab('bubbles')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                  activeTab === 'bubbles' ? 'frosted-glass' : ''
                }`}
                style={{
                  color: activeTab === 'bubbles' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  backgroundColor: activeTab === 'bubbles' ? 'var(--surface-light)' : 'transparent'
                }}
              >
                💬 Bubble Styles
              </button>
            </div>

            {/* Scope Toggle */}
            <div className="mt-auto pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyToAll}
                  onChange={(e) => setApplyToAll(e.target.checked)}
                  className="w-5 h-5"
                />
                <span style={{ color: 'var(--text-secondary)' }} className="text-sm">
                  Apply to All Chats
                </span>
              </label>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'background' && (
                <BackgroundImagesTab
                  selectedImage={selectedBackgroundImage}
                  onSelectImage={setSelectedBackgroundImage}
                  backgroundType={backgroundType}
                  onBackgroundTypeChange={setBackgroundType}
                  onImageUpload={handleImageUpload}
                  uploadingImage={uploadingImage}
                  backgroundBlur={backgroundBlur}
                  onBlurChange={setBackgroundBlur}
                  backgroundBrightness={backgroundBrightness}
                  onBrightnessChange={setBackgroundBrightness}
                />
              )}

              {activeTab === 'colors' && (
                <ColorsGradientsTab
                  backgroundColor={backgroundColor}
                  onBackgroundColorChange={setBackgroundColor}
                  gradientColors={gradientColors}
                  onGradientColorsChange={setGradientColors}
                  gradientDirection={gradientDirection}
                  onGradientDirectionChange={setGradientDirection}
                  myBubbleColor={myBubbleColor}
                  onMyBubbleColorChange={setMyBubbleColor}
                  theirBubbleColor={theirBubbleColor}
                  onTheirBubbleColorChange={setTheirBubbleColor}
                  bubbleOpacity={bubbleOpacity}
                  onBubbleOpacityChange={setBubbleOpacity}
                />
              )}

              {activeTab === 'bubbles' && (
                <BubbleStylesTab
                  bubbleShape={bubbleShape}
                  onBubbleShapeChange={setBubbleShape}
                  bubbleTail={bubbleTail}
                  onBubbleTailChange={setBubbleTail}
                  messageSpacing={messageSpacing}
                  onMessageSpacingChange={setMessageSpacing}
                  bubbleShadow={bubbleShadow}
                  onBubbleShadowChange={setBubbleShadow}
                  bubbleStyle={bubbleStyle}
                  onBubbleStyleChange={setBubbleStyle}
                  fontSize={fontSize}
                  onFontSizeChange={setFontSize}
                  messageAlignment={messageAlignment}
                  onMessageAlignmentChange={setMessageAlignment}
                />
              )}
            </div>

            {/* Preview Panel */}
            <div className="w-80 border-l p-6 overflow-y-auto" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Preview</h3>
              <PreviewPanel
                background={getPreviewBackground()}
                myBubbleColor={myBubbleColor}
                theirBubbleColor={theirBubbleColor}
                bubbleOpacity={bubbleOpacity}
                bubbleRadius={getBubbleRadius()}
                bubbleShadow={getShadowCSS()}
                bubbleStyle={bubbleStyle}
                messageSpacing={messageSpacing}
                fontSize={fontSize}
                messageAlignment={messageAlignment}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={handleReset}
            className="px-6 py-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--surface)' }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'var(--surface-light)'
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'var(--surface)'
            }}
          >
            Reset to Default
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)', backgroundColor: 'transparent' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 rounded-lg transition-all"
              style={{
                color: 'white',
                backgroundColor: saving ? 'var(--text-muted)' : 'var(--primary)'
              }}
            >
              {saving ? 'Saving...' : 'Apply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Background Images Tab Component
function BackgroundImagesTab({
  selectedImage,
  onSelectImage,
  backgroundType,
  onBackgroundTypeChange,
  onImageUpload,
  uploadingImage,
  backgroundBlur,
  onBlurChange,
  backgroundBrightness,
  onBrightnessChange,
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Background Images</h3>
        
        {/* Background Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
            Background Type
          </label>
          <div className="grid grid-cols-4 gap-3">
            {[
              { value: 'default', label: 'Default', icon: '🔲' },
              { value: 'image', label: 'Image', icon: '🖼️' },
              { value: 'color', label: 'Color', icon: '🎨' },
              { value: 'gradient', label: 'Gradient', icon: '🌈' },
            ].map((type) => (
              <button
                key={type.value}
                onClick={() => onBackgroundTypeChange(type.value)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  backgroundType === type.value ? 'frosted-glass' : ''
                }`}
                style={{
                  borderColor: backgroundType === type.value ? 'var(--primary)' : 'var(--border)',
                  backgroundColor: backgroundType === type.value ? 'var(--surface-light)' : 'var(--surface)'
                }}
              >
                <div className="text-2xl mb-1">{type.icon}</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{type.label}</div>
              </button>
            ))}
          </div>
        </div>

        {backgroundType === 'image' && (
          <>
            {/* Preset Images Grid */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                Preset Backgrounds
              </label>
              <div className="grid grid-cols-4 gap-3">
                {PRESET_BACKGROUNDS.map((bg) => (
                  <div
                    key={bg.id}
                    onClick={() => {
                      if (bg.url) {
                        onSelectImage(bg.url)
                      } else if (bg.color) {
                        onBackgroundTypeChange('color')
                      }
                    }}
                    className={`aspect-video rounded-lg overflow-hidden cursor-pointer border-2 transition-all hover:scale-105 ${
                      selectedImage === bg.url ? 'ring-4 ring-indigo-500' : ''
                    }`}
                    style={{ borderColor: selectedImage === bg.url ? 'var(--primary)' : 'var(--border)' }}
                  >
                    {bg.url ? (
                      <img src={bg.url} alt={bg.name} className="w-full h-full object-cover" />
                    ) : (
                      <div style={{ backgroundColor: bg.color, width: '100%', height: '100%' }} />
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-1 text-xs text-white bg-black/50">
                      {bg.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upload Custom */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                Upload Custom Image
              </label>
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={onImageUpload}
                  className="hidden"
                />
                <div className="flex items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors hover:border-indigo-500" style={{ borderColor: 'var(--border)' }}>
                  {uploadingImage ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      <span style={{ color: 'var(--text-secondary)' }}>Uploading...</span>
                    </div>
                  ) : (
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p style={{ color: 'var(--text-secondary)' }}>Click to upload custom image</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Max 6MB, JPG, PNG, GIF, WEBP</p>
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Adjustments */}
            {(selectedImage || onSelectImage) && (
              <div className="space-y-4">
                {/* Blur Slider */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Blur Intensity: {backgroundBlur}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={backgroundBlur}
                    onChange={(e) => onBlurChange(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Brightness Slider */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Brightness: {backgroundBrightness > 0 ? '+' : ''}{backgroundBrightness}%
                  </label>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={backgroundBrightness}
                    onChange={(e) => onBrightnessChange(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Remove Background */}
                <button
                  onClick={() => {
                    onSelectImage(null)
                    onBackgroundTypeChange('default')
                  }}
                  className="px-4 py-2 rounded-lg transition-colors"
                  style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--surface)' }}
                >
                  Remove Background
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Colors & Gradients Tab Component
function ColorsGradientsTab({
  backgroundColor,
  onBackgroundColorChange,
  gradientColors,
  onGradientColorsChange,
  gradientDirection,
  onGradientDirectionChange,
  myBubbleColor,
  onMyBubbleColorChange,
  theirBubbleColor,
  onTheirBubbleColorChange,
  bubbleOpacity,
  onBubbleOpacityChange,
}) {
  const handleGradientColorChange = (index, color) => {
    const newColors = [...gradientColors]
    newColors[index] = color
    onGradientColorsChange(newColors)
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Colors & Gradients</h3>

      {/* Background Color */}
      <div>
        <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
          Background Color
        </label>
        <div className="flex items-center space-x-3">
          <input
            type="color"
            value={backgroundColor}
            onChange={(e) => onBackgroundColorChange(e.target.value)}
            className="w-16 h-16 rounded-lg cursor-pointer"
          />
          <input
            type="text"
            value={backgroundColor}
            onChange={(e) => onBackgroundColorChange(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg"
            style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
          />
        </div>
      </div>

      {/* Gradient Builder */}
      <div>
        <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
          Gradient Colors
        </label>
        <div className="space-y-3 mb-4">
          {gradientColors.map((color, index) => (
            <div key={index} className="flex items-center space-x-3">
              <input
                type="color"
                value={color}
                onChange={(e) => handleGradientColorChange(index, e.target.value)}
                className="w-16 h-16 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => handleGradientColorChange(index, e.target.value)}
                className="flex-1 px-4 py-2 rounded-lg"
                style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
              />
              {gradientColors.length > 2 && (
                <button
                  onClick={() => onGradientColorsChange(gradientColors.filter((_, i) => i !== index))}
                  className="px-3 py-2 rounded-lg text-red-400"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          {gradientColors.length < 4 && (
            <button
              onClick={() => onGradientColorsChange([...gradientColors, '#000000'])}
              className="px-4 py-2 rounded-lg"
              style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
            >
              + Add Color
            </button>
          )}
        </div>

        {/* Gradient Direction */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
            Direction
          </label>
          <div className="grid grid-cols-4 gap-3">
            {[
              { value: 'linear', label: 'Vertical', icon: '⬇️' },
              { value: 'horizontal', label: 'Horizontal', icon: '➡️' },
              { value: 'diagonal', label: 'Diagonal', icon: '↘️' },
              { value: 'radial', label: 'Radial', icon: '⭕' },
            ].map((dir) => (
              <button
                key={dir.value}
                onClick={() => onGradientDirectionChange(dir.value)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  gradientDirection === dir.value ? 'frosted-glass' : ''
                }`}
                style={{
                  borderColor: gradientDirection === dir.value ? 'var(--primary)' : 'var(--border)',
                  backgroundColor: gradientDirection === dir.value ? 'var(--surface-light)' : 'var(--surface)'
                }}
              >
                <div className="text-xl mb-1">{dir.icon}</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{dir.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Preset Gradients */}
        <div>
          <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
            Preset Gradients
          </label>
          <div className="grid grid-cols-3 gap-3">
            {PRESET_GRADIENTS.map((preset, index) => (
              <button
                key={index}
                onClick={() => {
                  onGradientColorsChange(preset.colors)
                  onGradientDirectionChange(preset.direction)
                }}
                className="h-20 rounded-lg border-2 transition-all hover:scale-105"
                style={{
                  background: buildPresetGradient(preset),
                  borderColor: 'var(--border)'
                }}
              >
                <span className="text-xs text-white drop-shadow">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bubble Colors */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
            Your Bubble Color
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="color"
              value={myBubbleColor}
              onChange={(e) => onMyBubbleColorChange(e.target.value)}
              className="w-16 h-16 rounded-lg cursor-pointer"
            />
            <input
              type="text"
              value={myBubbleColor}
              onChange={(e) => onMyBubbleColorChange(e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg"
              style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
            Their Bubble Color
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="color"
              value={theirBubbleColor}
              onChange={(e) => onTheirBubbleColorChange(e.target.value)}
              className="w-16 h-16 rounded-lg cursor-pointer"
            />
            <input
              type="text"
              value={theirBubbleColor}
              onChange={(e) => onTheirBubbleColorChange(e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg"
              style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
            />
          </div>
        </div>

        {/* Bubble Opacity */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            Bubble Opacity: {Math.round(bubbleOpacity * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={bubbleOpacity}
            onChange={(e) => onBubbleOpacityChange(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
    </div>
  )
}

function buildPresetGradient(preset) {
  const directionMap = {
    'linear': 'linear-gradient(to bottom,',
    'horizontal': 'linear-gradient(to right,',
    'diagonal': 'linear-gradient(135deg,',
    'radial': 'radial-gradient(circle,'
  }
  const prefix = directionMap[preset.direction] || directionMap.diagonal
  return `${prefix} ${preset.colors.join(', ')})`
}

// Bubble Styles Tab Component
function BubbleStylesTab({
  bubbleShape,
  onBubbleShapeChange,
  bubbleTail,
  onBubbleTailChange,
  messageSpacing,
  onMessageSpacingChange,
  bubbleShadow,
  onBubbleShadowChange,
  bubbleStyle,
  onBubbleStyleChange,
  fontSize,
  onFontSizeChange,
  messageAlignment,
  onMessageAlignmentChange,
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Bubble Styles</h3>

      {/* Bubble Shape */}
      <div>
        <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
          Bubble Shape
        </label>
        <div className="grid grid-cols-4 gap-3">
          {[
            { value: 'rounded', label: 'Default', radius: '18px' },
            { value: 'pill', label: 'Pill', radius: '24px' },
            { value: 'squared', label: 'Squared', radius: '8px' },
            { value: 'minimal', label: 'Minimal', radius: '4px' },
          ].map((shape) => (
            <button
              key={shape.value}
              onClick={() => onBubbleShapeChange(shape.value)}
              className={`p-4 rounded-lg border-2 transition-all ${
                bubbleShape === shape.value ? 'frosted-glass' : ''
              }`}
              style={{
                borderColor: bubbleShape === shape.value ? 'var(--primary)' : 'var(--border)',
                backgroundColor: bubbleShape === shape.value ? 'var(--surface-light)' : 'var(--surface)',
                borderRadius: shape.radius
              }}
            >
              <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{shape.label}</div>
              <div className="w-full h-12 rounded" style={{ backgroundColor: 'var(--primary)', borderRadius: shape.radius }} />
            </button>
          ))}
        </div>
      </div>

      {/* Bubble Tail */}
      <div>
        <label className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Bubble Tail
          </span>
          <button
            onClick={() => onBubbleTailChange(!bubbleTail)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              bubbleTail ? 'bg-indigo-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                bubbleTail ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </label>
      </div>

      {/* Message Spacing */}
      <div>
        <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
          Message Spacing
        </label>
        <div className="grid grid-cols-3 gap-3">
          {['compact', 'normal', 'comfortable'].map((spacing) => (
            <button
              key={spacing}
              onClick={() => onMessageSpacingChange(spacing)}
              className={`p-3 rounded-lg border-2 transition-all capitalize ${
                messageSpacing === spacing ? 'frosted-glass' : ''
              }`}
              style={{
                borderColor: messageSpacing === spacing ? 'var(--primary)' : 'var(--border)',
                backgroundColor: messageSpacing === spacing ? 'var(--surface-light)' : 'var(--surface)'
              }}
            >
              {spacing}
            </button>
          ))}
        </div>
      </div>

      {/* Bubble Shadow */}
      <div>
        <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
          Shadow Intensity
        </label>
        <div className="grid grid-cols-4 gap-3">
          {['none', 'subtle', 'medium', 'elevated'].map((shadow) => (
            <button
              key={shadow}
              onClick={() => onBubbleShadowChange(shadow)}
              className={`p-3 rounded-lg border-2 transition-all capitalize ${
                bubbleShadow === shadow ? 'frosted-glass' : ''
              }`}
              style={{
                borderColor: bubbleShadow === shadow ? 'var(--primary)' : 'var(--border)',
                backgroundColor: bubbleShadow === shadow ? 'var(--surface-light)' : 'var(--surface)',
                boxShadow: getShadowCSS(shadow)
              }}
            >
              {shadow}
            </button>
          ))}
        </div>
      </div>

      {/* Bubble Style */}
      <div>
        <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
          Bubble Style
        </label>
        <div className="grid grid-cols-2 gap-3">
          {['filled', 'outlined'].map((style) => (
            <button
              key={style}
              onClick={() => onBubbleStyleChange(style)}
              className={`p-4 rounded-lg border-2 transition-all capitalize ${
                bubbleStyle === style ? 'frosted-glass' : ''
              }`}
              style={{
                borderColor: bubbleStyle === style ? 'var(--primary)' : 'var(--border)',
                backgroundColor: bubbleStyle === style ? 'var(--primary)' : 'transparent',
                borderWidth: style === 'outlined' ? '2px' : '0'
              }}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div>
        <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
          Font Size
        </label>
        <div className="grid grid-cols-3 gap-3">
          {['small', 'medium', 'large'].map((size) => (
            <button
              key={size}
              onClick={() => onFontSizeChange(size)}
              className={`p-3 rounded-lg border-2 transition-all capitalize ${
                fontSize === size ? 'frosted-glass' : ''
              }`}
              style={{
                borderColor: fontSize === size ? 'var(--primary)' : 'var(--border)',
                backgroundColor: fontSize === size ? 'var(--surface-light)' : 'var(--surface)',
                fontSize: size === 'small' ? '0.875rem' : size === 'large' ? '1.125rem' : '1rem'
              }}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Message Alignment */}
      <div>
        <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
          Message Alignment
        </label>
        <div className="grid grid-cols-2 gap-3">
          {['standard', 'centered'].map((alignment) => (
            <button
              key={alignment}
              onClick={() => onMessageAlignmentChange(alignment)}
              className={`p-3 rounded-lg border-2 transition-all capitalize ${
                messageAlignment === alignment ? 'frosted-glass' : ''
              }`}
              style={{
                borderColor: messageAlignment === alignment ? 'var(--primary)' : 'var(--border)',
                backgroundColor: messageAlignment === alignment ? 'var(--surface-light)' : 'var(--surface)'
              }}
            >
              {alignment}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function getShadowCSS(shadow) {
  const shadowMap = {
    'none': 'none',
    'subtle': '0 1px 2px rgba(0,0,0,0.1)',
    'medium': '0 2px 8px rgba(0,0,0,0.15)',
    'elevated': '0 4px 16px rgba(0,0,0,0.2)'
  }
  return shadowMap[shadow] || shadowMap.medium
}

// Preview Panel Component
function PreviewPanel({
  background,
  myBubbleColor,
  theirBubbleColor,
  bubbleOpacity,
  bubbleRadius,
  bubbleShadow,
  bubbleStyle,
  messageSpacing,
  fontSize,
  messageAlignment,
}) {
  const spacingMap = {
    'compact': '0.5rem',
    'normal': '1rem',
    'comfortable': '1.5rem'
  }

  const fontSizeMap = {
    'small': '0.875rem',
    'medium': '1rem',
    'large': '1.125rem'
  }

  return (
    <div
      className="rounded-lg overflow-hidden p-4 h-96"
      style={{
        ...background,
        minHeight: '400px',
        position: 'relative'
      }}
    >
      <div className="space-y-3" style={{ gap: spacingMap[messageSpacing] || '1rem' }}>
        {/* Their Message */}
        <div className="flex justify-start">
          <div
            className="px-3 py-2 rounded-lg"
            style={{
              backgroundColor: theirBubbleColor,
              opacity: bubbleOpacity,
              borderRadius: bubbleRadius,
              boxShadow: bubbleShadow,
              border: bubbleStyle === 'outlined' ? `2px solid ${theirBubbleColor}` : 'none',
              fontSize: fontSizeMap[fontSize] || '1rem',
              maxWidth: '80%',
              color: getContrastColor(theirBubbleColor)
            }}
          >
            <p>Hey! How's it going?</p>
          </div>
        </div>

        {/* My Message */}
        <div className="flex justify-end" style={{ justifyContent: messageAlignment === 'centered' ? 'center' : 'flex-end' }}>
          <div
            className="px-3 py-2 rounded-lg"
            style={{
              backgroundColor: myBubbleColor,
              opacity: bubbleOpacity,
              borderRadius: bubbleRadius,
              boxShadow: bubbleShadow,
              border: bubbleStyle === 'outlined' ? `2px solid ${myBubbleColor}` : 'none',
              fontSize: fontSizeMap[fontSize] || '1rem',
              maxWidth: '80%',
              color: getContrastColor(myBubbleColor)
            }}
          >
            <p>Great! Thanks for asking.</p>
          </div>
        </div>

        {/* Another their message */}
        <div className="flex justify-start">
          <div
            className="px-3 py-2 rounded-lg"
            style={{
              backgroundColor: theirBubbleColor,
              opacity: bubbleOpacity,
              borderRadius: bubbleRadius,
              boxShadow: bubbleShadow,
              border: bubbleStyle === 'outlined' ? `2px solid ${theirBubbleColor}` : 'none',
              fontSize: fontSizeMap[fontSize] || '1rem',
              maxWidth: '80%',
              color: getContrastColor(theirBubbleColor)
            }}
          >
            <p>Awesome! Let's catch up soon.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function to determine text color based on background
function getContrastColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 128 ? '#000000' : '#ffffff'
}

export default ChatAppearanceModal

