import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import Portal from './Portal'

function NewGroupModal({ onClose }) {
  const [groupName, setGroupName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedMembers, setSelectedMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()

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
        
        // Exclude current user and already selected members
        if (user?.id) {
          query = query.neq('id', user.id)
        }
        
        const selectedIds = selectedMembers.map(m => m.id)
        if (selectedIds.length > 0) {
          selectedIds.forEach(id => {
            query = query.neq('id', id)
          })
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
  }, [searchQuery, user?.id, selectedMembers])

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

  const handleAddMember = (user) => {
    if (!selectedMembers.find(m => m.id === user.id)) {
      setSelectedMembers([...selectedMembers, user])
      setSearchQuery('')
      setSearchResults([])
    }
  }

  const handleRemoveMember = (userId) => {
    setSelectedMembers(selectedMembers.filter(m => m.id !== userId))
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length < 1) return

    setCreating(true)

    try {
      // Ensure current user profile exists
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (profileError && profileError.code === 'PGRST116') {
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

      // Create the group conversation
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          created_by: user.id,
          is_group_chat: true,
          name: groupName.trim()
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating conversation:', createError)
        throw createError
      }

      const conversationId = newConversation.id

      // Add all members including the creator
      const participants = [
        { conversation_id: conversationId, user_id: user.id },
        ...selectedMembers.map(member => ({
          conversation_id: conversationId,
          user_id: member.id
        }))
      ]

      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert(participants)

      if (participantsError) {
        console.error('Error adding participants:', participantsError)
        throw participantsError
      }

      // Navigate to the group chat
      onClose()
      navigate(`/chat?conversation=${conversationId}`)

    } catch (error) {
      console.error('Error creating group:', error)
      alert('Failed to create group: ' + (error?.message || 'Please try again.'))
    } finally {
      setCreating(false)
    }
  }

  return (
    <Portal>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div 
          className="bg-[#1f2937] rounded-lg shadow-xl w-full max-w-md max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h2 className="text-2xl font-bold text-white">New Group</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Group Name Input */}
          <div className="p-6 border-b border-gray-700">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Group Name
            </label>
            <input
              type="text"
              placeholder="Enter group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition placeholder-gray-400"
              autoFocus
            />
          </div>

          {/* Selected Members Display */}
          {selectedMembers.length > 0 && (
            <div className="px-6 pt-4 border-b border-gray-700 max-h-32 overflow-y-auto">
              <div className="flex flex-wrap gap-2 pb-4">
                {selectedMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center space-x-2 bg-blue-600 rounded-lg px-3 py-2"
                  >
                    <span className="text-white text-sm font-medium">{member.username}</span>
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-white hover:text-red-200 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Box */}
          <div className="p-6 border-b border-gray-700">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Add Members
            </label>
            <input
              type="text"
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition placeholder-gray-400"
            />
          </div>

          {/* Search Results */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
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
                    className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
                    onClick={() => handleAddMember(user)}
                  >
                    {/* Profile Picture or Initials */}
                    {user.profile_picture ? (
                      <img
                        src={user.profile_picture}
                        alt={user.username}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
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
                ))}
              </div>
            )}

            {!loading && searchQuery.trim().length < 2 && (
              <div className="text-center text-gray-400 py-8">
                Start typing to search for users...
              </div>
            )}
          </div>

          {/* Create Button */}
          <div className="p-6 border-t border-gray-700">
            <button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || selectedMembers.length < 1 || creating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {creating ? (
                <>
                  <div className="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Group</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}

export default NewGroupModal

