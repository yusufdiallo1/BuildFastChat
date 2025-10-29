import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { archiveConversation, unarchiveConversation, archiveMultipleConversations } from '../utils/archiveHelpers'

function UserSidebar({ selectedConversationId, onConversationSelect, showArchived = false }) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [updateTrigger, setUpdateTrigger] = useState(0)
  const [contextMenu, setContextMenu] = useState(null) // { conversationId, x, y }
  const [selectedConversations, setSelectedConversations] = useState(new Set())
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const contextMenuRef = useRef(null)

  // Get draft for a conversation
  const getDraft = (convId) => {
    if (!user || !convId) return null
    const key = `draft_${user.id}_${convId}`
    return localStorage.getItem(key)
  }

  // Check if conversation is muted
  const [mutedConversations, setMutedConversations] = useState({})
  
  const checkMuteStatus = async (convId) => {
    if (!user || !convId) return false
    
    try {
      const { data, error } = await supabase
        .from('muted_conversations')
        .select('muted_until')
        .eq('user_id', user.id)
        .eq('conversation_id', convId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking mute status:', error)
        return false
      }

      if (!data) return false

      // Check if mute has expired
      if (data.muted_until) {
        const now = new Date()
        const mutedUntil = new Date(data.muted_until)
        if (mutedUntil <= now) {
          // Mute expired, remove it
          await supabase
            .from('muted_conversations')
            .delete()
            .eq('user_id', user.id)
            .eq('conversation_id', convId)
          return false
        }
      }
      
      // Muted (either forever or not expired)
      return true
    } catch (error) {
      console.error('Error checking mute status:', error)
      return false
    }
  }

  // Fetch mute status for all conversations
  const fetchMuteStatuses = async () => {
    if (!user || conversations.length === 0) return

    try {
      const convIds = conversations.map(c => c.id)
      const { data, error } = await supabase
        .from('muted_conversations')
        .select('conversation_id, muted_until')
        .eq('user_id', user.id)
        .in('conversation_id', convIds)

      if (error) {
        console.error('Error fetching mute statuses:', error)
        return
      }

      const muteMap = {}
      const now = new Date()
      
      data?.forEach(mute => {
        if (mute.muted_until) {
          const mutedUntil = new Date(mute.muted_until)
          // Only include if not expired
          if (mutedUntil > now) {
            muteMap[mute.conversation_id] = true
          }
        } else {
          // Forever muted
          muteMap[mute.conversation_id] = true
        }
      })

      setMutedConversations(muteMap)
    } catch (error) {
      console.error('Error fetching mute statuses:', error)
    }
  }

  const fetchConversations = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      // Get all conversations where user is a participant
      // Filter by archived status based on showArchived prop
      let query = supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          archived,
          conversations!inner(
            id,
            is_group_chat,
            created_at
          )
        `)
        .eq('user_id', user.id)
      
      // Filter by archived status - need to handle null/undefined for active chats
      if (showArchived) {
        query = query.eq('archived', true)
      } else {
        // For active chats, get where archived is false or null
        query = query.or('archived.is.null,archived.eq.false')
      }
      
      const { data: myConvs, error } = await query.order('joined_at', { ascending: false })

      if (error) throw error

      // For each conversation, get the other participant's info and last message
      const convsWithDetails = await Promise.all(
        (myConvs || []).map(async (conv) => {
          if (!conv.conversations) return null

          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conv.conversation_id)

          // Get last message
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('content, sent_at, sender_id')
            .eq('conversation_id', conv.conversation_id)
            .order('sent_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          // Handle group chats
          if (conv.conversations.is_group_chat) {
            const { data: conversation } = await supabase
              .from('conversations')
              .select('name')
              .eq('id', conv.conversation_id)
              .single()

            const draft = getDraft(conv.conversation_id)
            const displayMessage = draft 
              ? `Draft: ${draft.length > 40 ? draft.substring(0, 40) + '...' : draft}`
              : (lastMessage?.content || '')

            return {
              id: conv.conversation_id,
              name: conversation?.name || 'Group Chat',
              timestamp: lastMessage?.sent_at ? formatTimestamp(lastMessage.sent_at) : (conv.conversations?.created_at ? formatTimestamp(conv.conversations.created_at) : ''),
              lastMessage: displayMessage,
              avatarColor: 'bg-green-600',
              initials: 'GC',
              profile_picture: null,
              isGroupChat: true,
              lastMessageTime: lastMessage?.sent_at || conv.conversations?.created_at,
              hasDraft: !!draft
            }
          }

          // Handle one-on-one chats
          const otherUserId = participants?.find(p => p.user_id !== user.id)?.user_id
          
          if (!otherUserId) return null

          // Get other user's profile
          const { data: otherUser } = await supabase
            .from('user_profiles')
            .select('username, profile_picture, is_online, last_seen_at')
            .eq('id', otherUserId)
            .single()

          const draft = getDraft(conv.conversation_id)
          const displayMessage = draft 
            ? `Draft: ${draft.length > 40 ? draft.substring(0, 40) + '...' : draft}`
            : (lastMessage?.content || '')

          return {
            id: conv.conversation_id,
            name: otherUser?.username || 'Unknown',
            timestamp: lastMessage?.sent_at ? formatTimestamp(lastMessage.sent_at) : (conv.conversations?.created_at ? formatTimestamp(conv.conversations.created_at) : ''),
            lastMessage: displayMessage,
            avatarColor: getAvatarColor(otherUserId),
            initials: otherUser?.username ? otherUser.username.substring(0, 2).toUpperCase() : 'U',
            profile_picture: otherUser?.profile_picture,
            isGroupChat: false,
            lastMessageTime: lastMessage?.sent_at || conv.conversations?.created_at,
            isOnline: otherUser?.is_online || false,
            lastSeenAt: otherUser?.last_seen_at,
            otherUserId: otherUserId,
            hasDraft: !!draft
          }
        })
      )

      // Sort by last message time (most recent first)
      const sortedConvs = convsWithDetails
        .filter(c => c !== null)
        .sort((a, b) => {
          const timeA = new Date(a.lastMessageTime || 0).getTime()
          const timeB = new Date(b.lastMessageTime || 0).getTime()
          return timeB - timeA
        })

      setConversations(sortedConvs)
      
      // Fetch mute statuses after conversations are loaded
      if (sortedConvs.length > 0 && user) {
        const convIds = sortedConvs.map(c => c.id)
        const { data: muteData, error: muteError } = await supabase
          .from('muted_conversations')
          .select('conversation_id, muted_until')
          .eq('user_id', user.id)
          .in('conversation_id', convIds)

        if (!muteError && muteData) {
          const muteMap = {}
          const now = new Date()
          
          muteData.forEach(mute => {
            if (mute.muted_until) {
              const mutedUntil = new Date(mute.muted_until)
              if (mutedUntil > now) {
                muteMap[mute.conversation_id] = true
              }
            } else {
              muteMap[mute.conversation_id] = true
            }
          })

          setMutedConversations(muteMap)
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }, [user, showArchived])

  useEffect(() => {
    if (user) {
      fetchConversations()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, showArchived, fetchConversations])

  // Subscribe to real-time NEW CONVERSATIONS (conversation_participants INSERT)
  useEffect(() => {
    if (!user) return

    console.log('Setting up real-time subscription for NEW conversations')

    const newConversationsSubscription = supabase
      .channel('sidebar-new-conversations')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'conversation_participants',
        filter: `user_id=eq.${user.id}`
      }, async (payload) => {
        console.log('NEW conversation detected:', payload.new)
        const newConversationId = payload.new.conversation_id

        try {
          // Check if conversation already exists in list
          setConversations(prev => {
            const exists = prev.some(c => c.id === newConversationId)
            if (exists) {
              console.log('Conversation already in list')
              return prev
            }
            return prev
          })

          // Get conversation details
          const { data: conversation } = await supabase
            .from('conversations')
            .select('id, is_group_chat, name, created_at')
            .eq('id', newConversationId)
            .single()

          // Get last message
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('content, sent_at, sender_id')
            .eq('conversation_id', newConversationId)
            .order('sent_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          let newConversation

          // Handle group chats
          if (conversation?.is_group_chat) {
            const draft = getDraft(newConversationId)
            const displayMessage = draft 
              ? `Draft: ${draft.length > 40 ? draft.substring(0, 40) + '...' : draft}`
              : (lastMessage?.content || '')

            newConversation = {
              id: newConversationId,
              name: conversation?.name || 'Group Chat',
              timestamp: lastMessage?.sent_at ? formatTimestamp(lastMessage.sent_at) : (conversation.created_at ? formatTimestamp(conversation.created_at) : ''),
              lastMessage: displayMessage,
              avatarColor: 'bg-green-600',
              initials: 'GC',
              profile_picture: null,
              isGroupChat: true,
              lastMessageTime: lastMessage?.sent_at || conversation.created_at,
              hasDraft: !!draft
            }
          } else {
            // Handle one-on-one chats
            const { data: participants } = await supabase
              .from('conversation_participants')
              .select('user_id')
              .eq('conversation_id', newConversationId)

            const otherUserId = participants?.find(p => p.user_id !== user.id)?.user_id
            
            if (!otherUserId) {
              console.log('No other user found for conversation')
              return
            }

            // Get other user's profile
            const { data: otherUser } = await supabase
              .from('user_profiles')
              .select('username, profile_picture, is_online, last_seen_at')
              .eq('id', otherUserId)
              .single()

            const draft = getDraft(newConversationId)
            const displayMessage = draft 
              ? `Draft: ${draft.length > 40 ? draft.substring(0, 40) + '...' : draft}`
              : (lastMessage?.content || '')

            newConversation = {
              id: newConversationId,
              name: otherUser?.username || 'Unknown',
              timestamp: lastMessage?.sent_at ? formatTimestamp(lastMessage.sent_at) : (conversation.created_at ? formatTimestamp(conversation.created_at) : ''),
              lastMessage: displayMessage,
              avatarColor: getAvatarColor(otherUserId),
              initials: otherUser?.username ? otherUser.username.substring(0, 2).toUpperCase() : 'U',
              profile_picture: otherUser?.profile_picture,
              isGroupChat: false,
              lastMessageTime: lastMessage?.sent_at || conversation.created_at,
              isOnline: otherUser?.is_online || false,
              lastSeenAt: otherUser?.last_seen_at,
              otherUserId: otherUserId,
              hasDraft: !!draft
            }
          }

          console.log('Adding new conversation to list:', newConversation)
          
          // Add new conversation and re-sort by last message time
          setConversations(prev => {
            const exists = prev.some(c => c.id === newConversationId)
            if (exists) {
              console.log('Conversation already in list (duplicate check)')
              return prev
            }
            const updated = [newConversation, ...prev]
            return updated.sort((a, b) => {
              const timeA = new Date(a.lastMessageTime || 0).getTime()
              const timeB = new Date(b.lastMessageTime || 0).getTime()
              return timeB - timeA
            })
          })
        } catch (error) {
          console.error('Error fetching new conversation details:', error)
        }
      })
      .subscribe()

    return () => {
      console.log('Unsubscribing from new conversations')
      newConversationsSubscription.unsubscribe()
    }
  }, [user])

  // Subscribe to real-time message updates to update last message preview
  useEffect(() => {
    if (!user) return

    // Create a subscription for new messages across all conversations
    const messagesSubscription = supabase
      .channel('sidebar-messages-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, async (payload) => {
        // Get the conversation ID from the new message
        const conversationId = payload.new.conversation_id

        // Find if this conversation is in our list
        setConversations(prev => {
          const conversationIndex = prev.findIndex(c => c.id === conversationId)
          if (conversationIndex === -1) return prev

          // Check for draft - drafts take priority over last message
          const draft = getDraft(conversationId)
          const displayMessage = draft 
            ? `Draft: ${draft.length > 40 ? draft.substring(0, 40) + '...' : draft}`
            : (payload.new.content || '')

          // Update the conversation's last message and timestamp
          const updated = [...prev]
          updated[conversationIndex] = {
            ...updated[conversationIndex],
            lastMessage: displayMessage,
            timestamp: formatTimestamp(payload.new.sent_at),
            lastMessageTime: payload.new.sent_at,
            hasDraft: !!draft
          }
          
          // Re-sort by last message time
          return updated.sort((a, b) => {
            const timeA = new Date(a.lastMessageTime || 0).getTime()
            const timeB = new Date(b.lastMessageTime || 0).getTime()
            return timeB - timeA
          })
        })
      })
      .subscribe()

    return () => {
      messagesSubscription.unsubscribe()
    }
  }, [user])

  // Update last seen times every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setUpdateTrigger(prev => prev + 1)
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  // Subscribe to real-time online status updates
  useEffect(() => {
    if (!user || conversations.length === 0) return

    console.log('Setting up real-time status subscription')

    const statusSubscription = supabase
      .channel('sidebar-status-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_profiles',
        filter: '*'
      }, (payload) => {
        console.log('🔄 User profile updated:', payload.new.id, 'is_online:', payload.new.is_online, payload.new)
        // Update the online status for the specific user
        setConversations(prev => {
          const updated = prev.map(conv => {
            if (!conv.isGroupChat && conv.otherUserId === payload.new.id) {
              console.log('✅ Updating conversation with new online status:', payload.new.is_online)
              return {
                ...conv,
                isOnline: payload.new.is_online,
                lastSeenAt: payload.new.last_seen_at
              }
            }
            return conv
          })
          console.log('📍 Updated conversations:', updated)
          return updated
        })
      })
      .subscribe((status) => {
        console.log('Status subscription:', status)
      })

    return () => {
      console.log('Unsubscribing from status updates')
      statusSubscription.unsubscribe()
    }
  }, [user, conversations])

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
    return date.toLocaleDateString()
  }

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return 'Offline'
    
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
    if (hours < 24) {
      if (hours === 1) return '1 hour ago'
      return `${hours} hours ago`
    }
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString()
  }

  const truncateMessage = (message) => {
    if (!message) return ''
    return message.length > 40 ? message.substring(0, 40) + '...' : message
  }

  const getAvatarColor = (userId) => {
    const colors = ['bg-blue-600', 'bg-purple-600', 'bg-green-600', 'bg-pink-600', 'bg-orange-600', 'bg-teal-600']
    const index = parseInt(userId.substring(0, 2), 16) % colors.length
    return colors[index]
  }

  const handleConversationClick = (conversationId, event) => {
    // Handle double-click to unarchive (if in archived view and setting enabled)
    if (event?.detail === 2 && showArchived) {
      const doubleClickUnarchive = localStorage.getItem('doubleClickUnarchive') !== 'false'
      if (doubleClickUnarchive) {
        handleUnarchive(conversationId)
        return
      }
    }

    // Handle selection with Ctrl/Cmd or Shift
    if (event?.ctrlKey || event?.metaKey) {
      setSelectedConversations(prev => {
        const newSet = new Set(prev)
        if (newSet.has(conversationId)) {
          newSet.delete(conversationId)
        } else {
          newSet.add(conversationId)
        }
        return newSet
      })
      return
    }

    if (event?.shiftKey && selectedConversations.size > 0) {
      // Select range
      const currentIndex = conversations.findIndex(c => c.id === conversationId)
      const selectedIds = Array.from(selectedConversations)
      const firstSelected = conversations.findIndex(c => selectedIds.includes(c.id))
      
      const start = Math.min(currentIndex, firstSelected)
      const end = Math.max(currentIndex, firstSelected)
      
      const rangeIds = conversations.slice(start, end + 1).map(c => c.id)
      setSelectedConversations(new Set([...selectedConversations, ...rangeIds]))
      return
    }

    const params = new URLSearchParams(searchParams)
    params.set('conversation', conversationId)
    navigate(`/chat?${params.toString()}`)
    if (onConversationSelect) {
      onConversationSelect(conversationId)
    }
    setSelectedConversations(new Set())
  }

  const handleArchive = async (conversationId) => {
    if (!user) {
      console.error('Cannot archive: User not logged in')
      return
    }
    
    console.log('Archiving conversation:', conversationId, 'for user:', user.id)
    const result = await archiveConversation(conversationId, user.id)
    
    if (result.success) {
      console.log('Successfully archived conversation:', conversationId)
      // Remove from current list with fade animation
      setConversations(prev => prev.filter(c => c.id !== conversationId))
      setContextMenu(null)
      
      // Show undo notification (you can implement a toast system here)
      const undoTimeout = setTimeout(() => {
        // Auto-remove undo option after 5s
      }, 5000)
      
      // Store for undo
      window.lastArchivedConversation = { id: conversationId, undoTimeout }
    } else {
      console.error('Failed to archive conversation:', result.error)
      alert('Failed to archive conversation. Please try again.')
    }
  }

  const handleUnarchive = async (conversationId) => {
    if (!user) {
      console.error('Cannot unarchive: User not logged in')
      return
    }
    
    console.log('Unarchiving conversation:', conversationId, 'for user:', user.id)
    const result = await unarchiveConversation(conversationId, user.id)
    
    if (result.success) {
      console.log('Successfully unarchived conversation:', conversationId)
      // Remove from archived list
      setConversations(prev => prev.filter(c => c.id !== conversationId))
      setContextMenu(null)
    } else {
      console.error('Failed to unarchive conversation:', result.error)
      alert('Failed to unarchive conversation. Please try again.')
    }
  }

  const handleBulkArchive = async () => {
    if (!user || selectedConversations.size === 0) return
    
    const ids = Array.from(selectedConversations)
    const result = await archiveMultipleConversations(ids, user.id)
    if (result.success) {
      setConversations(prev => prev.filter(c => !selectedConversations.has(c.id)))
      setSelectedConversations(new Set())
      setContextMenu(null)
    }
  }

  const handleContextMenu = (e, conversationId) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      conversationId,
      x: e.clientX,
      y: e.clientY
    })
  }

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setContextMenu(null)
      }
    }

    if (contextMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [contextMenu])

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading conversations...</div>
        </div>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto flex items-center justify-center">
        <div className="text-center p-4" style={{ color: 'var(--text-muted)' }}>No conversations yet</div>
      </div>
    )
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conversation) => {
          const isSelected = selectedConversations.has(conversation.id)
          return (
            <div
              key={conversation.id}
              onClick={(e) => handleConversationClick(conversation.id, e)}
              onContextMenu={(e) => handleContextMenu(e, conversation.id)}
              className={`conversation-card conversation-item px-4 py-3 cursor-pointer border-b transition-all ${
                selectedConversationId === conversation.id ? '' : ''
              } ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
              style={{
                backgroundColor: isSelected 
                  ? 'var(--surface-light)' 
                  : selectedConversationId === conversation.id 
                    ? 'var(--surface-light)' 
                    : 'transparent',
                borderColor: 'var(--border)',
                opacity: 1,
                transition: 'opacity 0.3s ease, transform 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (!isSelected && selectedConversationId !== conversation.id) {
                  e.currentTarget.style.backgroundColor = 'var(--surface)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected && selectedConversationId !== conversation.id) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
            >
          <div className="flex items-center space-x-3">
            {/* Profile Picture */}
            {conversation.profile_picture ? (
              <img 
                src={conversation.profile_picture} 
                alt={conversation.name}
                className="profile-picture avatar w-12 h-12 rounded-full object-cover flex-shrink-0"
              />
            ) : conversation.isGroupChat ? (
              <div className={`avatar ${conversation.avatarColor} w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            ) : (
              <div className={`avatar ${conversation.avatarColor} w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0`}>
                <span className="text-white font-semibold text-sm">
                  {conversation.initials}
                </span>
              </div>
            )}

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                    {conversation.isGroupChat ? conversation.name : `@${conversation.name}`}
                  </h3>
                  {mutedConversations[conversation.id] && (
                    <span className="flex-shrink-0" style={{ color: 'var(--text-muted)' }} title="Muted conversation">
                      🔕
                    </span>
                  )}
                  {!conversation.isGroupChat && conversation.isOnline !== undefined && (
                    <span className="relative inline-flex flex-shrink-0 ml-2" style={{ paddingTop: '3px' }}>
                      {conversation.isOnline ? (
                        <>
                          <span className="absolute w-3 h-3 rounded-full bg-green-500 opacity-75 animate-ping"></span>
                          <span className="relative w-2.5 h-2.5 rounded-full bg-green-500"></span>
                        </>
                      ) : (
                        <>
                          <span className="absolute w-3 h-3 rounded-full bg-red-500 opacity-75 animate-ping"></span>
                          <span className="relative w-2.5 h-2.5 rounded-full bg-red-500"></span>
                        </>
                      )}
                    </span>
                  )}
                </div>
                <span className="text-xs ml-2 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                  {conversation.timestamp}
                </span>
              </div>
              {conversation.lastMessage && (
                <p className={`text-xs truncate mt-1 ${conversation.hasDraft ? 'text-yellow-400 italic' : ''}`} style={conversation.hasDraft ? {} : { color: 'var(--text-muted)' }}>
                  {truncateMessage(conversation.lastMessage)}
                </p>
              )}
              {!conversation.isGroupChat && conversation.isOnline !== undefined && (
                <p className="text-xs mt-1">
                  <span className={conversation.isOnline ? 'text-green-400' : ''} style={conversation.isOnline ? {} : { color: 'var(--text-muted)' }}>
                    {conversation.isOnline ? 'Online' : `Last seen ${formatLastSeen(conversation.lastSeenAt)}`}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
          )
        })}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 frosted-glass rounded-lg shadow-xl border py-2 min-w-[180px]"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--border)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {showArchived ? (
            <button
              onClick={() => handleUnarchive(contextMenu.conversationId)}
              className="w-full text-left px-4 py-2 hover:bg-[var(--surface-light)] transition-colors flex items-center space-x-2"
              style={{ color: 'var(--text-primary)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Unarchive</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => handleArchive(contextMenu.conversationId)}
                className="w-full text-left px-4 py-2 hover:bg-[var(--surface-light)] transition-colors flex items-center space-x-2"
                style={{ color: 'var(--text-primary)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <span>Archive</span>
              </button>
              {selectedConversations.size > 0 && (
                <button
                  onClick={handleBulkArchive}
                  className="w-full text-left px-4 py-2 hover:bg-[var(--surface-light)] transition-colors flex items-center space-x-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  <span>Archive Selected ({selectedConversations.size})</span>
                </button>
              )}
            </>
          )}
        </div>
      )}
    </>
  )
}

export default UserSidebar


