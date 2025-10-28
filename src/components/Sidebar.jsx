import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UserSidebar from './UserSidebar'
import NewChatModal from './NewChatModal'
import NewGroupModal from './NewGroupModal'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

function Sidebar({ selectedConversationId, onConversationSelect }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false)
  const { user, userProfile } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      // Clear all session data
      await supabase.auth.signOut()
      // Navigate to home page after logout
      navigate('/', { replace: true })
    } catch (error) {
      console.error('Logout error:', error)
      // Still navigate even if there's an error
      navigate('/', { replace: true })
    }
  }

  // Get avatar image or initials
  const getAvatarContent = () => {
    if (userProfile?.profile_picture && userProfile.profile_picture.trim() !== '') {
      return (
        <img 
          src={userProfile.profile_picture} 
          alt={userProfile.username || 'Avatar'} 
          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          onError={(e) => {
            e.target.style.display = 'none'
          }}
        />
      )
    }
    const initials = userProfile?.username 
      ? userProfile.username.substring(0, 2).toUpperCase()
      : user?.email?.substring(0, 2).toUpperCase() || 'U'
    return (
      <div className="bg-blue-600 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-white font-semibold text-sm">{initials}</span>
      </div>
    )
  }

  return (
    <>
      <aside className="w-64 bg-[#1f2937] border-r border-gray-700 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Conversations</h2>
          </div>
          <div className="flex flex-col space-y-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium text-sm transition-colors flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>New Chat</span>
            </button>
            <button
              onClick={() => setIsGroupModalOpen(true)}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium text-sm transition-colors flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>New Group</span>
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <UserSidebar 
          selectedConversationId={selectedConversationId}
          onConversationSelect={onConversationSelect}
        />

        {/* User Info Section at Bottom */}
        {user && (
          <div className="p-4 border-t border-gray-700 mt-auto">
            <div className="flex items-center space-x-3 mb-3">
              {/* User Avatar */}
              {getAvatarContent()}
              
              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium text-sm truncate">
                  {userProfile?.username || user.email}
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  {/* Active Status with Glowing Dot */}
                  <div className="relative">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping opacity-75"></div>
                  </div>
                  <span>Active</span>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex flex-col space-y-2">
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-red-400 hover:text-red-300 px-2 py-2 rounded transition-colors text-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </button>
            </nav>
          </div>
        )}
      </aside>

      {isModalOpen && <NewChatModal onClose={() => setIsModalOpen(false)} />}
      {isGroupModalOpen && <NewGroupModal onClose={() => setIsGroupModalOpen(false)} />}
    </>
  )
}

export default Sidebar

