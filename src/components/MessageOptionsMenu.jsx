import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import ForwardModal from './ForwardModal'

function MessageOptionsMenu({
  messageId,
  message,
  conversationId,
  conversation,
  isVisible,
  position,
  onClose,
  onDeleteSuccess,
  onReply
}) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [deleteType, setDeleteType] = useState(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editText, setEditText] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [isPinning, setIsPinning] = useState(false)
  const [checkingPin, setCheckingPin] = useState(true)
  const [showForwardModal, setShowForwardModal] = useState(false)
  const [forwardMessage, setForwardMessage] = useState(null)
  const [currentPosition, setCurrentPosition] = useState(position)
  const { user } = useAuth()
  const menuRef = useRef(null)
  const editDialogRef = useRef(null)
  const confirmDialogRef = useRef(null)
  
  // Check if message is from current user
  const isOwnMessage = message?.sender_id === user?.id

  // Update position on scroll
  useEffect(() => {
    if (!isVisible || !messageId) return
    
    const updatePosition = () => {
      const messageElement = document.querySelector(`[data-message-id="${messageId}"]`)
      if (messageElement) {
        const rect = messageElement.getBoundingClientRect()
        setCurrentPosition({
          x: rect.left + rect.width / 2,
          y: rect.top
        })
      }
    }

    const scrollContainer = document.querySelector('.flex-1.overflow-y-auto')
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updatePosition)
      window.addEventListener('scroll', updatePosition)
      window.addEventListener('resize', updatePosition)
      
      return () => {
        scrollContainer.removeEventListener('scroll', updatePosition)
        window.removeEventListener('scroll', updatePosition)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [isVisible, messageId])

  // Sync position prop changes
  useEffect(() => {
    setCurrentPosition(position)
  }, [position])

  // Check if message can be deleted (within 10 minutes)
  const canDelete = () => {
    if (!message || !message.sent_at) return false
    const messageTime = new Date(message.sent_at)
    const now = new Date()
    const diffMinutes = (now - messageTime) / (1000 * 60)
    return diffMinutes <= 10
  }

  // Check if user can delete this message
  const canUserDelete = () => {
    return user && message && message.sender_id === user.id
  }

  // Check if user can edit this message
  const canEdit = () => {
    if (!user || !message) return false
    if (message.sender_id !== user.id) return false
    if (message.is_deleted) return false
    if (message.message_type !== 'text') return false
    // Reuse time window
    return canDelete()
  }

  // Check if user can pin messages
  const canPin = () => {
    if (!user || !conversation) {
      console.log('canPin: false - missing user or conversation', { user: !!user, conversation: !!conversation })
      return false
    }
    if (message?.is_deleted) {
      console.log('canPin: false - message is deleted')
      return false
    }
    
    // For group chats: only creator/admin can pin
    if (conversation.is_group_chat) {
      const canPinGroup = conversation.created_by === user.id
      console.log('canPin (group):', canPinGroup, { created_by: conversation.created_by, user_id: user.id })
      return canPinGroup
    }
    
    // For DMs: both participants can pin
    console.log('canPin (DM): true')
    return true
  }

  // Check if message is pinned
  useEffect(() => {
    if (!conversationId || !messageId) return
    
    const checkPinned = async () => {
      try {
        setCheckingPin(true)
        const { data, error } = await supabase
          .from('pinned_messages')
          .select('id')
          .eq('conversation_id', conversationId)
          .eq('message_id', messageId)
          .single()
        
        if (error && error.code !== 'PGRST116') {
          throw error
        }
        
        setIsPinned(!!data)
      } catch (error) {
        console.error('Error checking pin status:', error)
      } finally {
        setCheckingPin(false)
      }
    }
    
    checkPinned()
  }, [conversationId, messageId])

  // Handle pin/unpin
  const handlePinToggle = async () => {
    if (!conversationId || !messageId || !canPin() || isPinning) {
      console.log('Pin toggle blocked:', { conversationId, messageId, canPin: canPin(), isPinning })
      return
    }

    try {
      setIsPinning(true)
      console.log('Toggling pin:', { isPinned, conversationId, messageId })

      if (isPinned) {
        // Unpin
        const { error } = await supabase
          .from('pinned_messages')
          .delete()
          .eq('conversation_id', conversationId)
          .eq('message_id', messageId)
        
        if (error) {
          console.error('Unpin error:', error)
          throw error
        }
        console.log('Message unpinned successfully')
        setIsPinned(false)
      } else {
        // Pin
        const { error } = await supabase
          .from('pinned_messages')
          .insert({
            conversation_id: conversationId,
            message_id: messageId,
            pinned_by: user.id
          })
        
        if (error) {
          console.error('Pin error:', error)
          throw error
        }
        console.log('Message pinned successfully')
        setIsPinned(true)
      }
    } catch (error) {
      console.error('Error toggling pin:', error)
      alert('Failed to pin/unpin message: ' + (error?.message || 'Please try again.'))
    } finally {
      setIsPinning(false)
    }
  }

  // Handle forward
  const handleForward = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!message || message.is_deleted) {
      return
    }
    setForwardMessage(message)
    setShowForwardModal(true)
    setTimeout(() => {
      onClose()
    }, 0)
  }

  const handleForwardComplete = () => {
    setShowForwardModal(false)
    setForwardMessage(null)
  }

  // Handle reply
  const handleReply = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!message || message.is_deleted) {
      return
    }
    if (onReply) {
      onReply(message)
    }
    onClose()
  }

  // Handle edit
  const handleEdit = () => {
    if (!canEdit() || isEditing) return
    setEditText(message?.content || '')
    setShowEditDialog(true)
  }

  const executeEdit = async () => {
    if (!canEdit() || !editText.trim() || isEditing) return
    
    setIsEditing(true)
    try {
      const { error } = await supabase
        .from('messages')
        .update({
          content: editText.trim(),
          is_edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId)

      if (error) throw error

      setShowEditDialog(false)
      setEditText('')
    } catch (error) {
      console.error('Error editing message:', error)
      alert('Failed to edit message: ' + (error?.message || 'Please try again.'))
    } finally {
      setIsEditing(false)
    }
  }

  // Handle delete for me
  const handleDeleteForMe = () => {
    if (!canUserDelete() || !canDelete() || isDeleting) return
    setDeleteType('for_me')
    setShowConfirmDialog(true)
  }

  // Handle delete for everyone
  const handleDeleteForEveryone = () => {
    if (!canUserDelete() || !canDelete() || isDeleting) return
    setDeleteType('for_everyone')
    setShowConfirmDialog(true)
  }

  const executeDeletion = async () => {
    if (!messageId || !canUserDelete() || !canDelete() || isDeleting) return

    setIsDeleting(true)
    try {
      if (deleteType === 'for_everyone') {
        const { error } = await supabase
          .from('messages')
          .update({
            is_deleted: true,
            deletion_type: 'for_everyone',
            content: ''
          })
          .eq('id', messageId)

        if (error) throw error
      } else {
        // Delete for me - insert into deleted_messages
        const { error } = await supabase
          .from('deleted_messages')
          .insert({
            message_id: messageId,
            user_id: user.id
          })

        if (error) throw error
      }

      setShowConfirmDialog(false)
      setDeleteType(null)
      if (onDeleteSuccess) {
        onDeleteSuccess()
      }
    } catch (error) {
      console.error('Error deleting message:', error)
      alert('Failed to delete message: ' + (error?.message || 'Please try again.'))
    } finally {
      setIsDeleting(false)
    }
  }

  const cancelDeletion = () => {
    setShowConfirmDialog(false)
    setDeleteType(null)
  }

  // Handle click outside
  useEffect(() => {
    if (!isVisible || showForwardModal) return

    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        editDialogRef.current &&
        !editDialogRef.current.contains(event.target) &&
        confirmDialogRef.current &&
        !confirmDialogRef.current.contains(event.target)
      ) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isVisible, showForwardModal, onClose])

  return (
    <>
      {/* Options Menu - only show when visible */}
      {isVisible && (
      <div
        ref={menuRef}
        className={`fixed z-50 rounded-xl shadow-2xl border py-2 min-w-48 frosted-glass border-slate-600/50`}
        style={{
          left: `${currentPosition.x}px`,
          top: `${currentPosition.y}px`,
          transform: 'translate(-50%, -100%)',
          background: 'rgba(30, 41, 59, 0.6)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
        }}
      >
        <div className={`px-3 py-2 border-b border-slate-600/40`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className={`w-4 h-4 ${isOwnMessage ? 'text-slate-400' : 'text-purple-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
              <p className={`text-xs font-medium ${isOwnMessage ? 'text-slate-400' : 'text-purple-300'}`}>Message Options</p>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onClose()
              }}
              className={`w-7 h-7 flex items-center justify-center rounded-md transition-all duration-200 ${
                isOwnMessage 
                  ? 'text-slate-300 hover:text-white hover:bg-slate-700/70 active:bg-slate-600' 
                  : 'text-purple-200 hover:text-white hover:bg-purple-800/70 active:bg-purple-700'
              }`}
              title="Close menu"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="py-1">
          {/* Reply message - Always available */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleReply(e)
            }}
            disabled={message?.is_deleted}
            className={`w-full px-4 py-3 text-left transition-colors duration-200 flex items-center space-x-3 group ${
              message?.is_deleted 
                ? `${isOwnMessage ? 'text-slate-500' : 'text-purple-600'} cursor-not-allowed` 
                : `${isOwnMessage ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-purple-200 hover:text-white hover:bg-purple-800'}`
            }`}
          >
            <div className={`w-8 h-8 rounded-full group-hover:opacity-80 flex items-center justify-center transition-colors duration-200 ${
              isOwnMessage ? 'bg-slate-600 group-hover:bg-slate-500' : 'bg-purple-700 group-hover:bg-purple-600'
            }`}>
              <svg className={`w-4 h-4 ${isOwnMessage ? 'text-slate-300' : 'text-purple-200'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </div>
            <div>
              <div className="font-medium">Reply</div>
              <div className={`text-xs ${isOwnMessage ? 'text-slate-500' : 'text-purple-400'}`}>Reply to this message</div>
            </div>
          </button>

          {/* Edit message - Only for own messages */}
          {isOwnMessage && (
          <button
            onClick={handleEdit}
            disabled={!canEdit() || isEditing}
            className={`w-full px-4 py-3 text-left transition-colors duration-200 flex items-center space-x-3 group ${!canEdit() ? 'text-slate-500 cursor-not-allowed' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
          >
            <div className="w-8 h-8 rounded-full bg-slate-600 group-hover:bg-slate-500 flex items-center justify-center transition-colors duration-200">
              <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
            <div>
              <div className="font-medium">Edit message</div>
              <div className="text-xs text-slate-500">Change text within 10 minutes</div>
            </div>
          </button>
          )}

          {/* Pin/Unpin message - Available for all messages */}
          {!checkingPin && (
            <button
              onClick={handlePinToggle}
              disabled={!canPin() || isPinning}
              className={`w-full px-4 py-3 text-left transition-colors duration-200 flex items-center space-x-3 group ${
                !canPin() 
                  ? `${isOwnMessage ? 'text-slate-500' : 'text-purple-600'} cursor-not-allowed` 
                  : `${isOwnMessage ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-purple-200 hover:text-white hover:bg-purple-800'}`
              }`}
              title={!canPin() ? (conversation?.is_group_chat ? 'Only group admins can pin messages' : 'Cannot pin this message') : ''}
            >
              <div className={`w-8 h-8 rounded-full group-hover:opacity-80 flex items-center justify-center transition-colors duration-200 ${
                isOwnMessage ? 'bg-slate-600 group-hover:bg-slate-500' : 'bg-purple-700 group-hover:bg-purple-600'
              }`}>
                {isPinning ? (
                  <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${
                    isOwnMessage ? 'border-slate-300' : 'border-purple-200'
                  }`}></div>
                ) : isPinned ? (
                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                  </svg>
                ) : (
                  <svg className={`w-4 h-4 ${isOwnMessage ? 'text-slate-300' : 'text-purple-200'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                )}
              </div>
              <div>
                <div className="font-medium">{isPinned ? 'Unpin message' : 'Pin message'}</div>
                <div className={`text-xs ${isOwnMessage ? 'text-slate-500' : 'text-purple-400'}`}>
                  {isPinned ? 'Remove from pinned messages' : 'Keep message at top of chat'}
                </div>
              </div>
            </button>
          )}

          {/* Forward message - Available for all messages */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleForward(e)
            }}
            disabled={message?.is_deleted}
            className={`w-full px-4 py-3 text-left transition-colors duration-200 flex items-center space-x-3 group ${
              message?.is_deleted 
                ? `${isOwnMessage ? 'text-slate-500' : 'text-purple-600'} cursor-not-allowed` 
                : `${isOwnMessage ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-purple-200 hover:text-white hover:bg-purple-800'}`
            }`}
          >
            <div className={`w-8 h-8 rounded-full group-hover:opacity-80 flex items-center justify-center transition-colors duration-200 ${
              isOwnMessage ? 'bg-slate-600 group-hover:bg-slate-500' : 'bg-purple-700 group-hover:bg-purple-600'
            }`}>
              <svg className={`w-4 h-4 ${isOwnMessage ? 'text-slate-300' : 'text-purple-200'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <div className="font-medium">Forward message</div>
              <div className={`text-xs ${isOwnMessage ? 'text-slate-500' : 'text-purple-400'}`}>Send to other conversations</div>
            </div>
          </button>

          {/* Delete buttons - Only for own messages */}
          {isOwnMessage && (
            <>
              <button
                onClick={handleDeleteForMe}
                disabled={!canUserDelete() || !canDelete() || isDeleting}
                className={`w-full px-4 py-3 text-left transition-colors duration-200 flex items-center space-x-3 group ${(!canUserDelete() || !canDelete()) ? 'text-slate-500 cursor-not-allowed' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
              >
                <div className="w-8 h-8 rounded-full bg-slate-600 group-hover:bg-slate-500 flex items-center justify-center transition-colors duration-200">
                  <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium">Delete for Me</div>
                  <div className="text-xs text-slate-500">Remove from your view only</div>
                </div>
              </button>

              <button
                onClick={handleDeleteForEveryone}
                disabled={!canUserDelete() || !canDelete() || isDeleting}
                className={`w-full px-4 py-3 text-left transition-colors duration-200 flex items-center space-x-3 group ${(!canUserDelete() || !canDelete()) ? 'text-red-900/60 cursor-not-allowed' : 'text-red-300 hover:text-red-200 hover:bg-red-900/20'}`}
              >
                <div className="w-8 h-8 rounded-full bg-red-600/20 group-hover:bg-red-600/30 flex items-center justify-center transition-colors duration-200">
                  <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium">Delete for Everyone</div>
                  <div className="text-xs text-red-400">Remove for all participants</div>
                </div>
              </button>
            </>
          )}
        </div>

        {/* Footer - Only show for own messages */}
        {isOwnMessage && (
          <div className={`px-3 py-2 border-t border-slate-600/40`}>
            <div className="flex items-center space-x-2">
              <svg className={`w-3 h-3 ${isOwnMessage ? 'text-slate-500' : 'text-purple-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className={`text-xs ${isOwnMessage ? 'text-slate-500' : 'text-purple-400'}`}>
                Available for 10 minutes after sending
              </p>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Forward Modal */}
      {showForwardModal && forwardMessage && (
        <ForwardModal
          message={forwardMessage}
          conversationId={conversationId}
          onClose={() => {
            setShowForwardModal(false)
            setForwardMessage(null)
          }}
          onForwardComplete={handleForwardComplete}
        />
      )}

      {/* Confirm Delete Dialog */}
      {showConfirmDialog && (
        <div
          ref={confirmDialogRef}
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          onClick={cancelDeletion}
        >
          <div
            className="bg-slate-800 rounded-lg shadow-xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-4">Confirm Deletion</h3>
            <p className="text-slate-300 mb-6">
              Are you sure you want to delete this message {deleteType === 'for_everyone' ? 'for everyone' : 'for yourself'}?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDeletion}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={executeDeletion}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Message Dialog */}
      {showEditDialog && (
        <div
          ref={editDialogRef}
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          onClick={() => { setShowEditDialog(false); setEditText('') }}
        >
          <div
            className="bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-1.5">Edit message</h3>
            <p className="text-slate-400 text-xs mb-2">You can edit your message within 10 minutes of sending.</p>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
            />
            <div className="text-right mt-1 text-xs text-slate-500">
              {Math.max(0, (editText || '').length)} chars
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => { setShowEditDialog(false); setEditText('') }}
                disabled={isEditing}
                className="flex-1 px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={executeEdit}
                disabled={isEditing || !editText.trim() || editText.trim() === (message?.content || '')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEditing ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default MessageOptionsMenu
