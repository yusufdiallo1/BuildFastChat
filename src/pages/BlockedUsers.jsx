import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from '../components/Sidebar'
import { PageNavigation } from '../components/PageNavigation'

function BlockedUsers() {
  const [blockedUsers, setBlockedUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [unblocking, setUnblocking] = useState(null)
  const { user } = useAuth()

  useEffect(() => {
    console.log('BlockedUsers component mounted, user:', user)
    if (user) {
      fetchBlockedUsers()
    }
  }, [user])

  const fetchBlockedUsers = async () => {
    try {
      setLoading(true)
      console.log('Fetching blocked users for user:', user.id)
      const { data, error } = await supabase.rpc('get_blocked_users', {
        user_uuid: user.id
      })

      console.log('Blocked users response:', { data, error })
      if (error) throw error
      setBlockedUsers(data || [])
    } catch (error) {
      console.error('Error fetching blocked users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUnblock = async (blockedUserId) => {
    try {
      setUnblocking(blockedUserId)
      
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedUserId)

      if (error) throw error

      // Remove from local state
      setBlockedUsers(prev => prev.filter(u => u.blocked_id !== blockedUserId))
      
      alert('User unblocked successfully!')
    } catch (error) {
      console.error('Error unblocking user:', error)
      alert('Failed to unblock user. Please try again.')
    } finally {
      setUnblocking(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen w-screen overflow-hidden">
        <Sidebar selectedConversationId={null} onConversationSelect={() => {}} />
        <div className="flex-1 transition-colors duration-300 flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
          <div className="frosted-glass rounded-2xl p-8 border border-slate-600">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
              <div className="text-white text-lg">Loading blocked users...</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar selectedConversationId={null} onConversationSelect={() => {}} />
      <div className="flex-1 transition-colors duration-300" style={{ backgroundColor: 'var(--background)' }}>
        <PageNavigation title="Blocked Users" />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="frosted-glass rounded-2xl shadow-2xl border" style={{ borderColor: 'var(--border)' }}>
            <div className="px-8 py-6 border-b" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Manage users you have blocked from contacting you
              </p>
            </div>

            <div className="p-8">
              {blockedUsers.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 mx-auto mb-8 frosted-glass btn-rounded flex items-center justify-center">
                    <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </div>
                  <div className="text-slate-300 text-xl mb-4">No blocked users</div>
                  <p className="text-slate-400 mb-6 max-w-md mx-auto">
                    Users you block will appear here. Blocked users cannot:
                  </p>
                  <div className="frosted-glass rounded-xl p-6 max-w-md mx-auto border border-slate-600">
                    <ul className="text-slate-400 space-y-3 text-left">
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-red-400 rounded-full mr-3"></span>
                        Search for you or find you
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-red-400 rounded-full mr-3"></span>
                        Send you messages
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-red-400 rounded-full mr-3"></span>
                        See your messages in group chats
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {blockedUsers.map((blockedUser) => (
                    <div
                      key={blockedUser.blocked_id}
                      className="frosted-glass rounded-xl p-6 hover-lift transition-all duration-200 border border-slate-600"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6">
                          <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                            {blockedUser.username?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <h3 className="text-white font-semibold text-xl mb-1">
                              {blockedUser.username || 'Unknown User'}
                            </h3>
                            <p className="text-slate-400 text-sm mb-2">
                              {blockedUser.email}
                            </p>
                            <p className="text-slate-500 text-xs mb-1">
                              Blocked on {new Date(blockedUser.blocked_at).toLocaleDateString()}
                            </p>
                            {blockedUser.reason && (
                              <p className="text-slate-500 text-xs">
                                Reason: {blockedUser.reason}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnblock(blockedUser.blocked_id)}
                          disabled={unblocking === blockedUser.blocked_id}
                          className="frosted-glass btn-rounded text-red-300 px-6 py-3 font-medium hover-lift transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:text-red-200"
                        >
                          {unblocking === blockedUser.blocked_id ? (
                            <div className="flex items-center">
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                              Unblocking...
                            </div>
                          ) : (
                            'Unblock'
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BlockedUsers
