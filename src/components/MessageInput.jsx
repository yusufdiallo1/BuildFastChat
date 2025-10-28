import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function MessageInput({ conversationId }) {
  const [message, setMessage] = useState('')
  const { user } = useAuth()
  const typingTimeoutRef = useRef(null)
  const isTypingRef = useRef(false)

  const updateTypingStatus = async (isTyping) => {
    if (!conversationId || !user) return

    try {
      if (isTyping) {
        await supabase
          .from('typing_status')
          .upsert({
            conversation_id: conversationId,
            user_id: user.id,
            is_typing: true,
            updated_at: new Date().toISOString()
          })
      } else {
        await supabase
          .from('typing_status')
          .update({ is_typing: false })
          .eq('conversation_id', conversationId)
          .eq('user_id', user.id)
      }
    } catch (error) {
      console.error('Error updating typing status:', error)
    }
  }

  const handleInputChange = (e) => {
    const newMessage = e.target.value
    setMessage(newMessage)

    if (newMessage.trim().length > 0 && !isTypingRef.current) {
      isTypingRef.current = true
      updateTypingStatus(true)
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false
        updateTypingStatus(false)
      }
    }, 3000)
  }

  const handleSend = async () => {
    if (!message.trim() || !conversationId || !user) return

    try {
      if (isTypingRef.current) {
        isTypingRef.current = false
        updateTypingStatus(false)
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: message.trim(),
          sent_at: new Date().toISOString()
        })

      if (error) throw error
      setMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message: ' + (error?.message || 'Please try again.'))
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend()
    }
  }

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (isTypingRef.current) {
        updateTypingStatus(false)
      }
    }
  }, [])

  if (!conversationId) {
    return null
  }

  return (
    <div className="w-full px-8 py-5 bg-[#111827] border-t border-gray-700">
      <div className="flex items-center space-x-4 max-w-5xl mx-auto">
        <input
          type="text"
          value={message}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Type your message.."
          className="flex-1 px-5 py-3.5 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200 text-sm"
        />
        <button
          onClick={handleSend}
          disabled={!message.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-lg transition-colors duration-200 flex items-center justify-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  )
}

export default MessageInput
