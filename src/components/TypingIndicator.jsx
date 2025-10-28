import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function TypingIndicator({ conversationId }) {
  const [typingUsers, setTypingUsers] = useState([])
  const { user } = useAuth()

  console.log('TypingIndicator mounted for conversation:', conversationId, 'user:', user?.id)


  useEffect(() => {
    if (!conversationId || !user) {
      return
    }

    let mounted = true

    // Subscribe to typing status changes
    const subscription = supabase
      .channel(`typing-${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'typing_status',
        filter: `conversation_id=eq.${conversationId}`
      }, async (payload) => {
        if (!mounted) return
        console.log('TypingIndicator: Received real-time update:', payload)
        // Fetch current typing users
        try {
          // First get typing status
          const { data: typingStatus, error: statusError } = await supabase
            .from('typing_status')
            .select('user_id, is_typing')
            .eq('conversation_id', conversationId)
            .eq('is_typing', true)
            .neq('user_id', user.id)

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
            console.log('TypingIndicator: Setting typing users:', combined)
            setTypingUsers(combined)
          }
        } catch (error) {
          console.error('Error fetching typing users:', error)
        }
      })
      .subscribe()

    // Initial fetch of typing users
    const fetchTypingUsers = async () => {
      if (!mounted) return
      try {
        // First get typing status
        const { data: typingStatus, error: statusError } = await supabase
          .from('typing_status')
          .select('user_id, is_typing')
          .eq('conversation_id', conversationId)
          .eq('is_typing', true)
          .neq('user_id', user.id)

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
          console.log('TypingIndicator: Initial fetch - Setting typing users:', combined)
          setTypingUsers(combined)
        }
      } catch (error) {
        console.error('Error fetching typing users:', error)
      }
    }

    fetchTypingUsers()

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [conversationId, user])


  if (typingUsers.length === 0) {
    return null
  }

  console.log('TypingIndicator: Rendering with typingUsers:', typingUsers)

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
    <div className="px-6 py-2 bg-[#111827] border-t border-gray-700">
      <div className="flex items-center space-x-2 text-gray-400 text-sm">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        <span>{formatTypingMessage()}</span>
      </div>
    </div>
  )
}

export default TypingIndicator
