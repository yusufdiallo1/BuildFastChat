import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { usePresence } from '../hooks/usePresence'

const AuthContext = createContext(null)

// Inner component to use hooks
const AuthProviderInner = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Handle presence tracking
  usePresence(user?.id)

  useEffect(() => {
    let mounted = true

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setUserProfile(null)
      return
    }

    // Fetch or create user profile
    const fetchOrCreateProfile = async () => {
      try {
        // Try to fetch existing profile
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error && error.code === 'PGRST116') {
          // Profile doesn't exist, create it
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert({
              id: user.id,
              email: user.email,
              username: user.email?.split('@')[0] || 'user',
              city: 'Unknown',
              created_at: new Date().toISOString()
            })
            .select()
            .single()

          if (!createError && newProfile) {
            setUserProfile(newProfile)
          } else {
            console.error('Error creating user profile:', createError)
          }
        } else if (!error && data) {
          setUserProfile(data)
        } else {
          console.error('Error fetching user profile:', error)
        }
      } catch (error) {
        console.error('Error in fetchOrCreateProfile:', error)
      }
    }

    fetchOrCreateProfile()
  }, [user])

  const value = {
    user,
    userProfile,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const AuthProvider = ({ children }) => {
  return <AuthProviderInner>{children}</AuthProviderInner>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
