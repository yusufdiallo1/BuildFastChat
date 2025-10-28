import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import Portal from './Portal'

function NewChatModal({ onClose }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [startingChat, setStartingChat] = useState(null)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([])
        return
      }

      setLoading(true)
      try {
        let query = supabase
          .from('user_profiles')
          .select('id, username, city, profile_picture')
          .ilike('username', `%${searchQuery}%`)
        
        // Add neq filter conditionally
        if (user?.id) {
          query = query.neq('id', user.id)
        }
        
        query = query.limit(20)
        const { data, error } = await query

        if (!error && data) {
          setSearchResults(data)
        } else if (error) {
          console.error('Search error:', error)
        }
      } catch (error) {
        console.error('Error searching users:', error)
      } finally {
        setLoading(false)
      }
    }

    const debounceTimer = setTimeout(() => {
      searchUsers()
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [searchQuery, user?.id])

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

  const getInitials = (username) => {
    return username?.substring(0, 2).toUpperCase() || 'U'
  }

  const handleStartChat = async (selectedUser) => {
    if (!user || !selectedUser) return

    setStartingChat(selectedUser.id)

    try {
      // Ensure current user profile exists before creating conversation
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const { error: createProfileError } = await supabase
          .from('user_profiles')
          .insert({
            id: user.id,
            email: user.email,
            username: user.email?.split('@')[0] || 'user',
            city: 'Unknown',
            created_at: new Date().toISOString()
          })

        if (createProfileError) {
          throw createProfileError
        }
      }

      // Get all conversations where current user is a participant
      const { data: myConvs, error: myConvsError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id)

      if (myConvsError) throw myConvsError

      let conversationId = null

      // Check each conversation to see if it includes the selected user
      if (myConvs && myConvs.length > 0) {
        for (const conv of myConvs) {
          // Get all participants of this conversation
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conv.conversation_id)

          // Check if this is a 1-on-1 conversation with the selected user
          if (participants && participants.length === 2) {
            const userIds = participants.map(p => p.user_id)
            if (userIds.includes(selectedUser.id)) {
              // Verify it's not a group chat
              const { data: convData } = await supabase
                .from('conversations')
                .select('is_group_chat')
                .eq('id', conv.conversation_id)
                .single()

              if (convData && !convData.is_group_chat) {
                conversationId = conv.conversation_id
                break
              }
            }
          }
        }
      }

      // If no existing conversation, create a new one
      if (!conversationId) {
        // Create conversation
        const { data: newConversation, error: createError } = await supabase
          .from('conversations')
          .insert({
            created_by: user.id,
            is_group_chat: false,
            name: null
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating conversation:', createError)
          throw createError
        }

        conversationId = newConversation.id

        // Add both users as participants
        const { error: participantsError } = await supabase
          .from('conversation_participants')
          .insert([
            { conversation_id: conversationId, user_id: user.id },
            { conversation_id: conversationId, user_id: selectedUser.id }
          ])

        if (participantsError) {
          console.error('Error adding participants:', participantsError)
          throw participantsError
        }
      }

      // Navigate to the chat with this conversation
      onClose()
      navigate(`/chat?conversation=${conversationId}`)

    } catch (error) {
      console.error('Error starting chat:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      alert('Failed to start chat: ' + (error?.message || 'Please try again.'))
    } finally {
      setStartingChat(null)
    }
  }

  return (
    <Portal>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div 
          className="bg-[#1f2937] rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">New Chat</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Box */}
        <div className="p-6">
          <input
            type="text"
            placeholder="Search by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition placeholder-gray-400"
            autoFocus
          />
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading && (
            <div className="text-center text-gray-400 py-8">
              <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full" />
            </div>
          )}

          {!loading && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              No users found
            </div>
          )}

          {!loading && searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {/* Profile Picture or Initials */}
                    {user.profile_picture ? (
                      <img
                        src={user.profile_picture}
                        alt={user.username}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="bg-blue-600 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-sm">
                          {getInitials(user.username)}
                        </span>
                      </div>
                    )}

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium text-sm truncate">
                        {user.username}
                      </h3>
                      <p className="text-gray-400 text-xs truncate">
                        {user.city || 'No city specified'}
                      </p>
                    </div>
                  </div>

                  {/* Message Button */}
                  <button
                    onClick={() => handleStartChat(user)}
                    disabled={startingChat === user.id}
                    className="ml-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    {startingChat === user.id ? (
                      <div className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      'Message'
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {!loading && searchQuery.trim().length < 2 && (
            <div className="text-center text-gray-400 py-8">
              Start typing to search for users...
            </div>
          )}
        </div>
        </div>
      </div>
    </Portal>
  )
}

export default NewChatModal

