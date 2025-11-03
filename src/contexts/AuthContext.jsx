import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { usePresence } from '../hooks/usePresence'
import { initSocket, disconnectSocket } from '../lib/socket'

const AuthContext = createContext(null)

// Helper function to apply theme
const applyThemeFromProfile = (themeMode) => {
  const root = document.documentElement
  if (themeMode === 'light') {
    root.style.setProperty('--background', '#ffffff')
    root.style.setProperty('--surface', '#f8f9fa')
    root.style.setProperty('--surface-light', '#e9ecef')
    root.style.setProperty('--text-primary', '#1a1a1a')
    root.style.setProperty('--text-secondary', '#495057')
    root.style.setProperty('--text-muted', '#6c757d')
    root.style.setProperty('--border', '#dee2e6')
    document.body.classList.remove('dark-mode')
    document.body.classList.add('light-mode')
    localStorage.setItem('theme_preference', 'light')
  } else {
    root.style.setProperty('--background', '#0f172a')
    root.style.setProperty('--surface', '#1e293b')
    root.style.setProperty('--surface-light', '#334155')
    root.style.setProperty('--text-primary', '#f8fafc')
    root.style.setProperty('--text-secondary', '#cbd5e1')
    root.style.setProperty('--text-muted', '#94a3b8')
    root.style.setProperty('--border', '#334155')
    document.body.classList.remove('light-mode')
    document.body.classList.add('dark-mode')
    localStorage.setItem('theme_preference', 'dark')
  }
}

// Inner component to use hooks
const AuthProviderInner = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Handle presence tracking
  usePresence(user?.id)

  useEffect(() => {
    let mounted = true

    // Apply theme from localStorage immediately if available
    const savedTheme = localStorage.getItem('theme_preference')
    if (savedTheme === 'light' || savedTheme === 'dark') {
      applyThemeFromProfile(savedTheme)
    }

    // Get initial session - wrap in try/catch to prevent errors
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error('Error getting session:', error)
          if (mounted) {
            setLoading(false)
          }
          return
        }
        if (mounted) {
          setUser(session?.user ?? null)
          setLoading(false)
        }
      })
      .catch(err => {
        console.error('Failed to get session:', err)
        if (mounted) {
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

  // Initialize socket when user is logged in - DISABLED until backend server is set up
  // useEffect(() => {
  //   if (user?.id) {
  //     initSocket(user.id)
  //   } else {
  //     disconnectSocket()
  //   }
  //   
  //   return () => {
  //     disconnectSocket()
  //   }
  // }, [user?.id])

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
              created_at: new Date().toISOString(),
              theme_preference: 'dark'
            })
            .select()
            .single()

          if (!createError && newProfile) {
            setUserProfile(newProfile)
            // Apply theme from profile
            if (newProfile.theme_preference) {
              applyThemeFromProfile(newProfile.theme_preference)
            }
          } else {
            console.error('Error creating user profile:', createError)
          }
        } else if (!error && data) {
          setUserProfile(data)
          // Apply theme from profile
          if (data.theme_preference) {
            applyThemeFromProfile(data.theme_preference)
          }
        } else {
          console.error('Error fetching user profile:', error)
        }
      } catch (error) {
        console.error('Error in fetchOrCreateProfile:', error)
      }
    }

    fetchOrCreateProfile()

    // Listen for profile updates
    const channel = supabase
      .channel(`profile-updates-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          setUserProfile(payload.new)
          if (payload.new.theme_preference) {
            applyThemeFromProfile(payload.new.theme_preference)
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
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
