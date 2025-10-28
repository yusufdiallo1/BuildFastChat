import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function UserSidebar({ selectedConversationId, onConversationSelect }) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [updateTrigger, setUpdateTrigger] = useState(0)
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const fetchConversations = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      // Get all conversations where user is a participant
      const { data: myConvs, error } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations!inner(
            id,
            is_group_chat,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })

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

            return {
              id: conv.conversation_id,
              name: conversation?.name || 'Group Chat',
              timestamp: lastMessage?.sent_at ? formatTimestamp(lastMessage.sent_at) : (conv.conversations?.created_at ? formatTimestamp(conv.conversations.created_at) : ''),
              lastMessage: lastMessage?.content || '',
              avatarColor: 'bg-green-600',
              initials: 'GC',
              profile_picture: null,
              isGroupChat: true,
              lastMessageTime: lastMessage?.sent_at || conv.conversations?.created_at
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

          return {
            id: conv.conversation_id,
            name: otherUser?.username || 'Unknown',
            timestamp: lastMessage?.sent_at ? formatTimestamp(lastMessage.sent_at) : (conv.conversations?.created_at ? formatTimestamp(conv.conversations.created_at) : ''),
            lastMessage: lastMessage?.content || '',
            avatarColor: getAvatarColor(otherUserId),
            initials: otherUser?.username ? otherUser.username.substring(0, 2).toUpperCase() : 'U',
            profile_picture: otherUser?.profile_picture,
            isGroupChat: false,
            lastMessageTime: lastMessage?.sent_at || conv.conversations?.created_at,
            isOnline: otherUser?.is_online || false,
            lastSeenAt: otherUser?.last_seen_at,
            otherUserId: otherUserId
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
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchConversations()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

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
            newConversation = {
              id: newConversationId,
              name: conversation?.name || 'Group Chat',
              timestamp: lastMessage?.sent_at ? formatTimestamp(lastMessage.sent_at) : (conversation.created_at ? formatTimestamp(conversation.created_at) : ''),
              lastMessage: lastMessage?.content || '',
              avatarColor: 'bg-green-600',
              initials: 'GC',
              profile_picture: null,
              isGroupChat: true,
              lastMessageTime: lastMessage?.sent_at || conversation.created_at
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

            newConversation = {
              id: newConversationId,
              name: otherUser?.username || 'Unknown',
              timestamp: lastMessage?.sent_at ? formatTimestamp(lastMessage.sent_at) : (conversation.created_at ? formatTimestamp(conversation.created_at) : ''),
              lastMessage: lastMessage?.content || '',
              avatarColor: getAvatarColor(otherUserId),
              initials: otherUser?.username ? otherUser.username.substring(0, 2).toUpperCase() : 'U',
              profile_picture: otherUser?.profile_picture,
              isGroupChat: false,
              lastMessageTime: lastMessage?.sent_at || conversation.created_at,
              isOnline: otherUser?.is_online || false,
              lastSeenAt: otherUser?.last_seen_at,
              otherUserId: otherUserId
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

          // Update the conversation's last message and timestamp
          const updated = [...prev]
          updated[conversationIndex] = {
            ...updated[conversationIndex],
            lastMessage: payload.new.content || '',
            timestamp: formatTimestamp(payload.new.sent_at),
            lastMessageTime: payload.new.sent_at
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

  const handleConversationClick = (conversationId) => {
    const params = new URLSearchParams(searchParams)
    params.set('conversation', conversationId)
    navigate(`/chat?${params.toString()}`)
    if (onConversationSelect) {
      onConversationSelect(conversationId)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <div className="text-gray-400 text-sm">Loading conversations...</div>
        </div>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto flex items-center justify-center">
        <div className="text-gray-400 text-center p-4">No conversations yet</div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conversation) => (
        <div
          key={conversation.id}
          onClick={() => handleConversationClick(conversation.id)}
          className={`px-4 py-3 hover:bg-gray-700 cursor-pointer transition-colors border-b border-gray-700 ${
            selectedConversationId === conversation.id ? 'bg-gray-700' : ''
          }`}
        >
          <div className="flex items-center space-x-3">
            {/* Profile Picture */}
            {conversation.profile_picture ? (
              <img 
                src={conversation.profile_picture} 
                alt={conversation.name}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              />
            ) : conversation.isGroupChat ? (
              <div className={`${conversation.avatarColor} w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            ) : (
              <div className={`${conversation.avatarColor} w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0`}>
                <span className="text-white font-semibold text-sm">
                  {conversation.initials}
                </span>
              </div>
            )}

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <h3 className={`text-white font-medium text-sm truncate ${conversation.isGroupChat ? '' : ''}`}>
                    {conversation.isGroupChat ? conversation.name : `@${conversation.name}`}
                  </h3>
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
                <span className="text-gray-400 text-xs ml-2 flex-shrink-0">
                  {conversation.timestamp}
                </span>
              </div>
              {conversation.lastMessage && (
                <p className="text-gray-400 text-xs truncate mt-1">
                  {truncateMessage(conversation.lastMessage)}
                </p>
              )}
              {!conversation.isGroupChat && conversation.isOnline !== undefined && (
                <p className="text-xs mt-1">
                  <span className={conversation.isOnline ? 'text-green-400' : 'text-gray-500'}>
                    {conversation.isOnline ? 'Online' : `Last seen ${formatLastSeen(conversation.lastSeenAt)}`}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default UserSidebar


