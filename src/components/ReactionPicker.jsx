import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

function ReactionPicker({ messageId, onReactionAdded, onClose }) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [screenSize, setScreenSize] = useState('desktop')
  const { user } = useAuth()
  const pickerRef = useRef(null)

  // Detect screen size
  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth
      if (width < 640) {
        setScreenSize('mobile')
      } else if (width < 768) {
        setScreenSize('tablet')
      } else {
        setScreenSize('desktop')
      }
    }

    updateScreenSize()
    window.addEventListener('resize', updateScreenSize)
    return () => window.removeEventListener('resize', updateScreenSize)
  }, [])

  useEffect(() => {
    setIsVisible(true)
    
    // Close picker when clicking outside
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  const handleEmojiClick = async (emoji) => {
    if (!user || isLoading) return

    try {
      setIsLoading(true)
      
      // Check if user already reacted with this emoji
      const { data: existingReaction, error: checkError } = await supabase
        .from('message_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      if (existingReaction) {
        // Remove existing reaction
        const { error: deleteError } = await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', user.id)
          .eq('emoji', emoji)

        if (deleteError) throw deleteError
      } else {
        // Add new reaction
        const { error: insertError } = await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: user.id,
            emoji: emoji
          })

        if (insertError) throw insertError
      }

      // Notify parent component
      onReactionAdded()
      
      // Close picker after reaction
      onClose()
    } catch (error) {
      console.error('Error handling reaction:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Get responsive classes based on screen size
  const getResponsiveClasses = () => {
    switch (screenSize) {
      case 'mobile':
        return {
          container: 'mb-2 p-1.5 max-w-[85vw]',
          emojiContainer: 'space-x-0.5',
          button: 'w-7 h-7 text-base',
          arrow: 'border-l-2 border-r-2 border-t-2'
        }
      case 'tablet':
        return {
          container: 'mb-2 p-2',
          emojiContainer: 'space-x-1',
          button: 'w-8 h-8 text-lg',
          arrow: 'border-l-3 border-r-3 border-t-3'
        }
      default:
        return {
          container: 'mb-2 p-2',
          emojiContainer: 'space-x-1.5',
          button: 'w-9 h-9 text-lg',
          arrow: 'border-l-3 border-r-3 border-t-3'
        }
    }
  }

  const responsiveClasses = getResponsiveClasses()

  if (!isVisible) return null

  return (
    <div
      ref={pickerRef}
      className={`absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50 ${responsiveClasses.container}`}
      style={{
        animation: 'fadeInUp 0.2s ease-out'
      }}
    >
      <div className={`flex items-center justify-center ${responsiveClasses.emojiContainer}`}>
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleEmojiClick(emoji)}
            disabled={isLoading}
            className={`${responsiveClasses.button} flex items-center justify-center rounded-md hover:bg-gray-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation`}
            title={`React with ${emoji}`}
          >
            {isLoading ? (
              <div className={`${screenSize === 'mobile' ? 'w-2 h-2' : 'w-3 h-3'} border-2 border-gray-400 border-t-transparent rounded-full animate-spin`}></div>
            ) : (
              emoji
            )}
          </button>
        ))}
      </div>
      
      {/* Arrow pointing down */}
      <div className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 ${responsiveClasses.arrow} border-transparent border-t-gray-600`}></div>
    </div>
  )
}

export default ReactionPicker
