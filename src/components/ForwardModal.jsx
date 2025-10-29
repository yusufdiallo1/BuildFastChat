import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Portal from './Portal'

function ForwardModal({ message, conversationId, onClose, onForwardComplete }) {
  const [conversations, setConversations] = useState([])
  const [selectedConversations, setSelectedConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [forwarding, setForwarding] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    console.log('ForwardModal mounted', { message, conversationId })
    fetchConversations()
  }, [user])

  const fetchConversations = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      // Get all conversations where user is a participant (ONLY conversations user is part of)
      const { data: myConvs, error } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations!inner(
            id,
            is_group_chat,
            name,
            created_at
          )
        `)
        .eq('user_id', user.id) // Only conversations where current user is a participant
        .order('joined_at', { ascending: false })

      if (error) {
        console.error('Error fetching participant conversations:', error)
        throw error
      }

      if (!myConvs || myConvs.length === 0) {
        setConversations([])
        return
      }

      // For each conversation, get details
      const convsWithDetails = await Promise.all(
        (myConvs || []).map(async (conv) => {
          if (!conv.conversations) return null

          const currentConvId = conv.conversation_id
          
          // Skip current conversation (can't forward to self)
          if (currentConvId === conversationId || currentConvId === message?.conversation_id) {
            return null
          }

          // Get participants to verify user is still a participant and get other user for DMs
          const { data: participants, error: participantsError } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', currentConvId)

          if (participantsError) {
            console.error('Error fetching participants:', participantsError)
            return null
          }

          // Verify current user is a participant (defensive check)
          const isParticipant = participants?.some(p => p.user_id === user.id)
          if (!isParticipant) {
            return null // Skip if user is not a participant
          }

          // Handle group chats
          if (conv.conversations.is_group_chat) {
            return {
              id: currentConvId,
              name: conv.conversations.name || 'Group Chat',
              isGroupChat: true,
            }
          }

          // Handle one-on-one chats (DMs)
          const otherUserId = participants?.find(p => p.user_id !== user.id)?.user_id
          
          if (!otherUserId) {
            // If no other user found, skip (shouldn't happen but defensive)
            return null
          }

          // Get other user's profile for DM display
          const { data: otherUser, error: profileError } = await supabase
            .from('user_profiles')
            .select('username, profile_picture')
            .eq('id', otherUserId)
            .single()

          if (profileError) {
            console.error('Error fetching user profile:', profileError)
            // Still return the conversation with fallback values
            return {
              id: currentConvId,
              name: 'Unknown',
              isGroupChat: false,
              profilePicture: null,
              otherUserId: otherUserId
            }
          }

          return {
            id: currentConvId,
            name: otherUser?.username || 'Unknown',
            isGroupChat: false,
            profilePicture: otherUser?.profile_picture,
            otherUserId: otherUserId
          }
        })
      )

      // Filter out null values and ensure we exclude current conversation
      const filtered = convsWithDetails
        .filter(c => {
          if (!c || !c.id) return false
          // Exclude current conversation
          if (c.id === conversationId || c.id === message?.conversation_id) return false
          return true
        })

      setConversations(filtered)
    } catch (error) {
      console.error('Error fetching conversations:', error)
      setConversations([])
    } finally {
      setLoading(false)
    }
  }

  const handleToggleConversation = (conversationId) => {
    setSelectedConversations(prev => {
      if (prev.includes(conversationId)) {
        return prev.filter(id => id !== conversationId)
      } else {
        return [...prev, conversationId]
      }
    })
  }

  const handleForward = async () => {
    console.log('handleForward called', { message, selectedConversations, forwarding, user })
    
    if (!message || selectedConversations.length === 0 || forwarding || !user) {
      console.log('handleForward blocked:', { hasMessage: !!message, selectedCount: selectedConversations.length, forwarding, hasUser: !!user })
      return
    }

    try {
      setForwarding(true)
      console.log('Starting forward process...')

      // Check block status for each selected conversation
      for (const conversationId of selectedConversations) {
        const { data: participants, error: participantsError } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conversationId)
          .neq('user_id', user.id)

        if (participantsError) {
          console.error('Error fetching participants:', participantsError)
          throw participantsError
        }

        // Check if any participant has blocked the current user
        for (const participant of participants || []) {
          const { data: isBlocked, error: blockedError } = await supabase.rpc('is_user_blocked', {
            blocker_uuid: participant.user_id,
            blocked_uuid: user.id
          })

          if (blockedError) {
            console.error('Error checking block status:', blockedError)
            throw blockedError
          }

          if (isBlocked) {
            alert(`You cannot forward messages to one of the selected conversations. You have been blocked by one of the participants.`)
            setForwarding(false)
            return
          }
        }
      }

      console.log('Block checks passed, preparing message data...')

      // Prepare message data for forwarding
      const baseMessageData = {
        sender_id: user.id,
        content: message.content || '',
        message_type: message.message_type || 'text',
        status: 'sent',
        sent_at: new Date().toISOString(),
        is_forwarded: true,
        original_message_id: message.id,
        payload: message.payload || null
      }

      // Add duration for voice messages
      if (message.message_type === 'voice' && message.duration) {
        baseMessageData.duration = message.duration
      }

      console.log('Base message data:', baseMessageData)
      console.log('Forwarding to conversations:', selectedConversations)

      // Forward to all selected conversations
      const forwardPromises = selectedConversations.map(async (conversationId) => {
        const messageData = {
          ...baseMessageData,
          conversation_id: conversationId
        }

        console.log(`Inserting message to conversation ${conversationId}:`, messageData)

        const { data, error } = await supabase
          .from('messages')
          .insert(messageData)
          .select()

        if (error) {
          console.error(`Error forwarding to conversation ${conversationId}:`, error)
          throw error
        }

        console.log(`Successfully forwarded to conversation ${conversationId}:`, data)
        return data
      })

      const results = await Promise.all(forwardPromises)
      console.log('All messages forwarded successfully:', results)

      // Call completion callback
      if (onForwardComplete) {
        onForwardComplete(selectedConversations.length)
      }

      // Show success message
      alert(`Message forwarded to ${selectedConversations.length} conversation${selectedConversations.length !== 1 ? 's' : ''}!`)

      onClose()
    } catch (error) {
      console.error('Error forwarding message:', error)
      alert('Failed to forward message: ' + (error?.message || 'Please try again.'))
    } finally {
      setForwarding(false)
    }
  }

  const getInitials = (name) => {
    return name?.substring(0, 2).toUpperCase() || 'U'
  }

  const getAvatarColor = (userId) => {
    if (!userId) return 'bg-blue-600'
    const colors = ['bg-blue-600', 'bg-purple-600', 'bg-green-600', 'bg-pink-600', 'bg-orange-600', 'bg-teal-600']
    const index = parseInt(userId.substring(0, 2), 16) % colors.length
    return colors[index]
  }

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <Portal>
      <div 
        className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div 
          className="frosted-glass rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col border border-slate-600"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-600">
            <h2 className="text-2xl font-bold gradient-text">Forward Message</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Message Preview */}
          {message && (
            <div className="p-4 border-b border-slate-600 bg-slate-800/50">
              <div className="text-xs text-slate-400 mb-2">Forwarding:</div>
              <div className="text-sm text-slate-300">
                {message.message_type === 'image' && message.payload?.url && (
                  <div className="mb-2">
                    <img
                      src={message.payload.url}
                      alt="Forwarded image"
                      className="max-w-xs max-h-32 object-contain rounded-lg"
                    />
                  </div>
                )}
                {message.message_type === 'voice' && (
                  <div className="flex items-center space-x-2 text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <span>Voice message</span>
                  </div>
                )}
                {message.content && (
                  <p className="break-words">{message.content}</p>
                )}
              </div>
            </div>
          )}

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loading && (
              <div className="text-center text-slate-400 py-8">
                <div className="w-8 h-8 mx-auto frosted-glass btn-rounded flex items-center justify-center">
                  <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full" />
                </div>
                <p className="mt-4">Loading conversations...</p>
              </div>
            )}

            {!loading && conversations.length === 0 && (
              <div className="text-center text-slate-400 py-8">
                <p>No other conversations available</p>
              </div>
            )}

            {!loading && conversations.length > 0 && (
              <div className="space-y-2">
                {conversations.map((conversation) => {
                  const isSelected = selectedConversations.includes(conversation.id)
                  return (
                    <div
                      key={conversation.id}
                      onClick={() => handleToggleConversation(conversation.id)}
                      className={`frosted-glass btn-rounded p-4 hover-lift transition-all duration-200 cursor-pointer border-2 ${
                        isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        {/* Checkbox */}
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-400'
                        }`}>
                          {isSelected && (
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>

                        {/* Profile Picture or Group Icon */}
                        {conversation.isGroupChat ? (
                          <div className="bg-green-600 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                        ) : (
                          conversation.profilePicture ? (
                            <img
                              src={conversation.profilePicture}
                              alt={conversation.name}
                              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className={`${getAvatarColor(conversation.otherUserId)} w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0`}>
                              <span className="text-white font-semibold text-lg">
                                {getInitials(conversation.name)}
                              </span>
                            </div>
                          )
                        )}

                        {/* Conversation Name */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-medium text-lg truncate">
                            {conversation.isGroupChat ? conversation.name : `@${conversation.name}`}
                          </h3>
                          <p className="text-slate-400 text-sm">
                            {conversation.isGroupChat ? 'Group chat' : 'Direct message'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer with Forward Button */}
          <div className="p-6 border-t border-slate-600 flex items-center justify-between">
            <div className="text-slate-400 text-sm">
              {selectedConversations.length > 0 ? (
                <span>{selectedConversations.length} conversation{selectedConversations.length !== 1 ? 's' : ''} selected</span>
              ) : (
                <span>Select conversations to forward to</span>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                disabled={forwarding}
                className="frosted-glass btn-rounded text-slate-300 px-6 py-2 font-medium hover-lift transition-all duration-200 hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleForward}
                disabled={selectedConversations.length === 0 || forwarding}
                className="frosted-glass btn-rounded text-white px-6 py-2 font-medium hover-lift transition-all duration-200 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {forwarding ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Forwarding...
                  </div>
                ) : (
                  'Forward'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}

export default ForwardModal

