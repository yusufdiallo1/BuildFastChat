import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import TypingIndicator from './TypingIndicator'

function MessageList({ conversationId }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (!conversationId || !user) {
      setLoading(false)
      return
    }
    
    let mounted = true

    async function fetchMessages() {
      try {
        setLoading(true)
        
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:user_profiles!sender_id(
              id,
              username,
              profile_picture
            )
          `)
          .eq('conversation_id', conversationId)
          .order('sent_at', { ascending: true })

        if (error) throw error

        if (mounted) {
          setMessages(data || [])
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
  }, [conversationId, user])

  useEffect(() => {
    if (messages.length > 0 && !loading) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 50)
    }
  }, [messages.length, loading])

  useEffect(() => {
    if (!conversationId || !user) return
    
    const messagesChannel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          const { data: senderProfile, error } = await supabase
            .from('user_profiles')
            .select('id, username, profile_picture')
            .eq('id', payload.new.sender_id)
            .single()

          if (error) {
            console.error('Error fetching sender profile:', error)
            return
          }

          setMessages(prev => {
            const exists = prev.some(msg => msg.id === payload.new.id)
            if (exists) {
              return prev
            }
            
            return [...prev, {
              ...payload.new,
              sender: senderProfile
            }]
          })
        }
      )
      .subscribe()

    return () => {
      messagesChannel.unsubscribe()
    }
  }, [conversationId, user])

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

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="max-w-4xl mx-auto">
        {messages.map((msg) => {
          const isSent = msg.sender_id === user?.id
          const sender = msg.sender
          
          return (
            <div
              key={msg.id}
              className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-4`}
            >
              <div className={`flex items-start gap-3 max-w-[70%] ${isSent ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="relative w-10 h-10 flex-shrink-0">
                  {sender?.profile_picture ? (
                    <img 
                      src={sender.profile_picture} 
                      alt={sender.username || 'User'} 
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className={`${getAvatarColor(sender?.id)} w-10 h-10 rounded-full flex items-center justify-center`}>
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

                  <div
                    className={`px-4 py-2.5 rounded-2xl ${
                      isSent
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-100'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>

                  <span className="text-gray-500 text-xs mt-1 px-1">
                    {formatTimestamp(msg.sent_at)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>
      <TypingIndicator conversationId={conversationId} />
    </div>
  )
}

export default MessageList
