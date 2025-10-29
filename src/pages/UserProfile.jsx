import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'

function UserProfile({ userId, onClose }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [blocking, setBlocking] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockReason, setBlockReason] = useState('')
  const [showBlockModal, setShowBlockModal] = useState(false)
  const { user: currentUser } = useAuth()

  useEffect(() => {
    if (userId) {
      fetchUserProfile()
      checkBlockStatus()
    }
  }, [userId])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setUser(data)
    } catch (error) {
      console.error('Error fetching user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkBlockStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('is_user_blocked', {
        blocker_uuid: currentUser.id,
        blocked_uuid: userId
      })

      if (error) throw error
      setIsBlocked(data)
    } catch (error) {
      console.error('Error checking block status:', error)
    }
  }

  const handleBlockUser = async () => {
    try {
      setBlocking(true)
      
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: currentUser.id,
          blocked_id: userId,
          reason: blockReason || null
        })

      if (error) throw error

      setIsBlocked(true)
      setShowBlockModal(false)
      setBlockReason('')
      alert('User blocked successfully!')
    } catch (error) {
      console.error('Error blocking user:', error)
      alert('Failed to block user. Please try again.')
    } finally {
      setBlocking(false)
    }
  }

  const handleUnblockUser = async () => {
    try {
      setBlocking(true)
      
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', currentUser.id)
        .eq('blocked_id', userId)

      if (error) throw error

      setIsBlocked(false)
      alert('User unblocked successfully!')
    } catch (error) {
      console.error('Error unblocking user:', error)
      alert('Failed to unblock user. Please try again.')
    } finally {
      setBlocking(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="frosted-glass rounded-2xl p-8 border border-slate-600">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
              <div className="text-white text-lg">Loading profile...</div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (!user) {
    return (
      <Layout>
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="frosted-glass rounded-2xl p-8 border border-slate-600">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 frosted-glass btn-rounded flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.57M15 6.334A7.962 7.962 0 0112 4c-2.34 0-4.29 1.009-5.824 2.57" />
                </svg>
              </div>
              <div className="text-white text-lg">User not found</div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen bg-slate-900 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="frosted-glass rounded-2xl shadow-2xl border border-slate-600">
            <div className="px-8 py-6 border-b border-slate-600 flex items-center justify-between">
              <h1 className="text-3xl font-bold gradient-text">User Profile</h1>
              {onClose && (
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <div className="p-8">
              <div className="text-center mb-8">
                <div className="w-32 h-32 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full flex items-center justify-center text-white text-4xl font-bold mx-auto mb-6">
                  {user.username?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <h2 className="text-2xl font-semibold text-white mb-2">
                  {user.username || 'Unknown User'}
                </h2>
                <p className="text-slate-400 text-lg">{user.email}</p>
                {user.bio && (
                  <p className="text-slate-300 mt-4 text-lg">{user.bio}</p>
                )}
              </div>

              <div className="space-y-6">
                <div className="frosted-glass rounded-xl p-6 border border-slate-600">
                  <h3 className="text-white font-semibold text-xl mb-4">Account Information</h3>
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Username:</span>
                      <span className="text-white font-medium">{user.username || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Email:</span>
                      <span className="text-white font-medium">{user.email}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Joined:</span>
                      <span className="text-white font-medium">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>

                {currentUser.id !== userId && (
                  <div className="flex space-x-4">
                    {isBlocked ? (
                      <button
                        onClick={handleUnblockUser}
                        disabled={blocking}
                        className="flex-1 frosted-glass btn-rounded-lg text-emerald-300 px-6 py-3 font-medium hover-lift transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:text-emerald-200"
                      >
                        {blocking ? (
                          <div className="flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                            Unblocking...
                          </div>
                        ) : (
                          'Unblock User'
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowBlockModal(true)}
                        className="flex-1 frosted-glass btn-rounded-lg text-red-300 px-6 py-3 font-medium hover-lift transition-all duration-200 hover:text-red-200"
                      >
                        Block User
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Block User Modal */}
        {showBlockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
            <div className="frosted-glass rounded-2xl p-8 max-w-md w-full mx-4 border border-slate-600">
              <h3 className="text-2xl font-semibold gradient-text mb-6">Block User</h3>
              <p className="text-slate-400 mb-6">
                Are you sure you want to block this user? They won't be able to:
              </p>
              <div className="frosted-glass rounded-xl p-4 mb-6 border border-slate-600">
                <ul className="text-slate-400 text-sm space-y-2">
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
              
              <div className="mb-6">
                <label className="block text-slate-400 text-sm mb-3">
                  Reason (optional):
                </label>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Why are you blocking this user?"
                  className="w-full px-4 py-3 frosted-glass btn-rounded text-white placeholder-slate-400 focus-ring"
                  rows="3"
                />
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setShowBlockModal(false)
                    setBlockReason('')
                  }}
                  className="flex-1 frosted-glass btn-rounded text-slate-300 px-6 py-3 font-medium hover-lift transition-all duration-200 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBlockUser}
                  disabled={blocking}
                  className="flex-1 frosted-glass btn-rounded text-red-300 px-6 py-3 font-medium hover-lift transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:text-red-200"
                >
                  {blocking ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                      Blocking...
                    </div>
                  ) : (
                    'Block User'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default UserProfile
