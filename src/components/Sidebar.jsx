import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import UserSidebar from './UserSidebar'
import NewChatModal from './NewChatModal'
import NewGroupModal from './NewGroupModal'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getArchivedCount } from '../utils/archiveHelpers'

function Sidebar({ selectedConversationId, onConversationSelect, onGlobalSearch, showArchived = false, onShowArchivedChange }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false)
  const [archivedCount, setArchivedCount] = useState(0)
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
  // Fetch archived count
  useEffect(() => {
    if (!user) return

    const fetchCount = async () => {
      const count = await getArchivedCount(user.id)
      setArchivedCount(count)
    }

    fetchCount()
    
    // Subscribe to archive changes
    const channel = supabase
      .channel('archived-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchCount()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [user])

  const getAvatarContent = () => {
    if (userProfile?.profile_picture && userProfile.profile_picture.trim() !== '') {
      return (
        <img 
          src={userProfile.profile_picture} 
          alt={userProfile.username || 'Avatar'} 
          className="profile-picture avatar w-10 h-10 rounded-full object-cover flex-shrink-0"
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
      <div className="avatar bg-blue-600 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-white font-semibold text-sm">{initials}</span>
      </div>
    )
  }

  return (
    <>
      <aside className="chat-sidebar w-64 border-r flex flex-col transition-colors duration-300" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        {/* Sidebar Header */}
        <div className="p-4 border-b transition-colors duration-300" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold gradient-text">Conversations</h2>
            <button
              onClick={onGlobalSearch}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => e.target.style.color = 'var(--text-secondary)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
              title="Global Search (Ctrl+K)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
          <div className="flex flex-col space-y-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full frosted-glass btn-rounded py-2 px-4 font-medium text-sm flex items-center justify-center space-x-2 transition-colors duration-300"
              style={{ color: 'var(--text-primary)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>New Chat</span>
            </button>
            <button
              onClick={() => setIsGroupModalOpen(true)}
              className="w-full frosted-glass btn-rounded py-2 px-4 font-medium text-sm flex items-center justify-center space-x-2 transition-colors duration-300"
              style={{ color: 'var(--text-primary)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>New Group</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex space-x-1">
            <button
              onClick={() => onShowArchivedChange?.(false)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                !showArchived ? 'frosted-glass' : ''
              }`}
              style={{
                color: !showArchived ? 'var(--text-primary)' : 'var(--text-muted)',
                backgroundColor: !showArchived ? 'var(--surface-light)' : 'transparent'
              }}
            >
              Active
            </button>
            <button
              onClick={() => onShowArchivedChange?.(true)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                showArchived ? 'frosted-glass' : ''
              }`}
              style={{
                color: showArchived ? 'var(--text-primary)' : 'var(--text-muted)',
                backgroundColor: showArchived ? 'var(--surface-light)' : 'transparent'
              }}
            >
              Archived
              {archivedCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {archivedCount > 99 ? '99+' : archivedCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="conversation-list flex-1 overflow-hidden">
          <UserSidebar 
            selectedConversationId={selectedConversationId}
            onConversationSelect={onConversationSelect}
            showArchived={showArchived}
          />
        </div>

        {/* User Info Section at Bottom */}
        {user && (
          <div className="p-4 border-t mt-auto transition-colors duration-300" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center space-x-3 mb-3">
              {/* User Avatar */}
              {getAvatarContent()}
              
              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                  {userProfile?.username || user.email}
                </div>
                <div className="flex items-center space-x-2 text-xs text-emerald-400">
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
                onClick={() => {
                  console.log('Navigating to settings page...')
                  navigate('/settings')
                }}
                className="flex items-center space-x-2 px-2 py-2 rounded transition-colors text-sm settings-btn"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => {
                  e.target.style.color = 'var(--text-primary)'
                  const svg = e.currentTarget.querySelector('svg')
                  if (svg) {
                    svg.classList.add('gear-spinning')
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = 'var(--text-muted)'
                  const svg = e.currentTarget.querySelector('svg')
                  if (svg) {
                    svg.classList.remove('gear-spinning')
                  }
                }}
              >
                <svg className="w-5 h-5 gear-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transformOrigin: 'center' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Settings</span>
              </button>
              <button
                onClick={() => {
                  console.log('Navigating to blocked users page...')
                  navigate('/blocked-users')
                }}
                className="flex items-center space-x-2 px-2 py-2 rounded transition-colors text-sm blocked-users-btn"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => {
                  e.target.style.color = 'var(--text-primary)'
                  const svg = e.currentTarget.querySelector('svg')
                  if (svg) {
                    svg.classList.add('umbrella-animating')
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = 'var(--text-muted)'
                  const svg = e.currentTarget.querySelector('svg')
                  if (svg) {
                    svg.classList.remove('umbrella-animating')
                  }
                }}
              >
                <svg className="w-5 h-5 umbrella-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transformOrigin: 'center' }}>
                  <path id="umbrella-top" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2.69l5.66 5.66a8 8 0 11-11.32 0z" style={{ transformOrigin: '12px 12px' }} />
                  <path id="umbrella-handle" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v10M9 21h6" />
                </svg>
                <span>Blocked Users</span>
              </button>
              <button
                onClick={() => {
                  console.log('Navigating to scheduled messages page...')
                  navigate('/scheduled-messages')
                }}
                className="flex items-center space-x-2 px-2 py-2 rounded transition-colors text-sm scheduled-messages-btn"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => {
                  e.target.style.color = 'var(--text-primary)'
                  const svg = e.currentTarget.querySelector('svg')
                  if (svg) {
                    svg.classList.add('clock-spinning')
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = 'var(--text-muted)'
                  const svg = e.currentTarget.querySelector('svg')
                  if (svg) {
                    svg.classList.remove('clock-spinning')
                  }
                }}
              >
                <svg className="w-5 h-5 clock-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transformOrigin: 'center' }}>
                  <circle cx="12" cy="12" r="10" strokeWidth="2" fill="none" />
                  <line id="minute-hand" x1="12" y1="12" x2="12" y2="6" strokeWidth="2.5" strokeLinecap="round" stroke="currentColor" style={{ transformOrigin: '12px 12px' }} />
                  <line id="hour-hand" x1="12" y1="12" x2="12" y2="9" strokeWidth="2.5" strokeLinecap="round" stroke="currentColor" style={{ transformOrigin: '12px 12px' }} />
                </svg>
                <span>Scheduled Messages</span>
              </button>
              <div className="flex items-center space-x-2">
                <div
                  onClick={() => navigate('/')}
                  className="home-icon-container"
                  style={{ 
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%)',
                    boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)',
                    transition: 'all 0.3s ease',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(139, 92, 246, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 30px rgba(139, 92, 246, 0.6), 0 0 40px rgba(236, 72, 153, 0.4)'
                    e.currentTarget.style.transform = 'scale(1.1)'
                    e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.6)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(139, 92, 246, 0.3)'
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)'
                  }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-primary)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 text-red-400 hover:text-red-300 px-2 py-2 rounded transition-colors text-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Logout</span>
                </button>
              </div>
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

