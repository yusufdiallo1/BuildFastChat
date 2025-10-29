import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function TypingIndicator({ conversationId }) {
  const [typingUsers, setTypingUsers] = useState([])
  const { user } = useAuth()


  useEffect(() => {
    if (!conversationId || !user) {
      setTypingUsers([])
      return
    }

    let mounted = true
    let intervalId = null

    // Helper function to fetch typing users
    const fetchTypingUsers = async () => {
      if (!mounted) return
      try {
        // First get typing status - only active typing (within last 5 seconds)
        const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString()
        const { data: typingStatus, error: statusError } = await supabase
          .from('typing_status')
          .select('user_id, is_typing, updated_at')
          .eq('conversation_id', conversationId)
          .eq('is_typing', true)
          .neq('user_id', user.id)
          .gte('updated_at', fiveSecondsAgo) // Only recently updated

        if (statusError || !typingStatus || typingStatus.length === 0) {
          if (mounted) setTypingUsers([])
          return
        }

        // Then fetch user profiles
        const userIds = typingStatus.map(t => t.user_id)
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('id, username')
          .in('id', userIds)

        if (!profilesError && profiles && mounted) {
          const combined = typingStatus.map(status => ({
            user_id: status.user_id,
            is_typing: status.is_typing,
            user_profiles: profiles.find(p => p.id === status.user_id) || { username: 'Unknown' }
          }))
          setTypingUsers(combined)
        }
      } catch (error) {
        console.error('Error fetching typing users:', error)
        if (mounted) setTypingUsers([])
      }
    }

    // Initial fetch
    fetchTypingUsers()

    // Subscribe to typing status changes
    const channel = supabase
      .channel(`typing-${conversationId}-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_status',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          if (!mounted) return
          // Refetch typing users when status changes
          fetchTypingUsers()
        }
      )
      .subscribe()

    // Poll every 2 seconds to check for stale typing indicators
    intervalId = setInterval(() => {
      if (mounted) {
        fetchTypingUsers()
      }
    }, 2000)

    return () => {
      mounted = false
      if (intervalId) {
        clearInterval(intervalId)
      }
      channel.unsubscribe()
    }
  }, [conversationId, user?.id])


  if (typingUsers.length === 0) {
    return null
  }

  const formatTypingMessage = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].user_profiles?.username || 'Someone'} is typing...`
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].user_profiles?.username || 'Someone'} and ${typingUsers[1].user_profiles?.username || 'Someone'} are typing...`
    } else {
      const names = typingUsers.map(t => t.user_profiles?.username || 'Someone')
      const lastTwo = names.slice(-2)
      const others = names.slice(0, -2)
      return `${others.join(', ')}, ${lastTwo.join(' and ')} are typing...`
    }
  }

  return (
    <div 
      className="px-6 py-2 border-t transition-colors duration-300"
      style={{ 
        backgroundColor: 'var(--surface)', 
        borderColor: 'var(--border)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        bottom: 0,
        zIndex: 10
      }}
    >
      <div className="flex items-center space-x-2 text-sm" style={{ color: 'var(--text-muted)' }}>
        <div className="flex space-x-1">
          <div 
            className="w-2 h-2 rounded-full animate-bounce" 
            style={{ 
              animationDelay: '0ms',
              backgroundColor: 'var(--primary)'
            }}
          ></div>
          <div 
            className="w-2 h-2 rounded-full animate-bounce" 
            style={{ 
              animationDelay: '150ms',
              backgroundColor: 'var(--primary)'
            }}
          ></div>
          <div 
            className="w-2 h-2 rounded-full animate-bounce" 
            style={{ 
              animationDelay: '300ms',
              backgroundColor: 'var(--primary)'
            }}
          ></div>
        </div>
        <span style={{ color: 'var(--text-secondary)' }}>{formatTypingMessage()}</span>
      </div>
    </div>
  )
}

export default TypingIndicator
