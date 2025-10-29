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
        // First, get blocked users
        const { data: blockedUsers, error: blockedError } = await supabase
          .from('blocked_users')
          .select('blocked_id')
          .eq('blocker_id', user.id)

        if (blockedError) throw blockedError

        const blockedIds = blockedUsers?.map(b => b.blocked_id) || []

        let query = supabase
          .from('user_profiles')
          .select('id, username, city, profile_picture')
          .ilike('username', `%${searchQuery}%`)
        
        // Exclude current user
        if (user?.id) {
          query = query.neq('id', user.id)
        }
        
        // Exclude blocked users
        if (blockedIds.length > 0) {
          query = query.not('id', 'in', `(${blockedIds.join(',')})`)
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
        className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div 
          className="frosted-glass rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col border border-slate-600"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-600">
          <h2 className="text-2xl font-bold gradient-text">New Chat</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-700"
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
            className="w-full px-5 py-4 frosted-glass btn-rounded text-white placeholder-slate-400 focus-ring"
            autoFocus
          />
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading && (
            <div className="text-center text-slate-400 py-8">
              <div className="w-8 h-8 mx-auto frosted-glass btn-rounded flex items-center justify-center">
                <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full" />
              </div>
            </div>
          )}

          {!loading && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
            <div className="text-center text-slate-400 py-8">
              <div className="w-16 h-16 mx-auto mb-4 frosted-glass btn-rounded flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.57M15 6.334A7.962 7.962 0 0112 4c-2.34 0-4.29 1.009-5.824 2.57" />
                </svg>
              </div>
              <p>No users found</p>
            </div>
          )}

          {!loading && searchResults.length > 0 && (
            <div className="space-y-3">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="frosted-glass btn-rounded p-4 hover-lift transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      {/* Profile Picture or Initials */}
                      {user.profile_picture ? (
                        <img
                          src={user.profile_picture}
                          alt={user.username}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="bg-gradient-to-r from-indigo-500 to-pink-500 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-semibold text-lg">
                            {getInitials(user.username)}
                          </span>
                        </div>
                      )}

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium text-lg truncate">
                          {user.username}
                        </h3>
                        <p className="text-slate-400 text-sm truncate flex items-center">
                          <span className="mr-1">📍</span>
                          {user.city || 'No city specified'}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleStartChat(user)}
                        disabled={startingChat === user.id}
                        className="frosted-glass btn-rounded text-white px-4 py-2 text-sm font-medium focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {startingChat === user.id ? (
                          <div className="flex items-center">
                            <div className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                            Starting...
                          </div>
                        ) : (
                          'Message'
                        )}
                      </button>
                      <button
                        onClick={() => {
                          // Navigate to user profile or show block modal
                          alert('Block functionality available in chat header')
                        }}
                        className="frosted-glass btn-rounded text-red-300 px-4 py-2 text-sm font-medium focus-ring hover:text-red-200"
                      >
                        Block
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && searchQuery.trim().length < 2 && (
            <div className="text-center text-slate-400 py-8">
              <div className="w-16 h-16 mx-auto mb-4 frosted-glass btn-rounded flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-200 mb-2">Start a New Chat</h3>
              <p className="text-sm">Type at least 2 characters to search for users...</p>
            </div>
          )}
        </div>
        </div>
      </div>
    </Portal>
  )
}

export default NewChatModal

