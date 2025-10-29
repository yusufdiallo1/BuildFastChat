import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function GlobalSearch({ isOpen, onClose }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState({
    users: [],
    conversations: [],
    messages: []
  })
  const [recommendedUsers, setRecommendedUsers] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [activeFilter, setActiveFilter] = useState('all') // all, city, interests, mutual
  const searchInputRef = useRef(null)
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
      loadRecommendedUsers()
    }
  }, [isOpen])

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      performGlobalSearch()
    } else {
      setSearchResults({ users: [], conversations: [], messages: [] })
      setSelectedIndex(0)
    }
  }, [searchQuery])

  const loadRecommendedUsers = async () => {
    if (!user) return

    try {
      // Get current user's profile for filtering
      const { data: currentUserProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('city, interests')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      // Get recommended users based on different criteria
      let recommendedQuery = supabase
        .from('user_profiles')
        .select('id, username, profile_picture, city, interests, created_at')
        .neq('id', user.id)
        .limit(20)

      // Apply filters based on activeFilter
      switch (activeFilter) {
        case 'city':
          if (currentUserProfile?.city) {
            recommendedQuery = recommendedQuery.eq('city', currentUserProfile.city)
          }
          break
        case 'interests':
          if (currentUserProfile?.interests) {
            // This would need a more complex query for interests matching
            // For now, we'll just get recent users
            recommendedQuery = recommendedQuery.order('created_at', { ascending: false })
          }
          break
        case 'mutual':
          // Get users who are in groups with current user
          recommendedQuery = recommendedQuery
            .select(`
              id, username, profile_picture, city, interests, created_at,
              conversation_participants!inner(
                conversation_id,
                conversation:conversations!inner(
                  id,
                  conversation_participants!inner(user_id)
                )
              )
            `)
            .eq('conversation_participants.conversation.conversation_participants.user_id', user.id)
            .neq('conversation_participants.user_id', user.id)
          break
        default:
          recommendedQuery = recommendedQuery.order('created_at', { ascending: false })
      }

      const { data: users, error } = await recommendedQuery

      if (error) throw error
      setRecommendedUsers(users || [])
    } catch (error) {
      console.error('Error loading recommended users:', error)
    }
  }

  useEffect(() => {
    loadRecommendedUsers()
  }, [activeFilter, user])

  const performGlobalSearch = async () => {
    if (!searchQuery.trim() || !user) return

    setIsSearching(true)
    try {
      // Search users
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, username, profile_picture, city')
        .ilike('username', `%${searchQuery}%`)
        .neq('id', user.id) // Exclude current user
        .limit(5)

      if (usersError) throw usersError

      // Search conversations
      const { data: conversations, error: conversationsError } = await supabase
        .from('conversations')
        .select(`
          id,
          name,
          is_group_chat,
          created_at,
          conversation_participants!inner(user_id)
        `)
        .eq('conversation_participants.user_id', user.id)
        .or(`name.ilike.%${searchQuery}%,is_group_chat.eq.false`)
        .limit(5)

      if (conversationsError) throw conversationsError

      // Search messages across all user's conversations
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          sent_at,
          conversation_id,
          sender_id,
          sender:user_profiles!sender_id(
            id,
            username,
            profile_picture
          ),
          conversation:conversations!conversation_id(
            id,
            name,
            is_group_chat
          )
        `)
        .ilike('content', `%${searchQuery}%`)
        .in('conversation_id', await getUserConversationIds())
        .order('sent_at', { ascending: false })
        .limit(10)

      if (messagesError) throw messagesError

      setSearchResults({
        users: users || [],
        conversations: conversations || [],
        messages: messages || []
      })
    } catch (error) {
      console.error('Error performing global search:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const getUserConversationIds = async () => {
    const { data, error } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id)

    if (error) throw error
    return data?.map(cp => cp.conversation_id) || []
  }

  const getTotalResults = () => {
    return searchResults.users.length + searchResults.conversations.length + searchResults.messages.length
  }

  const getAllResults = () => {
    const results = []
    
    // Add users
    searchResults.users.forEach(user => {
      results.push({ type: 'user', data: user })
    })
    
    // Add conversations
    searchResults.conversations.forEach(conversation => {
      results.push({ type: 'conversation', data: conversation })
    })
    
    // Add messages
    searchResults.messages.forEach(message => {
      results.push({ type: 'message', data: message })
    })
    
    return results
  }

  const handleResultClick = (result) => {
    switch (result.type) {
      case 'user':
        // Start a new conversation with the user
        startConversationWithUser(result.data.id)
        break
      case 'conversation':
        // Navigate to conversation
        navigate(`/chat?conversation=${result.data.id}`)
        break
      case 'message':
        // Navigate to conversation and scroll to message
        navigate(`/chat?conversation=${result.data.conversation_id}&message=${result.data.id}`)
        break
    }
    onClose()
  }

  const startConversationWithUser = async (userId) => {
    try {
      // Check if conversation already exists
      const { data: existingConversation, error: checkError } = await supabase
        .from('conversations')
        .select(`
          id,
          conversation_participants!inner(user_id)
        `)
        .eq('is_group_chat', false)
        .eq('conversation_participants.user_id', user.id)

      if (checkError) throw checkError

      // Find conversation that includes both users
      let conversationId = null
      for (const conv of existingConversation || []) {
        const { data: participants, error: participantsError } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conv.id)

        if (participantsError) throw participantsError

        const participantIds = participants?.map(p => p.user_id) || []
        if (participantIds.includes(userId) && participantIds.includes(user.id)) {
          conversationId = conv.id
          break
        }
      }

      if (conversationId) {
        // Navigate to existing conversation
        navigate(`/chat?conversation=${conversationId}`)
      } else {
        // Create new conversation
        const { data: newConversation, error: createError } = await supabase
          .from('conversations')
          .insert({
            is_group_chat: false,
            name: null
          })
          .select()
          .single()

        if (createError) throw createError

        // Add participants
        const { error: participantsError } = await supabase
          .from('conversation_participants')
          .insert([
            { conversation_id: newConversation.id, user_id: user.id },
            { conversation_id: newConversation.id, user_id: userId }
          ])

        if (participantsError) throw participantsError

        // Navigate to new conversation
        navigate(`/chat?conversation=${newConversation.id}`)
      }
    } catch (error) {
      console.error('Error starting conversation:', error)
      alert('Failed to start conversation. Please try again.')
    }
  }

  const handleKeyDown = (e) => {
    const allResults = getAllResults()
    
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % allResults.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => prev === 0 ? allResults.length - 1 : prev - 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (allResults[selectedIndex]) {
        handleResultClick(allResults[selectedIndex])
      }
    }
  }

  const formatMessagePreview = (content) => {
    if (content.length > 100) {
      return content.substring(0, 100) + '...'
    }
    return content
  }

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleDateString()
  }

  if (!isOpen) return null

  const allResults = getAllResults()

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 backdrop-blur-sm" onClick={onClose}>
      <div className="flex items-start justify-center pt-20 px-4" onClick={(e) => e.stopPropagation()}>
        <div className="frosted-glass rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-600">
          {/* Search Input */}
          <div className="p-6 border-b border-slate-600">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search users, conversations, and messages..."
                className="w-full px-5 py-4 frosted-glass btn-rounded text-white placeholder-slate-400 focus-ring text-lg"
              />
              {isSearching && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          {searchQuery.length < 2 && (
            <div className="px-6 py-4 border-b border-slate-600">
              <div className="flex space-x-2">
                {[
                  { key: 'all', label: 'All', icon: '👥' },
                  { key: 'city', label: 'Same City', icon: '🏙️' },
                  { key: 'interests', label: 'Interests', icon: '🎯' },
                  { key: 'mutual', label: 'Mutual', icon: '🤝' }
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setActiveFilter(filter.key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeFilter === filter.key
                        ? 'frosted-glass text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    <span className="mr-2">{filter.icon}</span>
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          <div className="max-h-96 overflow-y-auto">
            {searchQuery.length < 2 ? (
              <div className="p-8 text-center text-slate-400">
                <div className="w-16 h-16 mx-auto mb-6 frosted-glass btn-rounded flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-200 mb-2">Recommended Chats</h3>
                <p className="text-sm mb-6">Discover new people to chat with</p>
                
                {/* Recommended Users */}
                {recommendedUsers.length > 0 ? (
                  <div className="space-y-3">
                    {recommendedUsers.slice(0, 6).map((user) => (
                      <div
                        key={user.id}
                        onClick={() => handleResultClick({ type: 'user', data: user })}
                        className="flex items-center p-4 frosted-glass btn-rounded cursor-pointer hover-lift transition-all duration-200"
                      >
                        <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                          {user.profile_picture ? (
                            <img src={user.profile_picture} alt={user.username} className="w-12 h-12 rounded-full object-cover" />
                          ) : (
                            <span className="text-white font-semibold text-lg">
                              {user.username?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                          )}
                        </div>
                        <div className="ml-4 flex-1">
                          <div className="text-white font-medium text-lg">{user.username}</div>
                          <div className="text-slate-400 text-sm flex items-center space-x-2">
                            {user.city && <span>📍 {user.city}</span>}
                            {user.interests && <span>🎯 {user.interests}</span>}
                          </div>
                        </div>
                        <div className="text-slate-500 text-xs">
                          {activeFilter === 'city' && 'Same City'}
                          {activeFilter === 'interests' && 'Similar Interests'}
                          {activeFilter === 'mutual' && 'Mutual Friends'}
                          {activeFilter === 'all' && 'Recommended'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500">No recommendations available</p>
                )}
              </div>
            ) : allResults.length === 0 && !isSearching ? (
              <div className="p-8 text-center text-slate-400">
                <div className="w-16 h-16 mx-auto mb-6 frosted-glass btn-rounded flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.57M15 6.334A7.962 7.962 0 0112 4c-2.34 0-4.29 1.009-5.824 2.57" />
                  </svg>
                </div>
                <p>No results found for "{searchQuery}"</p>
              </div>
            ) : (
              <div className="p-4">
                {/* Users Section */}
                {searchResults.users.length > 0 && (
                  <div className="mb-6">
                    <div className="px-3 py-3 text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center">
                      <span className="mr-2">👥</span>
                      People ({searchResults.users.length})
                    </div>
                    {searchResults.users.map((user, index) => {
                      const resultIndex = allResults.findIndex(r => r.type === 'user' && r.data.id === user.id)
                      return (
                        <div
                          key={`user-${user.id}`}
                          onClick={() => handleResultClick({ type: 'user', data: user })}
                          className={`flex items-center p-4 frosted-glass btn-rounded cursor-pointer transition-all duration-200 mb-2 ${
                            selectedIndex === resultIndex ? 'ring-2 ring-indigo-500' : 'hover-lift'
                          }`}
                        >
                          <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                            {user.profile_picture ? (
                              <img src={user.profile_picture} alt={user.username} className="w-12 h-12 rounded-full object-cover" />
                            ) : (
                              <span className="text-white font-semibold text-lg">
                                {user.username?.charAt(0)?.toUpperCase() || 'U'}
                              </span>
                            )}
                          </div>
                          <div className="ml-4 flex-1">
                            <div className="text-white font-medium text-lg">{user.username}</div>
                            {user.city && <div className="text-slate-400 text-sm">📍 {user.city}</div>}
                          </div>
                          <div className="text-slate-500 text-xs bg-slate-700 px-2 py-1 rounded-full">User</div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Conversations Section */}
                {searchResults.conversations.length > 0 && (
                  <div className="mb-6">
                    <div className="px-3 py-3 text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center">
                      <span className="mr-2">💬</span>
                      Chats ({searchResults.conversations.length})
                    </div>
                    {searchResults.conversations.map((conversation, index) => {
                      const resultIndex = allResults.findIndex(r => r.type === 'conversation' && r.data.id === conversation.id)
                      return (
                        <div
                          key={`conversation-${conversation.id}`}
                          onClick={() => handleResultClick({ type: 'conversation', data: conversation })}
                          className={`flex items-center p-4 frosted-glass btn-rounded cursor-pointer transition-all duration-200 mb-2 ${
                            selectedIndex === resultIndex ? 'ring-2 ring-indigo-500' : 'hover-lift'
                          }`}
                        >
                          <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                          <div className="ml-4 flex-1">
                            <div className="text-white font-medium text-lg">
                              {conversation.is_group_chat ? conversation.name : 'Direct Message'}
                            </div>
                            <div className="text-slate-400 text-sm">
                              {conversation.is_group_chat ? 'Group Chat' : 'Personal Chat'}
                            </div>
                          </div>
                          <div className="text-slate-500 text-xs bg-slate-700 px-2 py-1 rounded-full">Chat</div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Messages Section */}
                {searchResults.messages.length > 0 && (
                  <div className="mb-6">
                    <div className="px-3 py-3 text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center">
                      <span className="mr-2">💭</span>
                      Messages ({searchResults.messages.length})
                    </div>
                    {searchResults.messages.map((message, index) => {
                      const resultIndex = allResults.findIndex(r => r.type === 'message' && r.data.id === message.id)
                      return (
                        <div
                          key={`message-${message.id}`}
                          onClick={() => handleResultClick({ type: 'message', data: message })}
                          className={`flex items-start p-4 frosted-glass btn-rounded cursor-pointer transition-all duration-200 mb-2 ${
                            selectedIndex === resultIndex ? 'ring-2 ring-indigo-500' : 'hover-lift'
                          }`}
                        >
                          <div className="w-10 h-10 bg-gradient-to-r from-slate-600 to-slate-700 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </div>
                          <div className="ml-4 flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-white font-medium text-sm">
                                {message.sender?.username || 'Unknown'}
                              </span>
                              <span className="text-slate-500 text-xs">in</span>
                              <span className="text-indigo-400 text-sm">
                                {message.conversation?.is_group_chat ? message.conversation.name : 'Direct Message'}
                              </span>
                            </div>
                            <div className="text-slate-300 text-sm mb-2">
                              {formatMessagePreview(message.content)}
                            </div>
                            <div className="text-slate-500 text-xs">
                              {formatTimestamp(message.sent_at)}
                            </div>
                          </div>
                          <div className="text-slate-500 text-xs bg-slate-700 px-2 py-1 rounded-full">Message</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-600 frosted-glass rounded-b-2xl">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center space-x-6">
                <span className="flex items-center">
                  <span className="mr-1">↑↓</span> Navigate
                </span>
                <span className="flex items-center">
                  <span className="mr-1">↵</span> Select
                </span>
                <span className="flex items-center">
                  <span className="mr-1">⎋</span> Close
                </span>
              </div>
              {allResults.length > 0 && (
                <span className="bg-slate-700 px-3 py-1 rounded-full">
                  {allResults.length} result{allResults.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GlobalSearch
