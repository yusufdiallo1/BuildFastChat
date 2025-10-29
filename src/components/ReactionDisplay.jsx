import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function ReactionDisplay({ messageId, reactions = [] }) {
  const [reactionCounts, setReactionCounts] = useState({})
  const [reactionUsers, setReactionUsers] = useState({})
  const [showTooltip, setShowTooltip] = useState(null)
  const [screenSize, setScreenSize] = useState('desktop')
  const { user } = useAuth()

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
    // Process reactions to get counts and user lists
    const counts = {}
    const users = {}

    reactions.forEach(reaction => {
      const emoji = reaction.emoji
      if (!counts[emoji]) {
        counts[emoji] = 0
        users[emoji] = []
      }
      counts[emoji]++
      users[emoji].push({
        id: reaction.user_id,
        username: reaction.user_profiles?.username || 'Unknown'
      })
    })

    setReactionCounts(counts)
    setReactionUsers(users)
  }, [reactions])

  const handleReactionClick = async (emoji) => {
    if (!user) return

    try {
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
    } catch (error) {
      console.error('Error handling reaction:', error)
    }
  }

  const getTooltipText = (emoji) => {
    const users = reactionUsers[emoji] || []
    if (users.length === 0) return ''
    
    const userNames = users.map(u => u.username).join(', ')
    return `${emoji} ${userNames}`
  }

  const isUserReacted = (emoji) => {
    return reactions.some(r => r.user_id === user?.id && r.emoji === emoji)
  }

  // Get responsive classes based on screen size
  const getResponsiveClasses = () => {
    switch (screenSize) {
      case 'mobile':
        return {
          container: 'gap-1 mt-2 px-1',
          button: 'px-2 py-1 text-xs',
          emoji: 'mr-1 text-sm',
          tooltip: 'mb-1 px-2 py-1 rounded-md text-xs max-w-[200px]'
        }
      case 'tablet':
        return {
          container: 'gap-1.5 mt-2 px-1',
          button: 'px-2.5 py-1.5 text-sm',
          emoji: 'mr-1.5 text-base',
          tooltip: 'mb-2 px-3 py-2 rounded-lg text-xs max-w-[250px]'
        }
      default:
        return {
          container: 'gap-1.5 mt-2 px-1',
          button: 'px-2.5 py-1.5 text-sm',
          emoji: 'mr-1.5 text-base',
          tooltip: 'mb-2 px-3 py-2 rounded-lg text-xs'
        }
    }
  }

  const responsiveClasses = getResponsiveClasses()

  if (Object.keys(reactionCounts).length === 0) {
    return null
  }

  return (
    <div className={`flex flex-wrap ${responsiveClasses.container}`}>
      {Object.entries(reactionCounts).map(([emoji, count]) => (
        <div key={emoji} className="relative">
          <button
            onClick={() => handleReactionClick(emoji)}
            onMouseEnter={() => setShowTooltip(emoji)}
            onMouseLeave={() => setShowTooltip(null)}
            className={`${responsiveClasses.button} rounded-full font-medium transition-all duration-200 hover:scale-105 touch-manipulation ${
              isUserReacted(emoji)
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:shadow-sm'
            }`}
          >
            <span className={`${responsiveClasses.emoji}`}>{emoji}</span>
            <span>{count}</span>
          </button>
          
          {/* Tooltip */}
          {showTooltip === emoji && (
            <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-900 text-white ${responsiveClasses.tooltip} whitespace-nowrap z-50 shadow-lg border border-gray-700`}>
              <div className="truncate">{getTooltipText(emoji)}</div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default ReactionDisplay
