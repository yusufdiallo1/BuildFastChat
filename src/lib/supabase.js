import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

// STRICT validation - prevent any client creation if URL is malformed
const isUrlValid = supabaseUrl && 
                   typeof supabaseUrl === 'string' && 
                   supabaseUrl.startsWith('https://') && 
                   (supabaseUrl.includes('.supabase.co') || supabaseUrl.includes('localhost')) &&
                   supabaseUrl.length > 20

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey || !isUrlValid) {
  console.error('❌ Missing Supabase environment variables!')
  console.error('Please create a .env file in the project root with:')
  console.error('VITE_SUPABASE_URL=your_supabase_project_url')
  console.error('VITE_SUPABASE_ANON_KEY=your_supabase_anon_key')
  
  // Show an alert to the user only once
  if (typeof window !== 'undefined' && !sessionStorage.getItem('supabase-config-warning-shown')) {
    alert('❌ Configuration Error!\n\nSupabase credentials are missing. Please:\n1. Create a .env file in the project root\n2. Add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY\n\nCheck the console for details.')
    sessionStorage.setItem('supabase-config-warning-shown', 'true')
  }
} else {
  // Check if URL looks valid
  if (!supabaseUrl.includes('.supabase.co') && !supabaseUrl.includes('localhost')) {
    console.warn('⚠️ Supabase URL might be incorrect:', supabaseUrl)
  }
}

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

// Validate credentials before creating client - STRICT validation
const isValidCredentials = isUrlValid && 
                           supabaseAnonKey && 
                           typeof supabaseAnonKey === 'string' &&
                           supabaseAnonKey.trim() !== '' && 
                           supabaseAnonKey.length > 50 && // Anon keys are very long
                           (supabaseUrl.includes('.supabase.co') || supabaseUrl.includes('localhost'))

// Create Supabase client only if credentials are valid
// This prevents ERR_NAME_NOT_RESOLVED errors from empty/invalid URLs
let supabaseClient = null

if (isValidCredentials) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: getSessionStorage(),
        autoRefreshToken: false, // Disable to prevent background calls that might fail
        persistSession: false, // Disable to prevent session calls that might fail
    detectSessionInUrl: false,
    flowType: 'pkce'
      },
      // Add timeout to prevent hanging requests
      db: {
        schema: 'public'
      },
      global: {
        fetch: (url, options = {}) => {
          // Wrap fetch to catch all errors with proper timeout
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 5000)
          
          const fetchOptions = {
            ...options,
            signal: controller.signal
          }
          
          // Merge signal if already provided
          if (options.signal) {
            const originalSignal = options.signal
            originalSignal.addEventListener('abort', () => controller.abort())
          }
          
          return fetch(url, fetchOptions)
            .then(response => {
              clearTimeout(timeoutId)
              return response
            })
            .catch(err => {
              clearTimeout(timeoutId)
              // Transform ALL fetch errors
              const errMsg = err?.message || String(err) || ''
              if (err instanceof TypeError || 
                  errMsg.includes('fetch') || 
                  errMsg === 'Failed to fetch' ||
                  errMsg.includes('Failed to fetch') ||
                  errMsg.includes('ERR_NAME_NOT_RESOLVED') ||
                  errMsg.includes('NetworkError') ||
                  errMsg.includes('Network request failed') ||
                  err.name === 'AbortError') {
                throw new Error('❌ Connection Error: Cannot connect to Supabase. Check if your project is active at https://supabase.com/dashboard')
              }
              throw err
            })
        }
      }
    })
    console.log('✅ Supabase client initialized successfully')
    
    // Wrap all methods to intercept and transform "Failed to fetch" errors
    const originalAuth = supabaseClient.auth
    supabaseClient.auth = new Proxy(originalAuth, {
      get(target, prop) {
        const originalMethod = target[prop]
        if (typeof originalMethod === 'function') {
          return function(...args) {
            const result = originalMethod.apply(target, args)
            if (result && typeof result.then === 'function') {
              return result.catch(err => {
                const errMsg = err?.message || String(err) || ''
                if (errMsg.includes('Failed to fetch') || errMsg.includes('fetch') || err instanceof TypeError) {
                  return Promise.resolve({
                    data: null,
                    error: {
                      message: '❌ Connection Error: Cannot connect to Supabase. Your project may be PAUSED. Go to https://supabase.com/dashboard and restore your project. See TEST_SUPABASE_CONNECTION.md for details.',
                      code: 'CONNECTION_ERROR'
                    }
                  })
                }
                return Promise.reject(err)
              }).then(result => {
                if (result?.error?.message && (result.error.message.includes('Failed to fetch') || result.error.message === 'Failed to fetch')) {
                  result.error.message = '❌ Connection Error: Cannot connect to Supabase. Your project may be PAUSED. Go to https://supabase.com/dashboard and restore your project. See TEST_SUPABASE_CONNECTION.md for details.'
                  result.error.code = 'CONNECTION_ERROR'
                }
                return result
              })
            }
            return result
          }
        }
        return originalMethod
      }
    })
  } catch (error) {
    console.error('❌ Failed to create Supabase client:', error)
  }
} else {
  console.error('❌ Cannot create Supabase client: Invalid or missing credentials')
  console.error('   Expected VITE_SUPABASE_URL format: https://your-project.supabase.co')
  console.error('   Expected VITE_SUPABASE_ANON_KEY format: eyJhbGci... (long JWT token)')
}

// Create a proxy/wrapper that validates credentials before allowing operations
const createErrorResponse = (message) => ({ 
  data: null, 
  error: { 
    message, 
    code: 'CONFIG_ERROR',
    // Add common error indicators to help with detection
    details: 'Supabase is not configured',
    hint: 'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file'
  } 
})

const errorMsg = '❌ Configuration Error: Supabase credentials are missing! Please create a .env file in the project root with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Check SETUP_ENV.md for instructions.'

// Error transformation function - MUST catch "Failed to fetch"
const transformError = (error) => {
  if (!error) return null
  
  // Handle both error objects and strings
  let errMsg = ''
  if (typeof error === 'string') {
    errMsg = error.trim()
  } else if (error instanceof Error) {
    errMsg = (error.message || String(error) || '').trim()
  } else if (error && typeof error === 'object' && error.message) {
    errMsg = String(error.message).trim()
  } else {
    errMsg = String(error).trim()
  }
  
  // AGGRESSIVE check for "Failed to fetch" - check FIRST
  const failedToFetch = errMsg === 'Failed to fetch' || 
                        errMsg.includes('Failed to fetch') ||
                        errMsg.toLowerCase().includes('failed to fetch') ||
                        errMsg.includes('fetch') ||
                        errMsg.includes('NetworkError') ||
                        errMsg.includes('ERR_NAME_NOT_RESOLVED') ||
                        errMsg.includes('Network request failed') ||
                        (error instanceof TypeError)
  
  if (failedToFetch) {
    return {
      message: '❌ Connection Error: Cannot connect to Supabase. Your project may be PAUSED. Go to https://supabase.com/dashboard and restore your project. See TEST_SUPABASE_CONNECTION.md for details.',
      code: 'CONNECTION_ERROR'
    }
  }
  return error
}

// Wrap the entire supabase client to intercept errors
const wrapSupabaseClient = (client) => {
  if (!client) return client
  
  // Wrap the client's from() method
  const originalFrom = client.from.bind(client)
  client.from = function(table) {
    const query = originalFrom(table)
    
    // Wrap select methods
    const originalSelect = query.select.bind(query)
    query.select = function(columns) {
      const selectQuery = originalSelect(columns)
      
      // Wrap eq method
      const originalEq = selectQuery.eq?.bind(selectQuery)
      if (originalEq) {
        selectQuery.eq = function(column, value) {
          const eqQuery = originalEq(column, value)
          
          // Wrap single method
          const originalSingle = eqQuery.single?.bind(eqQuery)
          if (originalSingle) {
            eqQuery.single = function() {
              return originalSingle().then(result => {
                if (result?.error) {
                  result.error = transformError(result.error) || result.error
                }
                return result
              }).catch(err => {
                const transformed = transformError(err)
                if (transformed) {
                  return { data: null, error: transformed }
                }
                throw err
              })
            }
          }
          
          return eqQuery
        }
      }
      
      return selectQuery
    }
    
    // Wrap insert method
    const originalInsert = query.insert.bind(query)
    query.insert = function(values) {
      return originalInsert(values).then(result => {
        if (result?.error) {
          result.error = transformError(result.error) || result.error
        }
        return result
      }).catch(err => {
        const transformed = transformError(err)
        if (transformed) {
          return { data: null, error: transformed }
        }
        throw err
      })
    }
    
    return query
  }
  
  // Wrap auth methods
  const originalAuth = client.auth
  client.auth = new Proxy(originalAuth, {
    get(target, prop) {
      const originalMethod = target[prop]
      if (typeof originalMethod === 'function') {
        return function(...args) {
          const result = originalMethod.apply(target, args)
          if (result && typeof result.then === 'function') {
            return result.then(res => {
              // Transform error if present
              if (res && res.error) {
                const transformed = transformError(res.error)
                if (transformed && transformed.message) {
                  res.error = transformed
                }
                // Also check error.message directly
                if (res.error && res.error.message && (res.error.message === 'Failed to fetch' || res.error.message.includes('Failed to fetch'))) {
                  res.error = {
                    message: '❌ Connection Error: Cannot connect to Supabase. Your project may be PAUSED. Go to https://supabase.com/dashboard and restore your project. See TEST_SUPABASE_CONNECTION.md for details.',
                    code: 'CONNECTION_ERROR'
                  }
                }
              }
              return res
            }).catch(err => {
              const transformed = transformError(err)
              if (transformed && transformed.message) {
                return { data: null, error: transformed }
              }
              throw err
            })
          }
          return result
        }
      }
      return originalMethod
    }
  })
  
  return client
}

export const supabase = isValidCredentials && supabaseClient ? wrapSupabaseClient(supabaseClient) : (() => {
  return {
    auth: {
      signUp: () => Promise.resolve(createErrorResponse(errorMsg)),
      signIn: () => Promise.resolve(createErrorResponse(errorMsg)),
      signOut: () => Promise.resolve({ error: { message: errorMsg } }),
      getSession: () => Promise.resolve({ data: { session: null }, error: { message: errorMsg } }),
      getUser: () => Promise.resolve({ data: { user: null }, error: { message: errorMsg } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    from: (table) => {
      const wrapWithErrorTransform = (promise) => {
        if (promise && typeof promise.then === 'function') {
          return promise
            .then(result => {
              if (result?.error?.message && (result.error.message.includes('Failed to fetch') || result.error.message === 'Failed to fetch')) {
                result.error.message = '❌ Connection Error: Cannot connect to Supabase. Your project may be PAUSED. Go to https://supabase.com/dashboard and restore your project. See TEST_SUPABASE_CONNECTION.md for details.'
                result.error.code = 'CONNECTION_ERROR'
              }
              return result
            })
            .catch(err => {
              const errMsg = err?.message || String(err) || ''
              if (errMsg.includes('Failed to fetch') || errMsg.includes('fetch') || err instanceof TypeError) {
                return createErrorResponse('❌ Connection Error: Cannot connect to Supabase. Your project may be PAUSED. Go to https://supabase.com/dashboard and restore your project. See TEST_SUPABASE_CONNECTION.md for details.')
              }
              throw err
            })
        }
        return promise
      }
      
      const chainable = {
        select: (columns) => ({
          eq: (column, value) => ({
            single: () => wrapWithErrorTransform(Promise.resolve(createErrorResponse(errorMsg))),
            limit: (limit) => wrapWithErrorTransform(Promise.resolve({ data: [], error: { message: errorMsg, code: 'CONFIG_ERROR' } }))
          }),
          limit: (limit) => wrapWithErrorTransform(Promise.resolve({ data: [], error: { message: errorMsg, code: 'CONFIG_ERROR' } }))
        }),
        insert: (values) => wrapWithErrorTransform(Promise.resolve(createErrorResponse(errorMsg))),
        update: (values) => ({
          eq: (column, value) => wrapWithErrorTransform(Promise.resolve(createErrorResponse(errorMsg)))
        }),
        delete: () => ({
          eq: (column, value) => wrapWithErrorTransform(Promise.resolve(createErrorResponse(errorMsg)))
        })
      }
      return chainable
    },
    storage: {
      from: () => ({
        upload: () => Promise.resolve(createErrorResponse(errorMsg)),
        getPublicUrl: () => ({ publicUrl: '' })
      })
    }
  }
})()

