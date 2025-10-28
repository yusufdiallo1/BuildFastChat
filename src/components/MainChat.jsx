import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import GroupSettingsModal from './GroupSettingsModal'

function MainChat({ conversationId }) {
  const [otherUser, setOtherUser] = useState(null)
  const [conversation, setConversation] = useState(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [onlineStatus, setOnlineStatus] = useState(null)
  const { user } = useAuth()

  useEffect(() => {
    if (conversationId && user) {
      fetchConversationDetails()
    }
  }, [conversationId, user])

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
        .select('id, is_group_chat, name, created_by')
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

  return (
    <main className="flex-1 bg-[#111827] flex flex-col">
      {/* Chat Header */}
      <header className="h-16 bg-[#111827] border-b border-gray-700 flex items-center px-6">
        {isGroupChat ? (
          <div className="bg-green-600 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
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
              <div className="bg-blue-600 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
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
                {otherUser?.is_online ? (
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
          </p>
        </div>
        {isGroupChat && (
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="text-gray-400 hover:text-white transition-colors p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        )}
      </header>

      {/* Chat Messages Area */}
      <MessageList conversationId={conversationId} />

      {/* Chat Input Area */}
      <MessageInput conversationId={conversationId} />

      {/* Group Settings Modal */}
      {isSettingsOpen && isGroupChat && conversation && (
        <GroupSettingsModal
          conversationId={conversationId}
          conversation={conversation}
          currentUserId={user?.id}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </main>
  )
}

export default MainChat

