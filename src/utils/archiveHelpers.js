import { supabase } from '../lib/supabase'

/**
 * Archive a conversation for a user
 */
export const archiveConversation = async (conversationId, userId) => {
  try {
    console.log('archiveConversation called:', { conversationId, userId })
    
    // First verify participant exists
    const { data: participant, error: checkError } = await supabase
      .from('conversation_participants')
      .select('id, archived')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single()

    if (checkError) {
      console.error('Error checking participant:', checkError)
      return { success: false, error: checkError.message || 'Participant not found' }
    }

    if (!participant) {
      return { success: false, error: 'Participant not found' }
    }

    // Update without select to avoid trigger issues
    const { error } = await supabase
      .from('conversation_participants')
      .update({ 
        archived: true
      })
      .eq('id', participant.id)

    if (error) {
      console.error('Update error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      return { success: false, error: error.message || 'Failed to archive' }
    }

    console.log('Successfully archived conversation')
    return { success: true }
  } catch (error) {
    console.error('Error archiving conversation:', error)
    return { success: false, error: error.message || error }
  }
}

/**
 * Unarchive a conversation for a user
 */
export const unarchiveConversation = async (conversationId, userId) => {
  try {
    console.log('unarchiveConversation called:', { conversationId, userId })
    
    // First verify participant exists
    const { data: participant, error: checkError } = await supabase
      .from('conversation_participants')
      .select('id, archived')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single()

    if (checkError) {
      console.error('Error checking participant:', checkError)
      return { success: false, error: checkError.message || 'Participant not found' }
    }

    if (!participant) {
      return { success: false, error: 'Participant not found' }
    }

    // Update without select to avoid trigger issues
    const { error } = await supabase
      .from('conversation_participants')
      .update({ 
        archived: false
      })
      .eq('id', participant.id)

    if (error) {
      console.error('Update error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      return { success: false, error: error.message || 'Failed to unarchive' }
    }

    console.log('Successfully unarchived conversation')
    return { success: true }
  } catch (error) {
    console.error('Error unarchiving conversation:', error)
    return { success: false, error: error.message || error }
  }
}

/**
 * Check if a conversation is archived for a user
 */
export const isConversationArchived = async (conversationId, userId) => {
  try {
    const { data, error } = await supabase
      .from('conversation_participants')
      .select('archived')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single()

    if (error) throw error
    return data?.archived || false
  } catch (error) {
    console.error('Error checking archive status:', error)
    return false
  }
}

/**
 * Archive multiple conversations
 */
export const archiveMultipleConversations = async (conversationIds, userId) => {
  try {
    const updates = conversationIds.map(id => ({
      conversation_id: id,
      user_id: userId,
      archived: true,
      archived_at: new Date().toISOString()
    }))

    // Use upsert to handle both insert and update cases
    const { error } = await supabase
      .from('conversation_participants')
      .upsert(updates, {
        onConflict: 'conversation_id,user_id'
      })

    if (error) throw error
    return { success: true, count: conversationIds.length }
  } catch (error) {
    console.error('Error archiving multiple conversations:', error)
    return { success: false, error }
  }
}

/**
 * Get archived conversations count
 */
export const getArchivedCount = async (userId) => {
  try {
    const { count, error } = await supabase
      .from('conversation_participants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('archived', true)

    if (error) throw error
    return count || 0
  } catch (error) {
    console.error('Error getting archived count:', error)
    return 0
  }
}

