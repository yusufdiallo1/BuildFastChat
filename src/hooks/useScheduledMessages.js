import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/**
 * Hook to process scheduled messages in the background
 * Polls for scheduled messages that are due and sends them
 */
export function useScheduledMessages() {
  const { user } = useAuth()
  const pollingIntervalRef = useRef(null)

  useEffect(() => {
    if (!user) return

    const processScheduledMessages = async () => {
      try {
        const now = new Date().toISOString()

        // Find all pending scheduled messages that are due
        const { data: scheduledMessages, error } = await supabase
          .from('scheduled_messages')
          .select('*')
          .eq('status', 'pending')
          .eq('sender_id', user.id)
          .lte('scheduled_for', now)

        if (error) {
          console.error('Error fetching scheduled messages:', error)
          return
        }

        if (!scheduledMessages || scheduledMessages.length === 0) {
          return
        }

        // Process each scheduled message
        for (const scheduledMsg of scheduledMessages) {
          try {
            // Check if conversation still exists and user is still a participant
            const { data: participant, error: participantError } = await supabase
              .from('conversation_participants')
              .select('user_id')
              .eq('conversation_id', scheduledMsg.conversation_id)
              .eq('user_id', user.id)
              .maybeSingle()

            if (participantError || !participant) {
              // User is no longer a participant, cancel the scheduled message
              await supabase
                .from('scheduled_messages')
                .update({ status: 'cancelled' })
                .eq('id', scheduledMsg.id)
              continue
            }

            // Check if user is blocked
            const { data: participants, error: participantsError } = await supabase
              .from('conversation_participants')
              .select('user_id')
              .eq('conversation_id', scheduledMsg.conversation_id)
              .neq('user_id', user.id)

            if (!participantsError && participants) {
              let isBlocked = false
              for (const participant of participants) {
                const { data: blocked } = await supabase.rpc('is_user_blocked', {
                  blocker_uuid: participant.user_id,
                  blocked_uuid: user.id
                })
                if (blocked) {
                  isBlocked = true
                  break
                }
              }

              if (isBlocked) {
                // User is blocked, cancel the scheduled message
                await supabase
                  .from('scheduled_messages')
                  .update({ status: 'cancelled' })
                  .eq('id', scheduledMsg.id)
                continue
              }
            }

            // Create the actual message
            const messageData = {
              conversation_id: scheduledMsg.conversation_id,
              sender_id: scheduledMsg.sender_id,
              content: scheduledMsg.content,
              message_type: scheduledMsg.message_type,
              status: 'sent',
              sent_at: new Date().toISOString()
            }

            if (scheduledMsg.payload) {
              messageData.payload = scheduledMsg.payload
            }

            if (scheduledMsg.message_type === 'voice' && scheduledMsg.payload?.duration) {
              messageData.duration = scheduledMsg.payload.duration
            }

            // Insert the message
            const { error: insertError } = await supabase
              .from('messages')
              .insert(messageData)

            if (insertError) {
              console.error('Error sending scheduled message:', insertError)
              // Don't mark as sent if insert failed, will retry next poll
              continue
            }

            // Mark scheduled message as sent
            await supabase
              .from('scheduled_messages')
              .update({
                status: 'sent',
                sent_at: new Date().toISOString()
              })
              .eq('id', scheduledMsg.id)

            console.log('Scheduled message sent:', scheduledMsg.id)
          } catch (error) {
            console.error('Error processing scheduled message:', error)
          }
        }
      } catch (error) {
        console.error('Error in processScheduledMessages:', error)
      }
    }

    // Poll every 30 seconds for scheduled messages
    pollingIntervalRef.current = setInterval(processScheduledMessages, 30000)

    // Process immediately on mount
    processScheduledMessages()

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [user?.id])
}


