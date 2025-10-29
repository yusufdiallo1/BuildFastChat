import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import Portal from './Portal'
import ChatAppearanceModal from './ChatAppearanceModal'

function GroupSettingsModal({ conversationId, conversation, currentUserId, onClose }) {
  const [showChatAppearance, setShowChatAppearance] = useState(false)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [groupName, setGroupName] = useState(conversation?.name || '')
  const [isSavingName, setIsSavingName] = useState(false)
  const [addingMembers, setAddingMembers] = useState(false)
  const [disappearingDuration, setDisappearingDuration] = useState(conversation?.disappearing_messages_duration || null)
  const [isSavingDisappearing, setIsSavingDisappearing] = useState(false)
  const navigate = useNavigate()

  const isCreator = currentUserId === conversation?.created_by
  // For DMs, both participants can change disappearing messages setting
  // For group chats, only creator/admin can change
  const canChangeDisappearing = conversation?.is_group_chat ? isCreator : true

  useEffect(() => {
    fetchMembers()
    
    // Handle escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [conversationId])

  const fetchMembers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('conversation_participants')
        .select(`
          user_id,
          joined_at,
          user_profiles!inner(
            id,
            username,
            profile_picture
          )
        `)
        .eq('conversation_id', conversationId)

      if (error) throw error

      setMembers(data || [])
    } catch (error) {
      console.error('Error fetching members:', error)
      alert('Failed to load group members')
    } finally {
      setLoading(false)
    }
  }

  const handleSearchUsers = async () => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      return
    }

    setSearchLoading(true)
    try {
      let query = supabase
        .from('user_profiles')
        .select('id, username, city, profile_picture')
        .ilike('username', `%${searchQuery}%`)
      
      // Exclude current user and existing members
      if (currentUserId) {
        query = query.neq('id', currentUserId)
      }
      
      const existingMemberIds = members.map(m => m.user_id)
      existingMemberIds.forEach(id => {
        query = query.neq('id', id)
      })
      
      query = query.limit(20)
      const { data, error } = await query

      if (!error && data) {
        setSearchResults(data)
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setSearchLoading(false)
    }
  }

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      handleSearchUsers()
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [searchQuery])

  const handleSaveName = async () => {
    if (!groupName.trim() || isSavingName) return

    setIsSavingName(true)
    try {
      // Use Supabase client for update (RLS policies will handle authorization)
      const { error } = await supabase
        .from('conversations')
        .update({ name: groupName.trim() })
        .eq('id', conversationId)

      if (error) throw error

      // Update local state
      conversation.name = groupName.trim()
      setIsEditingName(false)
      alert('Group name updated successfully!')
    } catch (error) {
      console.error('Error updating group name:', error)
      alert('Failed to update group name')
    } finally {
      setIsSavingName(false)
    }
  }

  const handleRemoveMember = async (memberUserId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return

    try {
      // Use Supabase client for delete (RLS policies will handle authorization)
      const { error } = await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', memberUserId)
      
      if (error) throw error
      
      setMembers(members.filter(m => m.user_id !== memberUserId))
      alert('Member removed successfully')
    } catch (error) {
      console.error('Error removing member:', error)
      alert('Failed to remove member')
    }
  }

  const handleAddMember = async (user) => {
    if (addingMembers) return

    setAddingMembers(true)
    try {
      // Use Supabase client for insert (RLS policies will handle authorization)
      const { error } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversationId,
          user_id: user.id
        })
      
      if (error) {
        // Handle conflict gracefully
        if (error.code === '23505') {
          alert('This user is already a member of the group')
          setAddingMembers(false)
          return
        }
        throw error
      }
      
      // Add to local state
      setMembers([...members, {
        user_id: user.id,
        user_profiles: {
          id: user.id,
          username: user.username,
          profile_picture: user.profile_picture
        }
      }])
      
      setSearchQuery('')
      setSearchResults([])
      alert('Member added successfully')
    } catch (error) {
      console.error('Error adding member:', error)
      alert('Failed to add member')
    } finally {
      setAddingMembers(false)
    }
  }

  const handleSaveDisappearing = async () => {
    if (isSavingDisappearing) return

    setIsSavingDisappearing(true)
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ disappearing_messages_duration: disappearingDuration })
        .eq('id', conversationId)

      if (error) throw error

      // Update conversation object
      conversation.disappearing_messages_duration = disappearingDuration
      alert('Disappearing messages setting updated successfully!')
      // Trigger parent refresh by closing and reopening (will happen via onClose callback)
    } catch (error) {
      console.error('Error updating disappearing messages setting:', error)
      alert('Failed to update disappearing messages setting')
    } finally {
      setIsSavingDisappearing(false)
    }
  }

  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) return

    try {
      const { error } = await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', currentUserId)
      
      if (error) throw error
      
      onClose()
      navigate('/chat')
    } catch (error) {
      console.error('Error leaving group:', error)
      alert('Failed to leave group')
    }
  }

  const getInitials = (username) => {
    return username?.substring(0, 2).toUpperCase() || 'U'
  }

  const getAvatarColor = (userId) => {
    const colors = ['bg-blue-600', 'bg-purple-600', 'bg-green-600', 'bg-pink-600', 'bg-orange-600', 'bg-teal-600']
    const index = parseInt(userId?.substring(0, 2), 16) % colors.length
    return colors[index]
  }

  return (
    <Portal>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div 
          className="bg-[#1f2937] rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h2 className="text-2xl font-bold text-white">
              {conversation?.is_group_chat ? 'Group Settings' : 'Conversation Settings'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Group Details */}
            <section>
              <h3 className="text-lg font-semibold text-white mb-4">Group Details</h3>
              {isEditingName ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="flex-1 px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={!groupName.trim() || isSavingName}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingName ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingName(false)
                      setGroupName(conversation?.name || '')
                    }}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-gray-700 rounded-lg p-4">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Group Name</p>
                    <p className="text-white font-medium">{groupName}</p>
                  </div>
                  {isCreator && (
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="text-blue-500 hover:text-blue-400 text-sm font-medium"
                    >
                      Edit
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* Disappearing Messages Section */}
            <section>
              <h3 className="text-lg font-semibold text-white mb-4">Disappearing Messages</h3>
              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-4">
                  Messages will automatically delete after the selected duration
                </p>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 text-white cursor-pointer">
                    <input
                      type="radio"
                      name="disappearingDuration"
                      value="off"
                      checked={disappearingDuration === null}
                      onChange={() => setDisappearingDuration(null)}
                      className="form-radio h-4 w-4 text-blue-600"
                      disabled={!canChangeDisappearing || isSavingDisappearing}
                    />
                    <span>Off</span>
                  </label>
                  <label className="flex items-center space-x-3 text-white cursor-pointer">
                    <input
                      type="radio"
                      name="disappearingDuration"
                      value="24"
                      checked={disappearingDuration === 24}
                      onChange={() => setDisappearingDuration(24)}
                      className="form-radio h-4 w-4 text-blue-600"
                      disabled={!canChangeDisappearing || isSavingDisappearing}
                    />
                    <span>24 hours</span>
                  </label>
                  <label className="flex items-center space-x-3 text-white cursor-pointer">
                    <input
                      type="radio"
                      name="disappearingDuration"
                      value="168"
                      checked={disappearingDuration === 168}
                      onChange={() => setDisappearingDuration(168)}
                      className="form-radio h-4 w-4 text-blue-600"
                      disabled={!canChangeDisappearing || isSavingDisappearing}
                    />
                    <span>7 days</span>
                  </label>
                  <label className="flex items-center space-x-3 text-white cursor-pointer">
                    <input
                      type="radio"
                      name="disappearingDuration"
                      value="2160"
                      checked={disappearingDuration === 2160}
                      onChange={() => setDisappearingDuration(2160)}
                      className="form-radio h-4 w-4 text-blue-600"
                      disabled={!canChangeDisappearing || isSavingDisappearing}
                    />
                    <span>90 days</span>
                  </label>
                </div>
                {canChangeDisappearing && (
                  <button
                    onClick={handleSaveDisappearing}
                    disabled={isSavingDisappearing || disappearingDuration === (conversation?.disappearing_messages_duration || null)}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingDisappearing ? 'Saving...' : 'Save Settings'}
                  </button>
                )}
                {!canChangeDisappearing && conversation?.is_group_chat && (
                  <p className="mt-4 text-gray-500 text-sm">Only group admins can change this setting</p>
                )}
              </div>
            </section>

            {/* Chat Appearance Section */}
            <section>
              <h3 className="text-lg font-semibold text-white mb-4">Chat Appearance</h3>
              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-4">
                  Customize the look and feel of this chat with backgrounds, colors, and bubble styles
                </p>
                <button
                  onClick={() => setShowChatAppearance(true)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  <span>Customize Chat Appearance</span>
                </button>
              </div>
            </section>

            {/* Members Section - Only for group chats */}
            {conversation?.is_group_chat && (
            <section>
              <h3 className="text-lg font-semibold text-white mb-4">Members ({members.length})</h3>
              
              {/* Members List */}
              <div className="space-y-3 mb-4">
                {loading ? (
                  <div className="text-center text-gray-400 py-8">
                    <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full" />
                  </div>
                ) : (
                  members.map((member) => {
                    const memberProfile = member.user_profiles
                    const isMemberCreator = member.user_id === conversation?.created_by
                    
                    return (
                      <div key={member.user_id} className="flex items-center justify-between bg-gray-700 rounded-lg p-3">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          {/* Avatar */}
                          {memberProfile?.profile_picture ? (
                            <img
                              src={memberProfile.profile_picture}
                              alt={memberProfile.username}
                              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className={`${getAvatarColor(memberProfile?.id)} w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0`}>
                              <span className="text-white font-semibold text-xs">
                                {getInitials(memberProfile?.username)}
                              </span>
                            </div>
                          )}
                          
                          {/* Name and Admin Badge */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <h4 className="text-white font-medium text-sm truncate">
                                {memberProfile?.username || 'Unknown'}
                              </h4>
                              {isMemberCreator && (
                                <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded flex-shrink-0">
                                  Admin
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Remove Button (only for creator) */}
                        {isCreator && member.user_id !== currentUserId && !isMemberCreator && (
                          <button
                            onClick={() => handleRemoveMember(member.user_id)}
                            className="text-red-400 hover:text-red-300 ml-3 flex-shrink-0"
                            title="Remove member"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Add Members Button (only for creator) */}
              {isCreator && (
                <div>
                  <input
                    type="text"
                    placeholder="Search users to add..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none mb-3 placeholder-gray-400"
                  />
                  
                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center space-x-3 p-3 bg-gray-600 rounded-lg hover:bg-gray-500 transition-colors cursor-pointer"
                          onClick={() => handleAddMember(user)}
                        >
                          {user.profile_picture ? (
                            <img
                              src={user.profile_picture}
                              alt={user.username}
                              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className={`${getAvatarColor(user.id)} w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0`}>
                              <span className="text-white font-semibold text-xs">
                                {getInitials(user.username)}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-medium text-sm truncate">
                              {user.username}
                            </h4>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {searchLoading && (
                    <div className="text-center text-gray-400 py-4">
                      <div className="animate-spin inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full" />
                    </div>
                  )}
                </div>
              )}
            </section>
            )}
          </div>

          {/* Footer - Only for group chats */}
          {conversation?.is_group_chat && (
            <div className="p-6 border-t border-gray-700">
              <button
                onClick={handleLeaveGroup}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
              >
                Leave Group
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chat Appearance Modal */}
      {showChatAppearance && (
        <ChatAppearanceModal
          conversationId={conversationId}
          isGroupChat={conversation?.is_group_chat}
          onClose={() => setShowChatAppearance(false)}
        />
      )}
    </Portal>
  )
}

export default GroupSettingsModal

