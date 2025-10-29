import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import GroupSettingsModal from './GroupSettingsModal'
import MessageSearch from './MessageSearch'
import MuteModal from './MuteModal'
import VoiceCallModal from './VoiceCallModal'
import { archiveConversation, unarchiveConversation, isConversationArchived } from '../utils/archiveHelpers'
import { useVoiceCall } from '../hooks/useVoiceCall'

function MainChat({ conversationId }) {
  const [searchParams] = useSearchParams()
  const [otherUser, setOtherUser] = useState(null)
  const [conversation, setConversation] = useState(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [onlineStatus, setOnlineStatus] = useState(null)
  const [isBlocked, setIsBlocked] = useState(false)
  const [isBlockedBy, setIsBlockedBy] = useState(false)
  const [blocking, setBlocking] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [blockReason, setBlockReason] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [currentSearchQuery, setCurrentSearchQuery] = useState('')
  const [targetMessageId, setTargetMessageId] = useState(null)
  const [showMuteModal, setShowMuteModal] = useState(false)
  const [isArchived, setIsArchived] = useState(false)
  const { user, userProfile } = useAuth()

  // Voice call functionality
  const {
    callState,
    otherUser: callOtherUser,
    isMuted,
    callDuration,
    connectionError,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute
  } = useVoiceCall(user?.id, userProfile?.username || user?.email || 'User')

  useEffect(() => {
    const messageId = searchParams.get('message')
    setTargetMessageId(messageId)
  }, [searchParams])

  useEffect(() => {
    if (conversationId && user) {
      fetchConversationDetails()
      checkArchiveStatus()
    }
  }, [conversationId, user])

  const checkArchiveStatus = async () => {
    if (!conversationId || !user) return
    const archived = await isConversationArchived(conversationId, user.id)
    setIsArchived(archived)
  }

  const handleArchive = async () => {
    if (!conversationId || !user) return
    const result = await archiveConversation(conversationId, user.id)
    if (result.success) {
      setIsArchived(true)
      // Show notification with undo
      showArchiveNotification(conversationId)
    }
  }

  const handleUnarchive = async () => {
    if (!conversationId || !user) return
    const result = await unarchiveConversation(conversationId, user.id)
    if (result.success) {
      setIsArchived(false)
    }
  }

  const showArchiveNotification = (convId) => {
    // Create a toast notification (simplified - you can enhance with a proper toast system)
    const notification = document.createElement('div')
    notification.className = 'fixed bottom-4 right-4 frosted-glass rounded-lg p-4 shadow-xl border z-50'
    notification.style.borderColor = 'var(--border)'
    notification.style.backgroundColor = 'var(--surface)'
    notification.style.color = 'var(--text-primary)'
    notification.innerHTML = `
      <div class="flex items-center space-x-4">
        <span>Chat archived</span>
        <button id="undo-archive" class="text-indigo-400 hover:text-indigo-300 font-medium">Undo</button>
      </div>
    `
    document.body.appendChild(notification)

    const undoBtn = notification.querySelector('#undo-archive')
    undoBtn.onclick = async () => {
      await unarchiveConversation(convId, user.id)
      notification.remove()
      setIsArchived(false)
    }

    setTimeout(() => {
      notification.remove()
    }, 5000)
  }

  // Listen for keyboard shortcuts
  useEffect(() => {
    if (!conversationId) return

    const handleArchiveEvent = async (e) => {
      if (e.detail.conversationId === conversationId) {
        await handleArchive()
      }
    }

    const handleUnarchiveEvent = async (e) => {
      if (e.detail.conversationId === conversationId) {
        await handleUnarchive()
      }
    }

    window.addEventListener('archiveConversation', handleArchiveEvent)
    window.addEventListener('unarchiveConversation', handleUnarchiveEvent)

    return () => {
      window.removeEventListener('archiveConversation', handleArchiveEvent)
      window.removeEventListener('unarchiveConversation', handleUnarchiveEvent)
    }
  }, [conversationId])

  // Auto-unarchive on new message
  useEffect(() => {
    if (!conversationId || !user || !isArchived) return

    const autoUnarchive = localStorage.getItem('autoUnarchiveOnMessage') !== 'false'
    if (!autoUnarchive) return

    const channel = supabase
      .channel(`auto-unarchive-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          // Check if message is from another user
          if (payload.new.sender_id !== user.id) {
            const result = await unarchiveConversation(conversationId, user.id)
            if (result.success) {
              setIsArchived(false)
            }
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [conversationId, user, isArchived, user?.id])

  // Check if user is blocked when otherUser changes
  useEffect(() => {
    if (otherUser && user) {
      checkBlockStatus()
    }
  }, [otherUser, user])

  const checkBlockStatus = async () => {
    try {
      // Check if current user blocked the other user
      const { data: blockedByMe, error: blockedByMeError } = await supabase.rpc('is_user_blocked', {
        blocker_uuid: user.id,
        blocked_uuid: otherUser.id
      })

      if (blockedByMeError) throw blockedByMeError
      setIsBlocked(blockedByMe)

      // Check if other user blocked the current user
      const { data: blockedByThem, error: blockedByThemError } = await supabase.rpc('is_user_blocked', {
        blocker_uuid: otherUser.id,
        blocked_uuid: user.id
      })

      if (blockedByThemError) throw blockedByThemError
      setIsBlockedBy(blockedByThem)
    } catch (error) {
      console.error('Error checking block status:', error)
    }
  }

  const handleBlockUser = async () => {
    try {
      setBlocking(true)
      
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: user.id,
          blocked_id: otherUser.id,
          reason: blockReason || null
        })

      if (error) throw error

      setIsBlocked(true)
      setShowBlockModal(false)
      setBlockReason('')
      alert('User blocked successfully!')
    } catch (error) {
      console.error('Error blocking user:', error)
      alert('Failed to block user. Please try again.')
    } finally {
      setBlocking(false)
    }
  }

  const handleUnblockUser = async () => {
    try {
      setBlocking(true)
      
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', otherUser.id)

      if (error) throw error

      setIsBlocked(false)
      alert('User unblocked successfully!')
    } catch (error) {
      console.error('Error unblocking user:', error)
      alert('Failed to unblock user. Please try again.')
    } finally {
      setBlocking(false)
    }
  }

  // Real-time profile updates for header (enabled but doesn't trigger page refresh)
  useEffect(() => {
    if (!conversationId || !user || !otherUser) return
    
    const subscription = supabase
      .channel(`profile-updates-${otherUser.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_profiles',
        filter: `id=eq.${otherUser.id}`
      }, (payload) => {
        // Update other user profile if it changed
        setOtherUser(prev => {
          if (prev && prev.id === payload.new.id) {
            return {
              ...prev,
              username: payload.new.username,
              profile_picture: payload.new.profile_picture,
              is_online: payload.new.is_online,
              last_seen_at: payload.new.last_seen_at
            }
          }
          return prev
        })
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [conversationId, user, otherUser?.id])

  const fetchConversationDetails = async () => {
    try {
      // Get conversation details
      const { data: convData } = await supabase
        .from('conversations')
        .select('id, is_group_chat, name, created_by, disappearing_messages_duration')
        .eq('id', conversationId)
        .single()

      setConversation(convData)

      // For one-on-one chats, get the other user
      if (convData && !convData.is_group_chat) {
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conversationId)

        const otherUserId = participants?.find(p => p.user_id !== user.id)?.user_id
        
        if (otherUserId) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('username, profile_picture, is_online, last_seen_at')
            .eq('id', otherUserId)
            .single()

          setOtherUser({
            id: otherUserId,
            username: profile?.username || 'Unknown',
            profile_picture: profile?.profile_picture,
            is_online: profile?.is_online || false,
            last_seen_at: profile?.last_seen_at
          })
        }
      }
    } catch (error) {
      console.error('Error fetching conversation details:', error)
    }
  }

  const getInitials = (name) => {
    return name?.substring(0, 2).toUpperCase() || 'U'
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

  if (!conversationId) {
    return (
      <main className="flex-1 bg-[#111827] flex items-center justify-center">
        <div className="text-gray-400 text-center">
          <svg className="w-24 h-24 mx-auto mb-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-xl font-medium text-gray-300 mb-2">No conversation selected</p>
          <p className="text-sm text-gray-500">Choose a conversation from the sidebar to start chatting</p>
        </div>
      </main>
    )
  }

  if (!conversation && !otherUser) {
    return (
      <main className="flex-1 bg-[#111827] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <div className="text-gray-400 text-sm">Loading chat...</div>
        </div>
      </main>
    )
  }

  const isGroupChat = conversation?.is_group_chat
  const displayName = isGroupChat ? conversation?.name : otherUser?.username

  // Show blocked state if user is blocked
  if (!isGroupChat && otherUser && isBlocked) {
    return (
      <main className="flex-1 bg-[#111827] flex flex-col">
        {/* Chat Header */}
        <header className="h-16 bg-[#111827] border-b border-gray-700 flex items-center px-6">
          {otherUser?.profile_picture ? (
            <img 
              src={otherUser.profile_picture} 
              alt={otherUser.username}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="bg-blue-600 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold text-xs">
                {getInitials(otherUser?.username)}
              </span>
            </div>
          )}
          <div className="ml-3 flex-1">
            <h1 className="text-white font-medium text-lg">{displayName}</h1>
            <p className="text-gray-400 text-sm">Blocked</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleUnblockUser}
              disabled={blocking}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {blocking ? (
                <div className="flex items-center">
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                  Unblocking...
                </div>
              ) : (
                'Unblock'
              )}
            </button>
          </div>
        </header>

        {/* Blocked State Message */}
        <div className="flex-1 bg-[#111827] flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="w-24 h-24 mx-auto mb-6 text-gray-600">
              <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
              </svg>
            </div>
            <p className="text-xl font-medium text-gray-300 mb-2">
              You blocked {otherUser.username}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              You cannot send messages to this user while they are blocked.
            </p>
            <button
              onClick={handleUnblockUser}
              disabled={blocking}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {blocking ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Unblocking...
                </div>
              ) : (
                'Unblock User'
              )}
            </button>
          </div>
        </div>
      </main>
    )
  }

  // Show blocked by them state
  if (!isGroupChat && otherUser && isBlockedBy) {
    return (
      <main className="flex-1 bg-[#111827] flex flex-col">
        {/* Chat Header */}
        <header className="h-16 bg-[#111827] border-b border-gray-700 flex items-center px-6">
          {otherUser?.profile_picture ? (
            <img 
              src={otherUser.profile_picture} 
              alt={otherUser.username}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="bg-blue-600 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold text-xs">
                {getInitials(otherUser?.username)}
              </span>
            </div>
          )}
          <div className="ml-3 flex-1">
            <h1 className="text-white font-medium text-lg">{displayName}</h1>
            <p className="text-gray-400 text-sm">Blocked you</p>
          </div>
        </header>

        {/* Blocked By Them State Message */}
        <div className="flex-1 bg-[#111827] flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="w-24 h-24 mx-auto mb-6 text-gray-600">
              <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
              </svg>
            </div>
            <p className="text-xl font-medium text-gray-300 mb-2">
              {otherUser.username} blocked you
            </p>
            <p className="text-sm text-gray-500">
              You cannot send messages to this user.
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 flex flex-col transition-colors duration-300" style={{ backgroundColor: 'var(--background)' }}>
      {/* Chat Header */}
      <header className="h-16 border-b flex items-center px-6 transition-colors duration-300" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        {isGroupChat ? (
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        ) : (
          <>
            {otherUser?.profile_picture ? (
              <img 
                src={otherUser.profile_picture} 
                alt={otherUser.username}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="bg-gradient-to-r from-indigo-500 to-pink-500 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-xs">
                  {getInitials(otherUser?.username)}
                </span>
              </div>
            )}
          </>
        )}
        <div className="ml-3 flex-1">
          <h1 className="text-white font-medium text-lg">{displayName}</h1>
          <p className="text-gray-400 text-sm flex items-center space-x-2">
            {isGroupChat ? (
              'Group chat'
            ) : (
              <>
                {callState === 'active' || callState === 'calling' ? (
                  <>
                    <span className="relative inline-flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      <span className="absolute w-2 h-2 bg-green-500 rounded-full"></span>
                    </span>
                    {callState === 'active' ? (
                      <span className="text-green-400 flex items-center space-x-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span>On call • {callDuration}</span>
                      </span>
                    ) : (
                      <span className="text-blue-400">Calling...</span>
                    )}
                  </>
                ) : otherUser?.is_online ? (
                  <>
                    <span className="relative inline-flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                      <span className="absolute w-2 h-2 bg-green-500 rounded-full"></span>
                    </span>
                    <span className="text-green-400">Online</span>
                  </>
                ) : (
                  <span>Last seen {formatLastSeen(otherUser?.last_seen_at)}</span>
                )}
              </>
            )}
            {conversation?.disappearing_messages_duration && (
              <>
                <span className="text-gray-500">•</span>
                <span className="text-yellow-400 flex items-center space-x-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs">
                    Disappearing messages: {
                      conversation.disappearing_messages_duration === 24 ? '24 hours' :
                      conversation.disappearing_messages_duration === 168 ? '7 days' :
                      conversation.disappearing_messages_duration === 2160 ? '90 days' :
                      'Enabled'
                    }
                  </span>
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Voice Call Button - Only for one-on-one chats */}
          {!isGroupChat && otherUser && !isBlocked && !isBlockedBy && (
            <button
              onClick={() => {
                initiateCall(
                  otherUser.id,
                  otherUser.username,
                  otherUser.profile_picture
                )
              }}
              className="text-gray-400 hover:text-white transition-colors p-2 w-10 h-10 rounded-full hover:bg-gray-700 flex items-center justify-center"
              title="Start voice call"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
          )}
          
          {/* Mute Button */}
          <button
            onClick={() => setShowMuteModal(true)}
            className="text-gray-400 hover:text-white transition-colors p-2"
            title="Mute conversation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          </button>
          
          {/* Search Button */}
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="text-gray-400 hover:text-white transition-colors p-2"
            title="Search messages"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          
          {!isGroupChat && otherUser && (
            <>
              {isBlocked ? (
                <button
                  onClick={handleUnblockUser}
                  disabled={blocking}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {blocking ? (
                    <div className="flex items-center">
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                      Unblocking...
                    </div>
                  ) : (
                    'Unblock'
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setShowBlockModal(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                >
                  Block User
                </button>
              )}
            </>
          )}
          {/* Archive/Unarchive button */}
          {conversationId && (
            <button
              onClick={isArchived ? handleUnarchive : handleArchive}
              className="text-gray-400 hover:text-white transition-colors p-2"
              title={isArchived ? "Unarchive chat (Ctrl+Shift+D)" : "Archive chat (Ctrl+D)"}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isArchived ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                )}
              </svg>
            </button>
          )}
          {/* Settings button - available for both group chats and DMs */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="text-gray-400 hover:text-white transition-colors p-2"
            title={isGroupChat ? "Group settings" : "Conversation settings"}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Search Bar */}
      <MessageSearch
        conversationId={conversationId}
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSearchResults={setSearchResults}
        onSearchQuery={setCurrentSearchQuery}
      />

      {/* Chat Messages Area */}
      <MessageList 
        conversationId={conversationId}
        conversation={conversation}
        searchResults={searchResults} 
        searchQuery={currentSearchQuery}
        targetMessageId={targetMessageId}
      />

      {/* Chat Input Area */}
        <MessageInput conversationId={conversationId} onReplyToMessage={true} />

      {/* Group Settings Modal / Conversation Settings */}
      {isSettingsOpen && conversation && (
        <GroupSettingsModal
          conversationId={conversationId}
          conversation={conversation}
          currentUserId={user?.id}
          onClose={() => {
            setIsSettingsOpen(false)
            // Refresh conversation to get updated disappearing_messages_duration
            fetchConversationDetails()
          }}
        />
      )}

      {/* Block User Modal */}
      {showBlockModal && otherUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-white mb-4">Block User</h3>
            <p className="text-gray-400 mb-4">
              Are you sure you want to block <strong className="text-white">{otherUser.username}</strong>? They won't be able to:
            </p>
            <ul className="text-gray-400 text-sm mb-4 space-y-1">
              <li>• Search for you or find you</li>
              <li>• Send you messages</li>
              <li>• See your messages in group chats</li>
            </ul>
            
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">
                Reason (optional):
              </label>
              <textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Why are you blocking this user?"
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                rows="3"
              />
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowBlockModal(false)
                  setBlockReason('')
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBlockUser}
                disabled={blocking}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {blocking ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Blocking...
                  </div>
                ) : (
                  'Block User'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mute Modal */}
      {showMuteModal && (
        <MuteModal
          conversationId={conversationId}
          conversationName={displayName}
          onClose={() => setShowMuteModal(false)}
          onMuteSuccess={() => setShowMuteModal(false)}
        />
      )}

      {/* Voice Call Modal */}
      {callState && (
        <VoiceCallModal
          callState={callState}
          otherUser={callOtherUser}
          isMuted={isMuted}
          callDuration={callDuration}
          connectionError={connectionError}
          onAccept={() => acceptCall()}
          onReject={() => rejectCall()}
          onEnd={() => endCall()}
          onToggleMute={() => toggleMute()}
        />
      )}
    </main>
  )
}

export default MainChat

