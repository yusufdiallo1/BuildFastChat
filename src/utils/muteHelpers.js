/**
 * Utility functions for checking mute status of conversations
 * Used to filter muted conversations from notifications
 */

/**
 * Check if a conversation is muted for a given user
 * @param {string} userId - The user's ID
 * @param {string} conversationId - The conversation ID to check
 * @param {object} supabase - Supabase client instance
 * @returns {Promise<boolean>} - True if muted (and not expired), false otherwise
 */
export const isConversationMuted = async (userId, conversationId, supabase) => {
  if (!userId || !conversationId || !supabase) return false

  try {
    const { data, error } = await supabase
      .from('muted_conversations')
      .select('muted_until')
      .eq('user_id', userId)
      .eq('conversation_id', conversationId)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking mute status:', error)
      return false
    }

    if (!data) return false

    // If muted_until is null, conversation is muted forever
    if (!data.muted_until) {
      return true
    }

    // Check if mute has expired
    const now = new Date()
    const mutedUntil = new Date(data.muted_until)
    
    if (mutedUntil <= now) {
      // Mute expired, clean it up
      await supabase
        .from('muted_conversations')
        .delete()
        .eq('user_id', userId)
        .eq('conversation_id', conversationId)
      return false
    }

    // Still muted
    return true
  } catch (error) {
    console.error('Error checking mute status:', error)
    return false
  }
}

/**
 * Filter muted conversations from a list of conversation IDs
 * @param {string} userId - The user's ID
 * @param {string[]} conversationIds - Array of conversation IDs to filter
 * @param {object} supabase - Supabase client instance
 * @returns {Promise<string[]>} - Array of conversation IDs that are not muted
 */
export const filterMutedConversations = async (userId, conversationIds, supabase) => {
  if (!userId || !conversationIds || conversationIds.length === 0 || !supabase) {
    return conversationIds || []
  }

  try {
    const { data, error } = await supabase
      .from('muted_conversations')
      .select('conversation_id, muted_until')
      .eq('user_id', userId)
      .in('conversation_id', conversationIds)

    if (error) {
      console.error('Error fetching mute statuses:', error)
      return conversationIds
    }

    const mutedIds = new Set()
    const now = new Date()

    data?.forEach(mute => {
      if (!mute.muted_until) {
        // Forever muted
        mutedIds.add(mute.conversation_id)
      } else {
        const mutedUntil = new Date(mute.muted_until)
        if (mutedUntil > now) {
          // Still muted
          mutedIds.add(mute.conversation_id)
        }
      }
    })

    // Filter out muted conversations
    return conversationIds.filter(id => !mutedIds.has(id))
  } catch (error) {
    console.error('Error filtering muted conversations:', error)
    return conversationIds
  }
}


