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
        className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div 
          className="frosted-glass rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col border border-slate-600"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-600">
            <h2 className="text-2xl font-bold gradient-text">New Group</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Group Name Input */}
          <div className="p-6 border-b border-slate-600">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Group Name
            </label>
            <input
              type="text"
              placeholder="Enter group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-5 py-4 frosted-glass btn-rounded text-white placeholder-slate-400 focus-ring"
              autoFocus
            />
          </div>

          {/* Selected Members Display */}
          {selectedMembers.length > 0 && (
            <div className="px-6 pt-4 border-b border-slate-600 max-h-32 overflow-y-auto">
              <div className="flex flex-wrap gap-3 pb-4">
                {selectedMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center space-x-2 frosted-glass btn-rounded px-4 py-2"
                  >
                    <span className="text-white text-sm font-medium">{member.username}</span>
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-slate-400 hover:text-red-300 transition-colors p-1 rounded-full hover:bg-slate-700"
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
          <div className="p-6 border-b border-slate-600">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Add Members
            </label>
            <input
              type="text"
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-5 py-4 frosted-glass btn-rounded text-white placeholder-slate-400 focus-ring"
            />
          </div>

          {/* Search Results */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
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
                    className="frosted-glass btn-rounded p-4 hover-lift transition-all duration-200 cursor-pointer"
                    onClick={() => handleAddMember(user)}
                  >
                    <div className="flex items-center space-x-4">
                      {/* Profile Picture or Initials */}
                      {user.profile_picture ? (
                        <img
                          src={user.profile_picture}
                          alt={user.username}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
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
                      
                      {/* Add Icon */}
                      <div className="text-slate-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
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
                <h3 className="text-lg font-semibold text-slate-200 mb-2">Add Members</h3>
                <p className="text-sm">Type at least 2 characters to search for users...</p>
              </div>
            )}
          </div>

          {/* Create Button */}
          <div className="p-6 border-t border-slate-600">
            <button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || selectedMembers.length < 1 || creating}
              className="w-full frosted-glass btn-rounded-lg text-white py-4 px-6 font-medium focus-ring disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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

