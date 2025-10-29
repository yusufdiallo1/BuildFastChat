import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import TypingIndicator from './TypingIndicator'
import MessageStatus from './MessageStatus'
import ImageModal from './ImageModal'
import HighlightedText from './HighlightedText'
import ReactionPicker from './ReactionPicker'
import ReactionDisplay from './ReactionDisplay'
import AudioPlayer from './AudioPlayer'
import VideoPlayer from './VideoPlayer'
import MessageOptionsMenu from './MessageOptionsMenu'
import ForwardModal from './ForwardModal'

function MessageList({ conversationId, conversation, searchResults = [], searchQuery = '', targetMessageId = null }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(null)
  const [messageReactions, setMessageReactions] = useState({})
  const [showMessageOptions, setShowMessageOptions] = useState(null)
  const [messageOptionsPosition, setMessageOptionsPosition] = useState({ x: 0, y: 0 })
  const [pinnedMessages, setPinnedMessages] = useState([])
  const [pinnedIds, setPinnedIds] = useState([])
  const [pinnedExpanded, setPinnedExpanded] = useState(false)
  const [scheduledMessageIds, setScheduledMessageIds] = useState(new Set())
  const [repliedMessages, setRepliedMessages] = useState({}) // Map of message_id -> replied message data
  const [timerUpdateTrigger, setTimerUpdateTrigger] = useState(0) // Trigger timer updates
  const [appearanceSettings, setAppearanceSettings] = useState(null) // Chat appearance settings
  const [playingVideos, setPlayingVideos] = useState(new Set()) // Track playing videos
  const maxConcurrentVideos = 3 // Limit concurrent video players
  const { user, userProfile } = useAuth()
  const messagesEndRef = useRef(null)
  const messageRefs = useRef({})
  const longPressTimer = useRef(null)
  const longPressThreshold = 500 // 500ms for long press

  // Pause all videos when switching conversations
  useEffect(() => {
    return () => {
      // Pause all playing videos when component unmounts or conversation changes
      const allVideos = document.querySelectorAll('video')
      allVideos.forEach(video => {
        if (!video.paused) {
          video.pause()
        }
      })
      setPlayingVideos(new Set())
    }
  }, [conversationId])

  // Update timer display every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerUpdateTrigger(prev => prev + 1)
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  // Load and apply chat appearance settings
  useEffect(() => {
    if (!conversationId || !user) {
      setAppearanceSettings(null)
      applyDefaultAppearance()
      return
    }

    const loadAppearanceSettings = async () => {
      try {
        // First try conversation-specific settings
        let { data, error } = await supabase
          .from('chat_appearance_settings')
          .select('*')
          .eq('user_id', user.id)
          .eq('conversation_id', conversationId)
          .single()

        // If no conversation-specific settings, try global
        if (error && error.code === 'PGRST116') {
          const { data: globalData } = await supabase
            .from('chat_appearance_settings')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_global', true)
            .single()
          
          data = globalData
        }

        if (data) {
          setAppearanceSettings(data)
          applyAppearanceSettings(data)
        } else {
          // Check localStorage for temporary settings
          const stored = localStorage.getItem('chatAppearanceSettings')
          if (stored) {
            const parsed = JSON.parse(stored)
            if (parsed.conversationId === conversationId || parsed.conversationId === 'global') {
              applyAppearanceFromObject(parsed)
            }
          } else {
            applyDefaultAppearance()
          }
        }
      } catch (error) {
        console.error('Error loading appearance settings:', error)
        applyDefaultAppearance()
      }
    }

    loadAppearanceSettings()

    // Listen for appearance settings updates
    const channel = supabase
      .channel(`appearance-${user.id}-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_appearance_settings',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new.conversation_id === conversationId || payload.new.is_global) {
            setAppearanceSettings(payload.new)
            applyAppearanceSettings(payload.new)
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [conversationId, user])

  const applyAppearanceSettings = (settings) => {
    const messageList = document.querySelector('.flex-1.overflow-y-auto')
    if (!messageList) return

    const root = messageList.style

    // Background
    if (settings.background_type === 'image' && settings.background_image_url) {
      root.backgroundImage = `url(${settings.background_image_url})`
      root.backgroundSize = 'cover'
      root.backgroundPosition = 'center'
      root.backgroundRepeat = 'no-repeat'
      const blur = settings.background_image_blur || 0
      const brightness = 100 + (settings.background_image_brightness || 0)
      root.filter = `blur(${blur * 0.1}px) brightness(${brightness}%)`
    } else if (settings.background_type === 'color' && settings.background_color) {
      root.backgroundImage = 'none'
      root.backgroundColor = settings.background_color
      root.filter = 'none'
    } else if (settings.background_type === 'gradient' && settings.background_gradient) {
      try {
        const gradient = JSON.parse(settings.background_gradient)
        const directionMap = {
          'linear': 'linear-gradient(to bottom,',
          'horizontal': 'linear-gradient(to right,',
          'diagonal': 'linear-gradient(135deg,',
          'radial': 'radial-gradient(circle,'
        }
        const prefix = directionMap[gradient.direction] || directionMap.diagonal
        root.backgroundImage = `${prefix} ${gradient.colors.join(', ')})`
        root.filter = 'none'
      } catch (e) {
        root.backgroundImage = 'none'
        root.filter = 'none'
      }
    } else {
      root.backgroundImage = 'none'
      root.backgroundColor = ''
      root.filter = 'none'
    }

    // Store in localStorage
    localStorage.setItem('chatAppearanceSettings', JSON.stringify({
      conversationId: settings.is_global ? 'global' : conversationId,
      ...settings
    }))
  }

  const applyAppearanceFromObject = (settings) => {
    const messageList = document.querySelector('.flex-1.overflow-y-auto')
    if (!messageList) return

    const root = messageList.style

    if (settings.backgroundType === 'image' && settings.selectedBackgroundImage) {
      root.backgroundImage = `url(${settings.selectedBackgroundImage})`
      root.backgroundSize = 'cover'
      root.backgroundPosition = 'center'
      root.backgroundRepeat = 'no-repeat'
      const blur = settings.backgroundBlur || 0
      const brightness = 100 + (settings.backgroundBrightness || 0)
      root.filter = `blur(${blur * 0.1}px) brightness(${brightness}%)`
    } else if (settings.backgroundType === 'color' && settings.backgroundColor) {
      root.backgroundImage = 'none'
      root.backgroundColor = settings.backgroundColor
      root.filter = 'none'
    } else if (settings.backgroundType === 'gradient' && settings.gradientColors) {
      const directionMap = {
        'linear': 'linear-gradient(to bottom,',
        'horizontal': 'linear-gradient(to right,',
        'diagonal': 'linear-gradient(135deg,',
        'radial': 'radial-gradient(circle,'
      }
      const prefix = directionMap[settings.gradientDirection] || directionMap.diagonal
      root.backgroundImage = `${prefix} ${settings.gradientColors.join(', ')})`
      root.filter = 'none'
    } else {
      root.backgroundImage = 'none'
      root.backgroundColor = ''
      root.filter = 'none'
    }
  }

  const applyDefaultAppearance = () => {
    const messageList = document.querySelector('.flex-1.overflow-y-auto')
    if (!messageList) return

    const root = messageList.style
    root.backgroundImage = 'none'
    root.backgroundColor = ''
    root.filter = 'none'
  }

  // Function to fetch reactions for messages
  const fetchMessageReactions = async (messageIds) => {
    if (!messageIds || messageIds.length === 0) return

    try {
      const { data: reactions, error } = await supabase
        .from('message_reactions')
        .select(`
          *,
          user_profiles!user_id(
            id,
            username
          )
        `)
        .in('message_id', messageIds)

      if (error) throw error

      // Group reactions by message_id
      const reactionsByMessage = {}
      reactions?.forEach(reaction => {
        if (!reactionsByMessage[reaction.message_id]) {
          reactionsByMessage[reaction.message_id] = []
        }
        reactionsByMessage[reaction.message_id].push(reaction)
      })

      setMessageReactions(prev => ({
        ...prev,
        ...reactionsByMessage
      }))
    } catch (error) {
      console.error('Error fetching message reactions:', error)
    }
  }

  // Function to fetch pinned messages
  const fetchPinnedMessages = useCallback(async () => {
    if (!conversationId || !user) return

    try {
      // Get pinned message IDs
      const { data: pinned, error } = await supabase
        .from('pinned_messages')
        .select('message_id')
        .eq('conversation_id', conversationId)
        .order('pinned_at', { ascending: false })

      if (error) throw error

      const messageIds = pinned?.map(p => p.message_id) || []
      setPinnedIds(messageIds)

      if (messageIds.length === 0) {
        setPinnedMessages([])
        return
      }

      // Get user-specific deletions
      const { data: userDeletions } = await supabase
        .from('user_message_deletions')
        .select('message_id')
        .eq('user_id', user.id)

      const deletedMessageIds = userDeletions?.map(d => d.message_id) || []
      const visiblePinnedIds = messageIds.filter(id => !deletedMessageIds.includes(id))

      if (visiblePinnedIds.length === 0) {
        setPinnedMessages([])
        return
      }

      // Fetch full message data for pinned messages
      const { data: pinnedMsgs, error: msgError } = await supabase
        .from('messages')
        .select(`
          *,
          sender:user_profiles!sender_id(
            id,
            username,
            profile_picture,
            send_read_receipts
          )
        `)
        .in('id', visiblePinnedIds)

      if (msgError) throw msgError

      // Order by pinned_at order
      const ordered = visiblePinnedIds
        .map(id => pinnedMsgs?.find(msg => msg.id === id))
        .filter(Boolean)

      setPinnedMessages(ordered)
    } catch (error) {
      console.error('Error fetching pinned messages:', error)
      setPinnedMessages([])
    }
  }, [conversationId, user?.id])

  useEffect(() => {
    if (!conversationId || !user) {
      setLoading(false)
      return
    }
    
    let mounted = true

    async function fetchMessages() {
      try {
        setLoading(true)
        
        // First, get blocked users
        const { data: blockedUsers, error: blockedError } = await supabase
          .from('blocked_users')
          .select('blocked_id')
          .eq('blocker_id', user.id)

        if (blockedError) throw blockedError

        const blockedIds = blockedUsers?.map(b => b.blocked_id) || []
        
        // Get user-specific deletions
        const { data: userDeletions, error: deletionError } = await supabase
          .from('user_message_deletions')
          .select('message_id')
          .eq('user_id', user.id)

        if (deletionError) throw deletionError

        const deletedMessageIds = userDeletions?.map(d => d.message_id) || []

        let query = supabase
          .from('messages')
          .select(`
            *,
            sender:user_profiles!sender_id(
              id,
              username,
              profile_picture,
              send_read_receipts
            )
          `)
          .eq('conversation_id', conversationId)

        // Exclude user-specific deletions
        if (deletedMessageIds.length > 0) {
          query = query.not('id', 'in', `(${deletedMessageIds.join(',')})`)
        }

        const { data, error } = await query.order('sent_at', { ascending: true })

        if (error) throw error

        if (mounted) {
          // Filter out messages from blocked users
          const filteredMessages = data?.filter(msg => 
            !blockedIds.includes(msg.sender_id)
          ) || []
          
          setMessages(filteredMessages)
          
          // Fetch replied messages data
          const messagesWithReplies = filteredMessages.filter(msg => msg.reply_to)
          if (messagesWithReplies.length > 0) {
            const replyToIds = [...new Set(messagesWithReplies.map(msg => msg.reply_to).filter(Boolean))]
            const { data: repliedMsgs, error: repliedError } = await supabase
              .from('messages')
              .select(`
                id,
                content,
                message_type,
                sender_id,
                sender:user_profiles!sender_id(
                  id,
                  username,
                  profile_picture,
                  send_read_receipts
                )
              `)
              .in('id', replyToIds)
            
            if (!repliedError && repliedMsgs) {
              const repliedMap = {}
              repliedMsgs.forEach(msg => {
                repliedMap[msg.id] = msg
              })
              setRepliedMessages(repliedMap)
            }
          }
          
          // Fetch reactions for all messages
          const messageIds = filteredMessages.map(msg => msg.id)
          await fetchMessageReactions(messageIds)
          
          // Fetch pinned messages
          await fetchPinnedMessages()
          
          // Update status to 'delivered' for messages sent by others (when current user opens chat)
          // This will notify the sender that their message was delivered
          const undeliveredMessages = data?.filter(msg => 
            msg.sender_id !== user.id && msg.status === 'sent'
          ) || []
          
          if (undeliveredMessages.length > 0) {
            const messageIds = undeliveredMessages.map(msg => msg.id)
            await supabase
              .from('messages')
              .update({ status: 'delivered' })
              .in('id', messageIds)
          }
        }
      } catch (error) {
        console.error('Error fetching messages:', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchMessages()

    return () => {
      mounted = false
    }
  }, [conversationId, user?.id])

  // Track if this is the first render after loading
  const isFirstRender = useRef(true)
  const prevMessageLengthRef = useRef(0)
  
  // Reset first render flag when conversation changes
  useEffect(() => {
    isFirstRender.current = true
    prevMessageLengthRef.current = 0
  }, [conversationId])
  
  // Auto-scroll to bottom only on initial load (ONCE per conversation)
  useEffect(() => {
    if (messages.length > 0 && !loading && isFirstRender.current) {
      const timer = setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'auto' })
          isFirstRender.current = false
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [loading, conversationId])

  // Auto-scroll to bottom when new messages arrive (only if user is near bottom)
  useEffect(() => {
    const newMessagesAdded = messages.length > prevMessageLengthRef.current
    if (newMessagesAdded && !loading && !isFirstRender.current) {
      // Use a small delay to check scroll position
      const timer = setTimeout(() => {
        if (!messagesEndRef.current) return
        
        // Find the scroll container
        let container = messagesEndRef.current.parentElement
        while (container && container !== document.body) {
          const style = window.getComputedStyle(container)
          if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
            break
          }
          container = container.parentElement
        }
        
        if (!container) {
          container = document.querySelector('.flex-1.overflow-y-auto')
        }
        
        if (container) {
          const scrollTop = container.scrollTop
          const scrollHeight = container.scrollHeight
          const clientHeight = container.clientHeight
          const distanceFromBottom = scrollHeight - scrollTop - clientHeight
          
          // Only auto-scroll if user is already near bottom (within 300px)
          if (distanceFromBottom < 300) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
          }
        }
      }, 150)
      return () => clearTimeout(timer)
    }
    prevMessageLengthRef.current = messages.length
  }, [messages.length, loading])

  // Intersection Observer to track message visibility for read status
  useEffect(() => {
    if (!user) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(async (entry) => {
          if (entry.isIntersecting) {
            const messageId = entry.target.dataset.messageId
            const message = messages.find(msg => msg.id === messageId)
            
            // Only update to 'read' if the message was sent by someone else and is currently 'delivered'
            // AND the current user has read receipts enabled
            if (message && message.sender_id !== user.id && message.status === 'delivered') {
              try {
                // Check user's read receipts preference (use cached profile, default to true if not set)
                const sendReadReceipts = userProfile?.send_read_receipts !== false
                
                // Only send read receipt if user has it enabled
                if (sendReadReceipts) {
                await supabase
                  .from('messages')
                  .update({ status: 'read' })
                  .eq('id', messageId)
                
                // Update local state
                setMessages(prev => prev.map(msg => 
                  msg.id === messageId ? { ...msg, status: 'read' } : msg
                ))
                }
              } catch (error) {
                console.error('Error updating message status to read:', error)
              }
            }
          }
        })
      },
      {
        threshold: 0.5, // Message is considered visible when 50% is in viewport
        rootMargin: '0px'
      }
    )

    // Observe all message elements
    Object.values(messageRefs.current).forEach(ref => {
      if (ref) observer.observe(ref)
    })

    return () => {
      observer.disconnect()
    }
  }, [messages, user?.id, userProfile?.send_read_receipts])

  useEffect(() => {
    if (!conversationId || !user) return
    
    const messagesChannel = supabase
      .channel(`messages-${conversationId}`, {
        config: {
          broadcast: { self: true }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          // Check if sender is blocked
          const { data: isBlocked, error: blockedError } = await supabase.rpc('is_user_blocked', {
            blocker_uuid: user.id,
            blocked_uuid: payload.new.sender_id
          })

          if (blockedError) {
            console.error('Error checking block status:', blockedError)
            return
          }

          // Don't show messages from blocked users
          if (isBlocked) {
            return
          }

          const { data: senderProfile, error } = await supabase
            .from('user_profiles')
            .select('id, username, profile_picture, send_read_receipts')
            .eq('id', payload.new.sender_id)
            .single()

          if (error) {
            console.error('Error fetching sender profile:', error)
            return
          }

          // If this message is a reply, fetch the original message
          let repliedMsg = null
          if (payload.new.reply_to) {
            const { data: replied, error: repliedError } = await supabase
              .from('messages')
              .select(`
                id,
                content,
                message_type,
                sender_id,
                sender:user_profiles!sender_id(
                  id,
                  username,
                  profile_picture,
                  send_read_receipts
                )
              `)
              .eq('id', payload.new.reply_to)
              .single()
            
            if (!repliedError && replied) {
              repliedMsg = replied
              setRepliedMessages(prev => ({
                ...prev,
                [replied.id]: replied
              }))
            }
          }

          setMessages(prev => {
            const exists = prev.some(msg => msg.id === payload.new.id)
            if (exists) {
              return prev
            }
            
            const newMessage = {
              ...payload.new,
              sender: senderProfile
            }
            
            // Fetch reactions for the new message
            fetchMessageReactions([newMessage.id])
            
            return [...prev, newMessage]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('Real-time UPDATE received:', payload.new.id, payload.new)
          
          setMessages(prev => {
            const messageExists = prev.some(msg => msg.id === payload.new.id)
            
            if (!messageExists) {
              console.log('Message not in list, skipping update:', payload.new.id)
              return prev
            }
            
            return prev.map(msg => {
              if (msg.id !== payload.new.id) return msg
              
              // Merge all updated fields explicitly for edits and deletions
              const updatedMessage = {
                ...msg,
                ...payload.new,
                // Preserve nested sender object already fetched
                sender: msg.sender || payload.new.sender
              }
              
              // Log specific changes for debugging
              if (payload.new.content !== msg.content) {
                console.log('Message content updated via real-time:', {
                  old: msg.content,
                  new: payload.new.content
                })
              }
              if (payload.new.is_deleted !== msg.is_deleted) {
                console.log('Message deletion status updated via real-time:', {
                  old: msg.is_deleted,
                  new: payload.new.is_deleted,
                  deletion_type: payload.new.deletion_type
                })
              }
              if (payload.new.is_edited !== msg.is_edited || payload.new.edited_at !== msg.edited_at) {
                console.log('Message edit status updated via real-time:', {
                  is_edited: payload.new.is_edited,
                  edited_at: payload.new.edited_at,
                  content_changed: payload.new.content !== msg.content
                })
              }
              
              return updatedMessage
            })
          })
        }
      )
      .subscribe((status) => {
        console.log('Messages channel subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to real-time updates for messages')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to messages channel')
        } else if (status === 'TIMED_OUT') {
          console.warn('⏱️ Subscription to messages channel timed out')
        }
      })

    return () => {
      console.log('Unsubscribing from messages channel')
      messagesChannel.unsubscribe()
    }
  }, [conversationId, user?.id])

  // Real-time subscription for user-specific deletions
  useEffect(() => {
    if (!conversationId || !user) return
    
    const deletionsChannel = supabase
      .channel(`user-deletions-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_message_deletions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // Remove the message from the user's view
          setMessages(prev => prev.filter(msg => msg.id !== payload.new.message_id))
        }
      )
      .subscribe()

    return () => {
      deletionsChannel.unsubscribe()
    }
  }, [conversationId, user?.id])

  // Real-time subscription for message reactions
  useEffect(() => {
    if (!conversationId || !user) return
    
    const reactionsChannel = supabase
      .channel(`reactions-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=in.(${messages.map(m => m.id).join(',')})`
        },
        async (payload) => {
          // Fetch user profile for the reaction
          const { data: userProfile, error } = await supabase
            .from('user_profiles')
            .select('id, username')
            .eq('id', payload.new.user_id)
            .single()

          if (error) {
            console.error('Error fetching user profile for reaction:', error)
            return
          }

          // Update reactions state
          setMessageReactions(prev => ({
            ...prev,
            [payload.new.message_id]: [
              ...(prev[payload.new.message_id] || []),
              {
                ...payload.new,
                user_profiles: userProfile
              }
            ]
          }))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=in.(${messages.map(m => m.id).join(',')})`
        },
        (payload) => {
          // Remove reaction from state
          setMessageReactions(prev => ({
            ...prev,
            [payload.old.message_id]: (prev[payload.old.message_id] || []).filter(
              reaction => reaction.id !== payload.old.id
            )
          }))
        }
      )
      .subscribe()

    return () => {
      reactionsChannel.unsubscribe()
    }
  }, [conversationId, user?.id, messages])

  // Real-time subscription for pinned messages
  useEffect(() => {
    if (!conversationId || !user || !fetchPinnedMessages) return
    
    const pinnedChannel = supabase
      .channel(`pinned-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pinned_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        () => {
          console.log('Pinned message inserted, refreshing...')
          fetchPinnedMessages()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'pinned_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        () => {
          console.log('Pinned message deleted, refreshing...')
          fetchPinnedMessages()
        }
      )
      .subscribe((status) => {
        console.log('Pinned messages channel status:', status)
      })

    return () => {
      pinnedChannel.unsubscribe()
    }
  }, [conversationId, user?.id, fetchPinnedMessages])

  const handleMessageClick = (messageId) => {
    // If options menu is open for this message, close it on click
    if (showMessageOptions === messageId) {
      setShowMessageOptions(null)
      return
    }
    // Otherwise, toggle reaction picker
    setShowReactionPicker(showReactionPicker === messageId ? null : messageId)
  }

  // Handle long press for message options
  const handleMessageLongPress = (messageId, event) => {
    event.preventDefault()
    event.stopPropagation()
    
    const message = messages.find(msg => msg.id === messageId)
    if (!message) return
    
    // Toggle: if menu is already open for this message, close it
    if (showMessageOptions === messageId) {
      setShowMessageOptions(null)
      return
    }
    
    // Calculate position for the menu
    const rect = event.currentTarget.getBoundingClientRect()
    setMessageOptionsPosition({
      x: rect.left + rect.width / 2,
      y: rect.top
    })
    
    setShowMessageOptions(messageId)
  }

  // Handle right click for message options
  const handleMessageRightClick = (messageId, event) => {
    console.log('=== handleMessageRightClick START ===')
    console.log('messageId:', messageId)
    console.log('event:', event)
    
    event.preventDefault()
    event.stopPropagation()
    
    console.log('handleMessageRightClick called for message:', messageId)
    
    const message = messages.find(msg => msg.id === messageId)
    console.log('Found message:', message)
    
    if (!message) {
      console.log('Message not found:', messageId)
      return
    }
    
    console.log('User ID:', user?.id)
    console.log('Message sender ID:', message.sender_id)
    
    // Toggle: if menu is already open for this message, close it
    if (showMessageOptions === messageId) {
      console.log('Menu already open for this message, closing...')
      setShowMessageOptions(null)
      return
    }
    
    console.log('Opening options menu for message:', messageId)
    console.log('Current showMessageOptions:', showMessageOptions)
    
    // Calculate position for the menu (fallback for non-mouse events)
    let x = event.clientX
    let y = event.clientY
    if ((!x && !y) || Number.isNaN(x) || Number.isNaN(y)) {
      const rect = event.currentTarget.getBoundingClientRect()
      x = rect.left + rect.width / 2
      y = rect.top
    }
    const position = { x, y }
    console.log('Menu position:', position)

    setMessageOptionsPosition(position)
    setShowMessageOptions(messageId)
    
    console.log('=== handleMessageRightClick END ===')
  }

  // Handle touch start for long press detection
  const handleTouchStart = (messageId, event) => {
    const message = messages.find(msg => msg.id === messageId)
    if (!message) return
    
    longPressTimer.current = setTimeout(() => {
      handleMessageLongPress(messageId, event)
    }, longPressThreshold)
  }

  // Handle touch end to cancel long press
  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  // Handle touch move to cancel long press
  const handleTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  // Handle reply to message
  const handleReplyToMessage = (messageToReply) => {
    if (window.handleReplyMessage) {
      window.handleReplyMessage(messageToReply)
    }
  }

  // Handle scroll to original message
  const handleScrollToMessage = (messageId) => {
    const messageElement = messageRefs.current[messageId]
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Highlight the message briefly
      messageElement.classList.add('ring-2', 'ring-blue-500')
      setTimeout(() => {
        messageElement.classList.remove('ring-2', 'ring-blue-500')
      }, 2000)
    }
  }

  // Handle message deletion success
  const handleDeleteSuccess = (messageId, deletionType) => {
    if (deletionType === 'for_me') {
      // For "Delete for Me", remove the message from the user's view
      setMessages(prev => prev.filter(msg => msg.id !== messageId))
    } else if (deletionType === 'for_everyone') {
      // For "Delete for Everyone", update the message to show as deleted
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          return {
            ...msg,
            is_deleted: true,
            deleted_at: new Date().toISOString(),
            deleted_by: user.id,
            deletion_type: deletionType
          }
        }
        return msg
      }))
    }
    
    // Close the options menu
    setShowMessageOptions(null)
  }

  // Close message options menu
  const closeMessageOptions = () => {
    setShowMessageOptions(null)
  }

  // Check if message can be deleted (within 10 minutes)
  const canDeleteMessage = (message) => {
    if (!message || !message.sent_at) return false
    const messageTime = new Date(message.sent_at)
    const now = new Date()
    const diffMinutes = (now - messageTime) / (1000 * 60)
    const canDelete = diffMinutes <= 10
    console.log(`Message ${message.id}: ${diffMinutes.toFixed(2)} minutes old, can delete: ${canDelete}`)
    return canDelete
  }

  const handleReactionAdded = () => {
    // Refresh reactions for all messages
    const messageIds = messages.map(msg => msg.id)
    fetchMessageReactions(messageIds)
  }

  const getCurrentSearchQuery = () => {
    return searchQuery
  }

  // Scroll to target message when targetMessageId changes
  useEffect(() => {
    if (targetMessageId && messages.length > 0) {
      const messageElement = document.querySelector(`[data-message-id="${targetMessageId}"]`)
      if (messageElement) {
        setTimeout(() => {
          messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          // Highlight the message temporarily
          messageElement.classList.add('ring-2', 'ring-yellow-400', 'ring-opacity-50')
          setTimeout(() => {
            messageElement.classList.remove('ring-2', 'ring-yellow-400', 'ring-opacity-50')
          }, 3000)
        }, 100)
      }
    }
  }, [targetMessageId, messages])

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleDateString()
  }

  const getInitials = (username) => {
    return username?.substring(0, 2).toUpperCase() || 'U'
  }

  const getAvatarColor = (userId) => {
    const colors = ['bg-blue-600', 'bg-purple-600', 'bg-green-600', 'bg-pink-600', 'bg-orange-600', 'bg-teal-600']
    const index = parseInt(userId?.substring(0, 2), 16) % colors.length
    return colors[index]
  }

  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl)
    setIsImageModalOpen(true)
  }

  const closeImageModal = () => {
    setIsImageModalOpen(false)
    setSelectedImage(null)
  }

  if (!conversationId) {
    return (
      <div className="flex-1 overflow-y-auto px-6 py-6 flex items-center justify-center">
        <div className="text-gray-400 text-center">
          <p>No conversation selected</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto px-6 py-6 flex items-center justify-center">
        <div className="text-gray-400">Loading messages...</div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-6 py-6 flex items-center justify-center">
        <div className="text-gray-400 text-center">
          <p>No messages yet</p>
          <p className="text-sm mt-2">Start the conversation!</p>
        </div>
      </div>
    )
  }

  // Helper function to get bubble styles from appearance settings
  const getBubbleStyles = (isSent) => {
    if (!appearanceSettings) {
      // Default styles
      return {
        backgroundColor: isSent ? '#2563eb' : '#374151',
        borderRadius: '18px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        opacity: 1,
        border: 'none',
        fontSize: '0.875rem'
      }
    }

    const bubbleColor = isSent 
      ? appearanceSettings.my_bubble_color || '#2563eb'
      : appearanceSettings.their_bubble_color || '#374151'

    const radiusMap = {
      'rounded': '18px',
      'pill': '24px',
      'squared': '8px',
      'minimal': '4px'
    }

    const shadowMap = {
      'none': 'none',
      'subtle': '0 1px 2px rgba(0,0,0,0.1)',
      'medium': '0 2px 8px rgba(0,0,0,0.15)',
      'elevated': '0 4px 16px rgba(0,0,0,0.2)'
    }

    const fontSizeMap = {
      'small': '0.875rem',
      'medium': '1rem',
      'large': '1.125rem'
    }

    return {
      backgroundColor: appearanceSettings.bubble_style === 'outlined' ? 'transparent' : bubbleColor,
      borderRadius: radiusMap[appearanceSettings.bubble_shape] || '18px',
      boxShadow: shadowMap[appearanceSettings.bubble_shadow] || '0 2px 8px rgba(0,0,0,0.15)',
      opacity: appearanceSettings.bubble_opacity ?? 1,
      border: appearanceSettings.bubble_style === 'outlined' ? `2px solid ${bubbleColor}` : 'none',
      fontSize: fontSizeMap[appearanceSettings.font_size] || '1rem',
      color: getContrastColor(bubbleColor)
    }
  }

  // Helper to get text color contrast
  const getContrastColor = (hex) => {
    if (!hex || hex.length < 7) return '#ffffff'
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 128 ? '#000000' : '#ffffff'
  }

  // Helper function to render a message
  const renderMessage = (msg, isPinned = false) => {
    const isSent = msg.sender_id === user?.id
    const sender = msg.sender
    const isDeleted = msg.is_deleted
    const deletionType = msg.deletion_type
    const bubbleStyles = getBubbleStyles(isSent)

    // Get spacing from appearance settings
    const spacingMap = {
      'compact': '0.5rem',
      'normal': '1rem',
      'comfortable': '1.5rem'
    }
    const messageSpacing = appearanceSettings?.message_spacing || 'normal'
    
    return (
      <div
        key={msg.id}
        ref={(el) => {
          if (el && !isPinned) messageRefs.current[msg.id] = el
        }}
        data-message-id={msg.id}
        className={`flex ${isSent ? 'justify-end' : 'justify-start'} ${isPinned ? 'opacity-90' : ''}`}
        style={{ 
          marginBottom: spacingMap[messageSpacing] || '1rem',
          justifyContent: appearanceSettings?.message_alignment === 'centered' && !isSent ? 'center' : undefined
        }}
      >
        <div className={`flex items-start gap-2 sm:gap-3 max-w-[85%] sm:max-w-[70%] ${isSent ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className="relative w-10 h-10 flex-shrink-0">
            {sender?.profile_picture ? (
              <img 
                src={sender.profile_picture} 
                alt={sender.username || 'User'} 
                className="profile-picture avatar w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className={`avatar ${getAvatarColor(sender?.id)} w-10 h-10 rounded-full flex items-center justify-center`}>
                <span className="text-white font-semibold text-xs">
                  {getInitials(sender?.username)}
                </span>
              </div>
            )}
          </div>

          <div className={`flex flex-col ${isSent ? 'items-end' : 'items-start'} flex-1 min-w-0`}>
            {!isSent && (
              <span className="text-gray-400 text-xs mb-1 px-1">
                {sender?.username || 'Unknown User'}
              </span>
            )}
            
            {/* Scheduled badge - show if message matches a scheduled one */}
            {isSent && scheduledMessageIds.has(msg.id) && (
              <div className="mb-1 px-2 py-0.5 bg-yellow-600/20 text-yellow-400 text-xs font-medium rounded-full border border-yellow-600/30 inline-flex items-center space-x-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Scheduled</span>
              </div>
            )}

            {/* Timer icon for disappearing messages */}
            {msg.expires_at && !msg.is_deleted && (() => {
              // Use timerUpdateTrigger to force recalculation
              const _ = timerUpdateTrigger
              const expiresAt = new Date(msg.expires_at)
              const now = new Date()
              const timeRemaining = expiresAt - now
              const hours = Math.floor(timeRemaining / (1000 * 60 * 60))
              const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))
              
              let timeText = ''
              if (timeRemaining <= 0) {
                timeText = 'Expired'
              } else if (hours > 0) {
                timeText = `${hours}h ${minutes > 0 ? minutes + 'm' : ''}`.trim()
              } else if (minutes > 0) {
                timeText = `${minutes}m`
              } else {
                timeText = '<1m'
              }
              
              return (
                <div className={`mb-1 ${isSent ? 'ml-auto' : ''} inline-flex items-center space-x-1 text-yellow-400 text-xs`} title={`Expires in ${timeText}`}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{timeText}</span>
                </div>
              )
            })()}

            {/* Reply Preview */}
            {msg.reply_to && repliedMessages[msg.reply_to] && (
              <div className="mb-2">
                <div
                  onClick={() => handleScrollToMessage(msg.reply_to)}
                  className={`relative cursor-pointer group mb-1 ${isSent ? 'items-end' : 'items-start'}`}
                >
                  {/* Connecting line */}
                  <div className={`absolute ${isSent ? 'right-0' : 'left-0'} top-0 w-0.5 h-6 bg-blue-500/50`}></div>
                  
                  {/* Quoted message preview */}
                  <div className={`bg-slate-700/60 border-l-4 border-blue-500 rounded-l-lg rounded-r p-2 text-xs hover:bg-slate-700/80 transition-colors ${isSent ? 'ml-auto max-w-[80%]' : 'max-w-[80%]'}`}>
                    <div className="flex items-center space-x-1 mb-0.5">
                      <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      <span className="text-blue-400 font-medium">
                        {repliedMessages[msg.reply_to].sender?.username || 'Unknown'}
                      </span>
                    </div>
                    <p className="text-slate-300 line-clamp-2">
                      {repliedMessages[msg.reply_to].content || 
                       (repliedMessages[msg.reply_to].message_type === 'image' ? '📷 Image' : 
                        repliedMessages[msg.reply_to].message_type === 'voice' ? '🎤 Voice message' : 
                        repliedMessages[msg.reply_to].message_type === 'video' ? '🎥 Video' :
                        'Message')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="relative group">
              <div
                className={`message-bubble px-3 sm:px-4 py-2 sm:py-2.5 transition-opacity touch-manipulation ${
                  isDeleted 
                    ? 'opacity-60 cursor-default' 
                    : 'cursor-pointer hover:opacity-90 active:opacity-75'
                }`}
                style={{
                  ...bubbleStyles,
                  borderRadius: bubbleStyles.borderRadius,
                  opacity: isDeleted ? 0.6 : bubbleStyles.opacity
                }}
                onClick={(e) => {
                  if (isDeleted) return
                  if (msg.message_type !== 'voice') {
                    handleMessageClick(msg.id)
                  }
                }}
                onContextMenu={(e) => {
                  if (isDeleted) return
                  handleMessageRightClick(msg.id, e)
                }}
                onTouchStart={(e) => {
                  if (isDeleted) return
                  handleTouchStart(msg.id, e)
                }}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
              >
                {isDeleted ? (
                  <div className="flex items-center space-x-2 text-slate-400 italic">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span className="text-sm">
                      {deletionType === 'for_everyone' ? 'Message deleted' : 'This message was deleted'}
                    </span>
                  </div>
                ) : (
                  <>
                    {/* Forwarded label */}
                    {msg.is_forwarded && (
                      <div className="mb-2 flex items-center space-x-1 text-xs text-slate-300 opacity-75">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <span>Forwarded</span>
                      </div>
                    )}
                    
                    {msg.message_type === 'image' && msg.payload?.url && (
                      <div className="mb-2">
                        <img
                          src={msg.payload.url}
                          alt={msg.payload.filename || 'Image'}
                          className="max-w-xs max-h-64 object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          style={{ aspectRatio: 'auto' }}
                          onClick={() => handleImageClick(msg.payload.url)}
                        />
                      </div>
                    )}

                    {msg.message_type === 'voice' && msg.payload?.url && (
                      <div className="mb-2 relative">
                        <AudioPlayer
                          audioUrl={msg.payload.url}
                          duration={msg.duration || msg.payload.duration}
                          isSent={isSent}
                        />
                        <button
                          onClick={() => handleMessageClick(msg.id)}
                          className="mt-1 px-2 py-1 bg-gray-600 hover:bg-gray-500 text-gray-300 hover:text-white rounded-full text-xs font-medium transition-colors duration-200 flex items-center space-x-1"
                        >
                          <span className="text-xs">😊</span>
                          <span className="text-xs">React</span>
                        </button>
                      </div>
                    )}

                    {msg.message_type === 'video' && msg.payload?.url && (
                      <div className="mb-2">
                        <VideoPlayer
                          video={msg.payload.url}
                          thumbnail={msg.payload.thumbnail}
                          duration={msg.payload.duration}
                          messageId={msg.id}
                          onPlayStart={(messageId) => {
                            setPlayingVideos(prev => {
                              const newSet = new Set(prev)
                              newSet.add(messageId)
                              
                              // If exceeds limit, pause oldest video
                              if (newSet.size > maxConcurrentVideos) {
                                const videos = Array.from(newSet)
                                const oldestVideoId = videos[0]
                                // Dispatch pause event for oldest video
                                const event = new CustomEvent('pauseVideo', { detail: { messageId: oldestVideoId } })
                                document.dispatchEvent(event)
                                newSet.delete(oldestVideoId)
                              }
                              
                              return newSet
                            })
                          }}
                          onPlayEnd={(messageId) => {
                            setPlayingVideos(prev => {
                              const newSet = new Set(prev)
                              newSet.delete(messageId)
                              return newSet
                            })
                          }}
                          onDownload={() => {
                            const link = document.createElement('a')
                            link.href = msg.payload.url
                            link.download = msg.payload.filename || 'video.mp4'
                            link.click()
                          }}
                          onForward={() => {
                            // Handle forward functionality
                            console.log('Forward video:', msg.id)
                          }}
                          onDelete={() => {
                            // Handle delete functionality
                            console.log('Delete video:', msg.id)
                          }}
                          onCopyLink={() => {
                            navigator.clipboard.writeText(msg.payload.url)
                            alert('Video link copied to clipboard')
                          }}
                        />
                      </div>
                    )}
                    
                    {msg.content && (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        <HighlightedText 
                          text={msg.content} 
                          searchQuery={searchResults.length > 0 ? getCurrentSearchQuery() : ''} 
                        />
                      </p>
                    )}
                  </>
                )}
              </div>

              {!isDeleted && (
                <>
                  {showReactionPicker === msg.id && (
                    <ReactionPicker
                      messageId={msg.id}
                      onReactionAdded={handleReactionAdded}
                      onClose={() => setShowReactionPicker(null)}
                    />
                  )}
                </>
              )}
            </div>

            {!isDeleted && (
              <ReactionDisplay
                messageId={msg.id}
                reactions={messageReactions[msg.id] || []}
              />
            )}

            <span className="text-gray-500 text-xs mt-1 px-1">
              {formatTimestamp(msg.sent_at)}
            </span>
            {(msg.is_edited || msg.edited_at) && (
              <span className="text-gray-500 text-xs mt-1 px-1 italic">Edited</span>
            )}
            
            {isSent && !isDeleted && (
              <div className="mt-1 px-1">
                <MessageStatus status={msg.status} isSent={isSent} sender={sender} />
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col">
      <div className="flex-1 max-w-4xl mx-auto w-full">
        {/* Pinned Messages Banner */}
        {pinnedMessages.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setPinnedExpanded(!pinnedExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/50 hover:bg-slate-800/70 rounded-lg border border-slate-700 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
                <span className="text-white font-medium">
                  {pinnedMessages.length} pinned {pinnedMessages.length === 1 ? 'message' : 'messages'}
                </span>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${pinnedExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {pinnedExpanded && (
              <div className="mt-2 space-y-2 bg-slate-800/30 rounded-lg p-4 border border-slate-700">
                {pinnedMessages.map(msg => renderMessage(msg, true))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg) => renderMessage(msg))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Typing Indicator - fixed at bottom of scrollable area */}
      <div className="max-w-4xl mx-auto w-full">
        <TypingIndicator conversationId={conversationId} />
      </div>
      
      {/* Image Modal */}
      <ImageModal
        imageUrl={selectedImage}
        isOpen={isImageModalOpen}
        onClose={closeImageModal}
      />

      {/* Message Options Menu - Always render so ForwardModal can persist */}
      <MessageOptionsMenu
        messageId={showMessageOptions}
        message={messages.find(msg => msg.id === showMessageOptions)}
        conversationId={conversationId}
        conversation={conversation}
        isVisible={!!showMessageOptions}
        position={messageOptionsPosition}
        onClose={closeMessageOptions}
        onDeleteSuccess={handleDeleteSuccess}
        onReply={handleReplyToMessage}
      />
    </div>
  )
}

export default MessageList
