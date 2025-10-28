import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create a custom storage implementation using sessionStorage
// sessionStorage is isolated per browser tab/window, allowing multiple accounts in different Arc spaces
const getSessionStorage = () => {
  const prefix = 'sb-auth'
  
  return {
    getItem: (key) => {
      try {
        const fullKey = `${prefix}_${key}`
        return sessionStorage.getItem(fullKey)
      } catch (error) {
        console.error('Error reading from sessionStorage:', error)
        return null
      }
    },
    setItem: (key, value) => {
      try {
        const fullKey = `${prefix}_${key}`
        sessionStorage.setItem(fullKey, value)
      } catch (error) {
        console.error('Error writing to sessionStorage:', error)
      }
    },
    removeItem: (key) => {
      try {
        const fullKey = `${prefix}_${key}`
        sessionStorage.removeItem(fullKey)
      } catch (error) {
        console.error('Error removing from sessionStorage:', error)
      }
    },
    get length() {
      try {
        let count = 0
        for (let i = 0; i < sessionStorage.length; i++) {
          if (sessionStorage.key(i)?.startsWith(prefix)) {
            count++
          }
        }
        return count
      } catch {
        return 0
      }
    },
    clear: () => {
      try {
        const keysToRemove = []
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i)
          if (key?.startsWith(prefix)) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => sessionStorage.removeItem(key))
      } catch (error) {
        console.error('Error clearing sessionStorage:', error)
      }
    },
    key: (index) => {
      try {
        const keys = []
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i)
          if (key?.startsWith(prefix)) {
            keys.push(key)
          }
        }
        return keys[index] || null
      } catch {
        return null
      }
    }
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: getSessionStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce'
  }
})

