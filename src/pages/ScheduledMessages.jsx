import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { PageNavigation } from '../components/PageNavigation'

function ScheduledMessages() {
  const [scheduledMessages, setScheduledMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(null)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      fetchScheduledMessages()
    }
  }, [user])

  const fetchScheduledMessages = async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('scheduled_messages')
        .select(`
          *,
          conversations!inner(
            id,
            name,
            is_group_chat
          )
        `)
        .eq('sender_id', user.id)
        .in('status', ['pending'])
        .order('scheduled_for', { ascending: true })

      if (error) throw error

      // Enrich with conversation details
      const enriched = await Promise.all(
        (data || []).map(async (msg) => {
          if (msg.conversations.is_group_chat) {
            return {
              ...msg,
              conversationName: msg.conversations.name || 'Group Chat'
            }
          } else {
            // Get other user for DM
            const { data: participants } = await supabase
              .from('conversation_participants')
              .select('user_id')
              .eq('conversation_id', msg.conversation_id)

            const otherUserId = participants?.find(p => p.user_id !== user.id)?.user_id
            if (otherUserId) {
              const { data: otherUser } = await supabase
                .from('user_profiles')
                .select('username')
                .eq('id', otherUserId)
                .single()

              return {
                ...msg,
                conversationName: otherUser?.username || 'Unknown'
              }
            }
          }
          return {
            ...msg,
            conversationName: msg.conversations.name || 'Chat'
          }
        })
      )

      setScheduledMessages(enriched)
    } catch (error) {
      console.error('Error fetching scheduled messages:', error)
      alert('Failed to load scheduled messages')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (scheduledMessageId) => {
    if (!window.confirm('Are you sure you want to cancel this scheduled message?')) return

    try {
      setCancelling(scheduledMessageId)
      const { error } = await supabase
        .from('scheduled_messages')
        .update({ status: 'cancelled' })
        .eq('id', scheduledMessageId)

      if (error) throw error

      // Remove from list
      setScheduledMessages(prev => prev.filter(msg => msg.id !== scheduledMessageId))
      alert('Scheduled message cancelled')
    } catch (error) {
      console.error('Error cancelling scheduled message:', error)
      alert('Failed to cancel scheduled message')
    } finally {
      setCancelling(null)
    }
  }

  const formatScheduledTime = (scheduledFor) => {
    const date = new Date(scheduledFor)
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    const diffMinutes = Math.floor(diff / (1000 * 60))
    const diffHours = Math.floor(diff / (1000 * 60 * 60))
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (diffMinutes < 60) {
      return `In ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`
    } else if (diffHours < 24) {
      return `In ${diffHours} hour${diffHours !== 1 ? 's' : ''}`
    } else if (diffDays < 7) {
      return `In ${diffDays} day${diffDays !== 1 ? 's' : ''}`
    } else {
      return date.toLocaleString()
    }
  }

  const handleConversationClick = (conversationId) => {
    navigate(`/chat?conversation=${conversationId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen transition-colors duration-300 flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--text-primary)' }}></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: 'var(--background)', color: 'var(--text-primary)' }}>
      <PageNavigation title="Scheduled Messages" />
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Messages List */}
        {scheduledMessages.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>No scheduled messages</p>
            <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Long-press the send button to schedule a message</p>
          </div>
        ) : (
          <div className="space-y-4">
            {scheduledMessages.map((msg) => (
              <div
                key={msg.id}
                className="frosted-glass rounded-xl p-6 border transition-colors"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Conversation Name */}
                    <div className="flex items-center space-x-2 mb-3">
                      <button
                        onClick={() => handleConversationClick(msg.conversation_id)}
                        className="font-medium text-lg hover:underline transition-colors"
                        style={{ color: 'var(--primary)' }}
                      >
                        {msg.conversations.is_group_chat ? msg.conversationName : `@${msg.conversationName}`}
                      </button>
                      <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 text-xs font-medium rounded-full border border-yellow-600/30">
                        Scheduled
                      </span>
                    </div>

                    {/* Message Content */}
                    <div className="mb-3">
                      {msg.message_type === 'image' && msg.payload ? (
                        <div className="space-y-2">
                          <img
                            src={msg.payload.url}
                            alt="Scheduled"
                            className="max-w-xs max-h-48 rounded-lg object-contain"
                          />
                          {msg.content && (
                            <p style={{ color: 'var(--text-secondary)' }}>{msg.content}</p>
                          )}
                        </div>
                      ) : (
                        <p style={{ color: 'var(--text-secondary)' }}>{msg.content || '(No content)'}</p>
                      )}
                    </div>

                    {/* Scheduled Time */}
                    <div className="flex items-center space-x-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{formatScheduledTime(msg.scheduled_for)}</span>
                      <span className="mx-2">•</span>
                      <span>{new Date(msg.scheduled_for).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Cancel Button */}
                  <button
                    onClick={() => handleCancel(msg.id)}
                    disabled={cancelling === msg.id}
                    className="ml-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    {cancelling === msg.id ? (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Cancelling...
                      </div>
                    ) : (
                      'Cancel'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ScheduledMessages

