import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import ImageUpload from './ImageUpload'
import VideoUpload from './VideoUpload'
import VoiceRecorder from './VoiceRecorder'
import ScheduleModal from './ScheduleModal'
import TemplatesPicker from './TemplatesPicker'
import VideoPreviewModal from './VideoPreviewModal'

function MessageInput({ conversationId, onReplyToMessage }) {
  const [message, setMessage] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [showVideoPreview, setShowVideoPreview] = useState(false)
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showTemplatesPicker, setShowTemplatesPicker] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null)
  const { user } = useAuth()
  const typingTimeoutRef = useRef(null)
  const isTypingRef = useRef(false)
  const imageUploadRef = useRef(null)
  const isSendingRef = useRef(false)
  const draftSaveTimeoutRef = useRef(null)
  const longPressTimerRef = useRef(null)
  const isLongPressRef = useRef(false)

  // Get draft storage key
  const getDraftKey = (convId) => {
    if (!user || !convId) return null
    return `draft_${user.id}_${convId}`
  }

  // Save draft to localStorage
  const saveDraft = (convId, text) => {
    if (!convId || !user) return
    const key = getDraftKey(convId)
    if (!key) return
    
    if (text && text.trim().length > 0) {
      localStorage.setItem(key, text.trim())
    } else {
      localStorage.removeItem(key)
    }
  }

  // Load draft from localStorage
  const loadDraft = (convId) => {
    if (!convId || !user) return ''
    const key = getDraftKey(convId)
    if (!key) return ''
    return localStorage.getItem(key) || ''
  }

  // Clear draft from localStorage
  const clearDraft = (convId) => {
    if (!convId || !user) return
    const key = getDraftKey(convId)
    if (!key) return
    localStorage.removeItem(key)
  }

  const updateTypingStatus = async (isTyping) => {
    if (!conversationId || !user) return

    try {
      if (isTyping) {
        await supabase
          .from('typing_status')
          .upsert({
            conversation_id: conversationId,
            user_id: user.id,
            is_typing: true,
            updated_at: new Date().toISOString()
          })
      } else {
        await supabase
          .from('typing_status')
          .update({ is_typing: false })
          .eq('conversation_id', conversationId)
          .eq('user_id', user.id)
      }
    } catch (error) {
      console.error('Error updating typing status:', error)
    }
  }

  const handleInputChange = (e) => {
    const newMessage = e.target.value
    setMessage(newMessage)

    if (newMessage.trim().length > 0 && !isTypingRef.current) {
      isTypingRef.current = true
      updateTypingStatus(true)
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false
        updateTypingStatus(false)
      }
    }, 3000)

    // Auto-save draft (debounced)
    if (draftSaveTimeoutRef.current) {
      clearTimeout(draftSaveTimeoutRef.current)
    }
    draftSaveTimeoutRef.current = setTimeout(() => {
      if (conversationId) {
        saveDraft(conversationId, newMessage)
      }
    }, 500) // Save draft after 500ms of no typing
  }

  const handleImageSelect = (file, preview) => {
    setSelectedImage(file)
    setImagePreview(preview)
  }

  const handleVoiceRecordingComplete = async (audioBlob, duration) => {
    if (!conversationId || !user || uploading || isSendingRef.current) return

    try {
      isSendingRef.current = true
      setUploading(true)

      // Check if current user is blocked by any participant in this conversation
      const { data: participants, error: participantsError } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .neq('user_id', user.id)

      if (participantsError) throw participantsError

      // Check if any participant has blocked the current user
      for (const participant of participants || []) {
        const { data: isBlocked, error: blockedError } = await supabase.rpc('is_user_blocked', {
          blocker_uuid: participant.user_id,
          blocked_uuid: user.id
        })

        if (blockedError) throw blockedError

        if (isBlocked) {
          alert('You cannot send messages to this conversation. You have been blocked by one of the participants.')
          return
        }
      }

      // Upload audio file
      const fileName = `voice-${Date.now()}-${Math.random().toString(36).substring(2)}.webm`
      const filePath = `${user.id}/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('voice-messages')
        .upload(filePath, audioBlob, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('voice-messages')
        .getPublicUrl(filePath)

      const audioData = {
        url: publicUrl,
        path: filePath,
        filename: fileName,
        size: audioBlob.size,
        type: audioBlob.type,
        duration: duration
      }

      // Fetch conversation to check disappearing messages setting
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('disappearing_messages_duration')
        .eq('id', conversationId)
        .single()

      let expiresAt = null
      if (!convError && convData?.disappearing_messages_duration) {
        const hours = convData.disappearing_messages_duration
        const expirationTime = new Date()
        expirationTime.setHours(expirationTime.getHours() + hours)
        expiresAt = expirationTime.toISOString()
      }

      const messageData = {
        conversation_id: conversationId,
        sender_id: user.id,
        content: '',
        message_type: 'voice',
        duration: duration,
        status: 'sent',
        sent_at: new Date().toISOString(),
        payload: audioData,
        expires_at: expiresAt
      }

      const { error } = await supabase
        .from('messages')
        .insert(messageData)

      if (error) throw error

      setShowVoiceRecorder(false)
    } catch (error) {
      console.error('Error sending voice message:', error)
      alert('Failed to send voice message: ' + (error?.message || 'Please try again.'))
    } finally {
      setUploading(false)
      isSendingRef.current = false
    }
  }

  const handleVoiceRecordingCancel = () => {
    setShowVoiceRecorder(false)
  }

  const handleSend = async () => {
    if ((!message.trim() && !selectedImage && !selectedVideo) || !conversationId || !user) return

    try {
      // Check if current user is blocked by any participant in this conversation
      const { data: participants, error: participantsError } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .neq('user_id', user.id)

      if (participantsError) throw participantsError

      // Check if any participant has blocked the current user
      for (const participant of participants || []) {
        const { data: isBlocked, error: blockedError } = await supabase.rpc('is_user_blocked', {
          blocker_uuid: participant.user_id,
          blocked_uuid: user.id
        })

        if (blockedError) throw blockedError

        if (isBlocked) {
          alert('You cannot send messages to this conversation. You have been blocked by one of the participants.')
          return
        }
      }

      if (isTypingRef.current) {
        isTypingRef.current = false
        updateTypingStatus(false)
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      setUploading(true)

      let imageData = null
      let videoData = null

      if (selectedImage) {
        console.log('Starting image upload...', selectedImage.name)
        
        // Upload image
        const fileExt = selectedImage.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `chat-images/${fileName}`

        console.log('Uploading to path:', filePath)

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-images')
          .upload(filePath, selectedImage, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          throw uploadError
        }

        console.log('Upload successful:', uploadData)

        const { data: { publicUrl } } = supabase.storage
          .from('chat-images')
          .getPublicUrl(filePath)

        console.log('Public URL:', publicUrl)

        imageData = {
          url: publicUrl,
          path: filePath,
          filename: selectedImage.name,
          size: selectedImage.size,
          type: selectedImage.type
        }
      } else if (selectedVideo) {
        // Video is already uploaded via VideoUpload component
        videoData = selectedVideo
      }

      // Fetch conversation to check disappearing messages setting
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('disappearing_messages_duration')
        .eq('id', conversationId)
        .single()

      let expiresAt = null
      if (!convError && convData?.disappearing_messages_duration) {
        const hours = convData.disappearing_messages_duration
        const expirationTime = new Date()
        expirationTime.setHours(expirationTime.getHours() + hours)
        expiresAt = expirationTime.toISOString()
      }

      const messageData = {
        conversation_id: conversationId,
        sender_id: user.id,
        content: message.trim() || '',
        message_type: selectedImage ? 'image' : selectedVideo ? 'video' : 'text',
        status: 'sent',
        sent_at: new Date().toISOString(),
        reply_to: replyingTo?.id || null,
        expires_at: expiresAt
      }

      if (imageData) {
        messageData.payload = imageData
      } else if (videoData) {
        messageData.payload = videoData
      }

      console.log('Sending message data:', messageData)

      const { error } = await supabase
        .from('messages')
        .insert(messageData)

      if (error) {
        console.error('Message insert error:', error)
        throw error
      }
      
      console.log('Message sent successfully')
      setMessage('')
      setSelectedImage(null)
      setImagePreview(null)
      setSelectedVideo(null)
      setShowVideoPreview(false)
      setReplyingTo(null) // Clear reply after sending
      
      // Clear draft after sending message
      if (conversationId) {
        clearDraft(conversationId)
      }
      
      // Clear the image preview in ImageUpload component
      if (imageUploadRef.current) {
        imageUploadRef.current.clearPreview()
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message: ' + (error?.message || 'Please try again.'))
    } finally {
      setUploading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend()
    }
  }

  // Ref to store current message for cleanup
  const messageRef = useRef(message)
  
  // Keep messageRef in sync with message state
  useEffect(() => {
    messageRef.current = message
  }, [message])

  // Handle incoming reply request (expose globally)
  useEffect(() => {
    const handleReplyMessage = (messageToReply) => {
      setReplyingTo(messageToReply)
      // Focus input if it exists
      const input = document.querySelector('input[placeholder="Type your message.."]')
      if (input) {
        setTimeout(() => input.focus(), 100)
      }
    }
    // Expose the function globally
    window.handleReplyMessage = handleReplyMessage
    return () => {
      if (window.handleReplyMessage) {
        delete window.handleReplyMessage
      }
    }
  }, [])

  // Ref to store previous conversation ID for cleanup
  const prevConversationIdRef = useRef(conversationId)

  // Load draft when conversation changes
  useEffect(() => {
    // Save draft from previous conversation before switching
    const prevConvId = prevConversationIdRef.current
    if (prevConvId && prevConvId !== conversationId && user) {
      const prevDraft = messageRef.current.trim()
      if (prevDraft) {
        saveDraft(prevConvId, prevDraft)
      }
    }

    // Load draft for new conversation
    if (conversationId && user) {
      const draft = loadDraft(conversationId)
      if (draft) {
        setMessage(draft)
      } else {
        setMessage('')
      }
      // Clear reply when switching conversations
      setReplyingTo(null)
    } else {
      setMessage('')
      setReplyingTo(null)
    }

    // Update ref for next time
    prevConversationIdRef.current = conversationId
  }, [conversationId, user?.id])

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current)
        // Save draft one last time on cleanup if timeout was pending
        if (conversationId && user) {
          const finalDraft = messageRef.current.trim()
          if (finalDraft) {
            saveDraft(conversationId, finalDraft)
          }
        }
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
      if (isTypingRef.current) {
        updateTypingStatus(false)
      }
      isSendingRef.current = false
    }
  }, [conversationId, user?.id])

  // Keyboard shortcuts for templates
  useEffect(() => {
    const handleKeyDown = async (e) => {
      // Don't trigger shortcuts if user is typing in an input field and not templates picker
      if ((e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') && !showTemplatesPicker) {
        // Only handle Escape and Ctrl+/ when not in templates picker
        if (e.key !== 'Escape' && !((e.ctrlKey || e.metaKey) && e.key === '/')) {
          return
        }
      }

      // Ctrl+/ or Cmd+/ to open templates
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        if (conversationId && !showVoiceRecorder) {
          setShowTemplatesPicker(true)
        }
      }
      // Ctrl+1-5 for pinned templates
      if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '5' && conversationId && !showVoiceRecorder) {
        e.preventDefault()
        try {
          const { data, error } = await supabase
            .from('message_templates')
            .select('*')
            .eq('user_id', user.id)
            .eq('pinned', true)
            .is('deleted_at', null)
            .order('pinned_order', { ascending: true })
            .limit(5)

          if (!error && data) {
            const templateIndex = parseInt(e.key) - 1
            if (data[templateIndex]) {
              const template = data[templateIndex]
              let processedContent = template.content
              const now = new Date()
              processedContent = processedContent.replace(/{name}/gi, '')
              processedContent = processedContent.replace(/{time}/gi, now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
              processedContent = processedContent.replace(/{date}/gi, now.toLocaleDateString())
              
              setMessage(processedContent.trim())

              // Update usage
              supabase
                .from('message_templates')
                .update({
                  usage_count: (template.usage_count || 0) + 1,
                  last_used_at: new Date().toISOString()
                })
                .eq('id', template.id)
            }
          }
        } catch (error) {
          console.error('Error fetching pinned templates:', error)
        }
      }
      // Escape to close templates picker
      if (e.key === 'Escape' && showTemplatesPicker) {
        e.preventDefault()
        setShowTemplatesPicker(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [conversationId, showVoiceRecorder, showTemplatesPicker, user?.id])

  if (!conversationId) {
    return null
  }

  return (
    <div className="w-full px-8 py-5 border-t transition-colors duration-300" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      {showVoiceRecorder ? (
        <div className="max-w-5xl mx-auto">
          <VoiceRecorder
            onRecordingComplete={handleVoiceRecordingComplete}
            onCancel={handleVoiceRecordingCancel}
          />
        </div>
      ) : (
        <div className="flex flex-col max-w-5xl mx-auto">
          {/* Reply Preview */}
          {replyingTo && (
            <div className="mb-2 mx-4 p-3 border-l-4 rounded-lg flex items-start justify-between" style={{ backgroundColor: 'var(--surface-light)', borderLeftColor: 'var(--primary)' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  <span className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
                    Replying to {replyingTo.sender?.username || 'Unknown'}
                  </span>
                </div>
                <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                  {replyingTo.content || (replyingTo.message_type === 'image' ? 'Image' : replyingTo.message_type === 'voice' ? 'Voice message' : 'Message')}
                </p>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="ml-2 flex-shrink-0 transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'}
                onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                title="Cancel reply"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          
          <div className="flex items-center space-x-4">
            {/* Templates Button */}
            <button
              onClick={() => setShowTemplatesPicker(true)}
              disabled={uploading}
              className="w-12 h-12 frosted-glass btn-rounded flex items-center justify-center focus-ring transition-all hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
              title="Message Templates (Ctrl+/)"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </button>

            {/* Schedule Icon */}
            <button
            onClick={() => {
              if (message.trim() || selectedImage) {
                setShowScheduleModal(true)
              }
            }}
            disabled={(!message.trim() && !selectedImage && !selectedVideo) || uploading}
            className="w-12 h-12 frosted-glass btn-rounded flex items-center justify-center focus-ring transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'}
            onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
            title="Schedule message"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          
          <ImageUpload
            ref={imageUploadRef}
            onImageSelect={handleImageSelect}
            onUploadStart={() => setUploading(true)}
            onUploadComplete={() => setUploading(false)}
            onUploadError={() => setUploading(false)}
          />
          
          <VideoUpload
            onVideoSelect={(videoData) => {
              setSelectedVideo(videoData)
              setShowVideoPreview(true)
            }}
            onUploadStart={() => setUploading(true)}
            onUploadComplete={() => setUploading(false)}
            onUploadError={() => setUploading(false)}
          />
          
          <button
            onClick={() => setShowVoiceRecorder(true)}
            disabled={uploading}
            className="w-12 h-12 frosted-glass btn-rounded flex items-center justify-center focus-ring disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'}
            onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
            title="Record voice message"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
          
          <input
            type="text"
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type your message.."
            className="flex-1 px-5 py-3.5 frosted-glass btn-rounded focus-ring text-sm transition-colors"
            style={{ color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }}
          />
          
          <button
            onMouseDown={(e) => {
              isLongPressRef.current = false
              longPressTimerRef.current = setTimeout(() => {
                if (!uploading && (message.trim() || selectedImage)) {
                  isLongPressRef.current = true
                  setShowScheduleModal(true)
                }
              }, 500) // 500ms for long press
            }}
            onMouseUp={() => {
              if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current)
                longPressTimerRef.current = null
              }
            }}
            onMouseLeave={() => {
              if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current)
                longPressTimerRef.current = null
              }
            }}
            onTouchStart={(e) => {
              isLongPressRef.current = false
              longPressTimerRef.current = setTimeout(() => {
                if (!uploading && (message.trim() || selectedImage)) {
                  isLongPressRef.current = true
                  setShowScheduleModal(true)
                }
              }, 500)
            }}
            onTouchEnd={(e) => {
              if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current)
                longPressTimerRef.current = null
              }
              // Only trigger click if it wasn't a long press
              if (!isLongPressRef.current && !uploading && (message.trim() || selectedImage)) {
                e.preventDefault()
                handleSend()
              }
            }}
            onClick={(e) => {
              // Prevent click if it was a long press
              if (isLongPressRef.current) {
                e.preventDefault()
                isLongPressRef.current = false
              }
            }}
            disabled={(!message.trim() && !selectedImage && !selectedVideo) || uploading}
            className="frosted-glass btn-rounded-lg px-8 py-3.5 flex items-center justify-center font-medium focus-ring disabled:opacity-50 disabled:cursor-not-allowed relative transition-colors"
            style={{ color: 'white', backgroundColor: 'var(--primary)' }}
            title="Press and hold to schedule"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Uploading...
              </>
            ) : (
              'Send'
            )}
          </button>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleModal
          message={message}
          conversationId={conversationId}
          selectedImage={selectedImage}
          messageType={selectedImage ? 'image' : 'text'}
          onClose={() => {
            setShowScheduleModal(false)
            isLongPressRef.current = false
          }}
          onScheduleSuccess={() => {
            setMessage('')
            setSelectedImage(null)
            setImagePreview(null)
            if (imageUploadRef.current) {
              imageUploadRef.current.clearPreview()
            }
            // Clear draft after scheduling
            if (conversationId) {
              clearDraft(conversationId)
            }
          }}
        />
      )}

      {/* Templates Picker */}
      {showTemplatesPicker && (
        <TemplatesPicker
          isOpen={showTemplatesPicker}
          onClose={() => setShowTemplatesPicker(false)}
          onSelect={(templateContent) => {
            setMessage(templateContent)
            setShowTemplatesPicker(false)
          }}
          userId={user?.id}
        />
      )}

      {/* Video Preview Modal */}
      {showVideoPreview && selectedVideo && (
        <VideoPreviewModal
          video={selectedVideo}
          isOpen={showVideoPreview}
          onClose={() => {
            setShowVideoPreview(false)
            setSelectedVideo(null)
          }}
          onSend={async (caption, videoData) => {
            if (videoData || selectedVideo) {
              const videoToUse = videoData || selectedVideo
              setSelectedVideo(videoToUse)
              setMessage(caption || '')
              setShowVideoPreview(false)
              // Trigger send after state updates
              setTimeout(() => {
                handleSend()
              }, 100)
            }
          }}
        />
      )}
    </div>
  )
}

export default MessageInput
