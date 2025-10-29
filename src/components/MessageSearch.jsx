import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

function MessageSearch({ conversationId, isOpen, onClose, onSearchResults, onSearchQuery }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [currentResultIndex, setCurrentResultIndex] = useState(0)
  const [isSearching, setIsSearching] = useState(false)
  const searchInputRef = useRef(null)

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      performSearch()
      onSearchQuery?.(searchQuery)
    } else {
      setSearchResults([])
      setCurrentResultIndex(0)
      onSearchResults([])
      onSearchQuery?.('')
    }
  }, [searchQuery])

  const performSearch = async () => {
    if (!conversationId || !searchQuery.trim()) return

    setIsSearching(true)
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:user_profiles!sender_id(
            id,
            username,
            profile_picture
          )
        `)
        .eq('conversation_id', conversationId)
        .ilike('content', `%${searchQuery}%`)
        .order('sent_at', { ascending: true })

      if (error) throw error

      const results = data || []
      setSearchResults(results)
      setCurrentResultIndex(0)
      onSearchResults(results)
    } catch (error) {
      console.error('Error searching messages:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const navigateToResult = (direction) => {
    if (searchResults.length === 0) return

    let newIndex
    if (direction === 'next') {
      newIndex = (currentResultIndex + 1) % searchResults.length
    } else {
      newIndex = currentResultIndex === 0 ? searchResults.length - 1 : currentResultIndex - 1
    }

    setCurrentResultIndex(newIndex)
    
    // Scroll to the message
    const messageElement = document.querySelector(`[data-message-id="${searchResults[newIndex].id}"]`)
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Highlight the message temporarily
      messageElement.classList.add('ring-2', 'ring-yellow-400', 'ring-opacity-50')
      setTimeout(() => {
        messageElement.classList.remove('ring-2', 'ring-yellow-400', 'ring-opacity-50')
      }, 2000)
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setCurrentResultIndex(0)
    onSearchResults([])
    onSearchQuery?.('')
    onClose()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      clearSearch()
    } else if (e.key === 'Enter') {
      if (e.shiftKey) {
        navigateToResult('prev')
      } else {
        navigateToResult('next')
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="bg-gray-800 border-b border-gray-700 px-6 py-3">
      <div className="flex items-center space-x-3">
        {/* Search Input */}
        <div className="flex-1 relative">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search messages..."
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {/* Results Counter and Navigation */}
        {searchResults.length > 0 && (
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <span>
              {currentResultIndex + 1} of {searchResults.length} results
            </span>
            <button
              onClick={() => navigateToResult('prev')}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title="Previous result (Shift+Enter)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => navigateToResult('next')}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title="Next result (Enter)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {/* Clear Button */}
        <button
          onClick={clearSearch}
          className="text-gray-400 hover:text-white transition-colors p-1"
          title="Clear search (Esc)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Search Tips */}
      {searchQuery.length > 0 && searchQuery.length < 2 && (
        <div className="mt-2 text-xs text-gray-500">
          Type at least 2 characters to search
        </div>
      )}
      
      {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
        <div className="mt-2 text-xs text-gray-500">
          No messages found matching "{searchQuery}"
        </div>
      )}
    </div>
  )
}

export default MessageSearch
