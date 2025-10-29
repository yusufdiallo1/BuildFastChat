import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export const useAutoDeleteMessages = () => {
  const { user } = useAuth()
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!user) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    const deleteExpiredMessages = async () => {
      console.log('Checking for expired messages to delete...')
      try {
        const now = new Date().toISOString()
        
        // Find all messages that have expired
        const { data: expiredMessages, error } = await supabase
          .from('messages')
          .select('id, conversation_id')
          .not('expires_at', 'is', null)
          .lt('expires_at', now)
          .eq('is_deleted', false)

        if (error) throw error

        if (!expiredMessages || expiredMessages.length === 0) {
          console.log('No expired messages to delete')
          return
        }

        console.log(`Found ${expiredMessages.length} expired messages to delete`)

        // Delete expired messages
        const messageIds = expiredMessages.map(msg => msg.id)
        const { error: deleteError } = await supabase
          .from('messages')
          .update({
            is_deleted: true,
            deletion_type: 'for_everyone',
            deleted_at: now,
            content: ''
          })
          .in('id', messageIds)

        if (deleteError) throw deleteError

        console.log(`Successfully deleted ${messageIds.length} expired messages`)
      } catch (err) {
        console.error('Error in auto-delete messages background job:', err)
      }
    }

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Set up new interval - check every 5 minutes
    intervalRef.current = setInterval(deleteExpiredMessages, 5 * 60 * 1000)

    // Initial check on mount
    deleteExpiredMessages()

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [user]) // Re-run effect if user changes
}


