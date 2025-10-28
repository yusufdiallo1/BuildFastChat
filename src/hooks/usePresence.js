import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function usePresence(userId) {
  const heartbeatIntervalRef = useRef(null)
  const isOnlineRef = useRef(false)

  useEffect(() => {
    if (!userId) {
      return
    }

    let mounted = true

    // Function to update online status
    const updateOnlineStatus = async (isOnline) => {
      try {
        const { error } = await supabase
          .from('user_profiles')
          .update({
            is_online: isOnline,
            last_seen_at: new Date().toISOString()
          })
          .eq('id', userId)

        if (error) {
          console.error('Error updating presence:', error)
        } else {
        }

        isOnlineRef.current = isOnline
      } catch (error) {
        console.error('Error updating presence:', error)
      }
    }

    // Set online status when component mounts
    const setOnline = async () => {
      if (mounted) {
        await updateOnlineStatus(true)
      }
    }

    // Set offline status when component unmounts
    const setOffline = async () => {
      if (mounted) {
        await updateOnlineStatus(false)
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current)
        }
      }
    }

    // Function to send heartbeat
    const sendHeartbeat = async () => {
      if (mounted) {
        try {
          await supabase
            .from('user_profiles')
            .update({
              last_seen_at: new Date().toISOString()
            })
            .eq('id', userId)
        } catch (error) {
          console.error('Error sending heartbeat:', error)
        }
      }
    }

    // Initialize online status
    setOnline()

    // Set up heartbeat every 10 seconds to keep last_seen_at updated
    heartbeatIntervalRef.current = setInterval(() => {
      if (isOnlineRef.current) {
        sendHeartbeat()
      }
    }, 10000)

    // Handle visibility change (tab focus/blur)
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // Tab is hidden, set offline immediately
        await updateOnlineStatus(false)
      } else {
        // Tab is visible, set online immediately
        await updateOnlineStatus(true)
      }
    }

    // Event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    return () => {
      mounted = false
      
      // Set offline on unmount
      updateOnlineStatus(false)
      
      // Clear heartbeat interval
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }

      // Remove event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [userId])
}

