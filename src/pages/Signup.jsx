import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = useState('')
  const [city, setCity] = useState('')
  const [profilePicture, setProfilePicture] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [preflightStatus, setPreflightStatus] = useState(null)
  
  // WRAP useState to intercept ALL error sets - ABSOLUTE FINAL PROTECTION
  const [errorState, setErrorState] = useState('')
  const navigate = useNavigate()
  const { user } = useAuth()

  // SAFE setError wrapper - intercepts EVERY error and transforms "Failed to fetch"
  const safeSetError = (errorMsg) => {
    if (!errorMsg) {
      setErrorState('')
      return
    }
    
    const errorStr = String(errorMsg).toLowerCase()
    
    // IMMEDIATELY transform ANY instance of "Failed to fetch" - NO EXCEPTIONS
    if (errorStr.includes('failed to fetch') ||
        errorStr.includes('err_name_not_resolved') ||
        errorStr.includes('networkerror') ||
        errorStr.includes('network request failed') ||
        errorStr === 'failed to fetch') {
      setErrorState('❌ Connection Error: Cannot connect to Supabase. Check if your project is active at https://supabase.com/dashboard')
      return
    }
    
    setErrorState(errorMsg)
  }
  
  // Override error state - always use safe version
  const error = errorState
  const setError = safeSetError

  // List of major cities including ALL GCC cities, Muslim cities, and all US states, arranged alphabetically
  const cities = [
    'Abha',
    'Abqaiq',
    'Abu Dhabi',
    'Adelaide',
    'Ahmedabad',
    'Ajman',
    'Al Ain',
    'Al Hofuf',
    'Al Jubail',
    'Al Khobar',
    'Al Mubarraz',
    'Al Wakrah',
    'Albany',
    'Aleppo',
    'Alexandria',
    'Algiers',
    'Albuquerque',
    'Amarillo',
    'Amman',
    'Amsterdam',
    'Ankara',
    'Annapolis',
    'Athens',
    'Atlanta',
    'Austin',
    'Baghdad',
    'Baku',
    'Baltimore',
    'Bandar Seri Begawan',
    'Bandung',
    'Bangalore',
    'Bangkok',
    'Barcelona',
    'Baton Rouge',
    'Basra',
    'Belfast',
    'Beijing',
    'Beirut',
    'Belgrade',
    'Berlin',
    'Birmingham',
    'Bishkek',
    'Bismarck',
    'Bogotá',
    'Bologna',
    'Boise',
    'Boston',
    'Bradford',
    'Brasília',
    'Bremen',
    'Bristol',
    'Brussels',
    'Bucharest',
    'Budapest',
    'Buenos Aires',
    'Buraidah',
    'Busan',
    'Cairo',
    'Canberra',
    'Cape Town',
    'Caracas',
    'Carson City',
    'Casablanca',
    'Cebu',
    'Charleston',
    'Charlotte',
    'Chengdu',
    'Chennai',
    'Cheyenne',
    'Chicago',
    'Chittagong',
    'Cologne',
    'Colombo',
    'Columbus',
    'Concord',
    'Copenhagen',
    'Córdoba',
    'Dallas',
    'Dammam',
    'Daegu',
    'Dakar',
    'Damascus',
    'Dar es Salaam',
    'Davao',
    'Delhi',
    'Denver',
    'Des Moines',
    'Detroit',
    'Dhaka',
    'Doha',
    'Dover',
    'Dubai',
    'Dublin',
    'Düsseldorf',
    'Edinburgh',
    'Erbil',
    'Faisalabad',
    'Fargo',
    'Fez',
    'Fresno',
    'Frankfurt',
    'Fujairah',
    'Fukuoka',
    'Gaziantep',
    'Genoa',
    'Geneva',
    'Glasgow',
    'Graz',
    'Guangzhou',
    'Guatemala City',
    'Gurgaon',
    'Hamburg',
    'Hamilton',
    'Hanoi',
    'Harrisburg',
    'Hartford',
    'Havana',
    'Helena',
    'Helsinki',
    'Herat',
    'Ho Chi Minh City',
    'Hong Kong',
    'Honolulu',
    'Houston',
    'Hyderabad',
    'Ibadan',
    'Indianapolis',
    'Innsbruck',
    'Irbid',
    'Islamabad',
    'Istanbul',
    'Izmir',
    'Jackson',
    'Jacksonville',
    'Jakarta',
    'Jeddah',
    'Jefferson City',
    'Jerusalem',
    'Johannesburg',
    'Jubail',
    'Juneau',
    'Kabul',
    'Kano',
    'Karachi',
    'Karbala',
    'Kathmandu',
    'Kenitra',
    'Khartoum',
    'Khobar',
    'Khor Fakkan',
    'Kiev',
    'Kingston',
    'Kinshasa',
    'Kobe',
    'Kolkata',
    'Krakow',
    'Kuala Lumpur',
    'Kuwait City',
    'Kyoto',
    'Lagos',
    'Lahore',
    'Laghouat',
    'Lansing',
    'Las Vegas',
    'Lausanne',
    'Leeds',
    'Lexington',
    'Lincoln',
    'Lima',
    'Lisbon',
    'Little Rock',
    'Liverpool',
    'London',
    'Los Angeles',
    'Luanda',
    'Luxembourg City',
    'Lyon',
    'Macau',
    'Madinah (Medina)',
    'Madison',
    'Madrid',
    'Makassar',
    'Malmo',
    'Manchester',
    'Manama',
    'Manila',
    'Marseille',
    'Mashhad',
    'Mecca',
    'Medan',
    'Medina',
    'Melbourne',
    'Mexico City',
    'Miami',
    'Milan',
    'Milwaukee',
    'Minneapolis',
    'Mogadishu',
    'Montgomery',
    'Montpellier',
    'Montreal',
    'Montpelier',
    'Moroni',
    'Moscow',
    'Mumbai',
    'Munich',
    'Muscat',
    'Nagoya',
    'Nairobi',
    'Naples',
    'Nashville',
    'New Delhi',
    'New York',
    'Nice',
    'Nizwa',
    'Norfolk',
    'Oakland',
    'Oklahoma City',
    'Omaha',
    'Orlando',
    'Osaka',
    'Oslo',
    'Ottawa',
    'Palembang',
    'Palermo',
    'Paris',
    'Paterson',
    'Penang',
    'Perth',
    'Philadelphia',
    'Phoenix',
    'Portland',
    'Port-au-Prince',
    'Porto',
    'Prague',
    'Pretoria',
    'Providence',
    'Pune',
    'Pyongyang',
    'Qatif',
    'Quebec City',
    'Rabat',
    'Raleigh',
    'Rawalpindi',
    'Ras Al Khaimah',
    'Riyadh',
    'Richmond',
    'Rome',
    'Rotterdam',
    'Sacramento',
    'Salalah',
    'Salt Lake City',
    'Sanaa',
    'San Antonio',
    'San Diego',
    'San Francisco',
    'San Jose',
    'Santa Fe',
    'Santiago',
    'São Paulo',
    'Sarajevo',
    'Seattle',
    'Seoul',
    'Shanghai',
    'Sharjah',
    'Sheffield',
    'Shenzhen',
    'Singapore',
    'Sohar',
    'Springfield',
    'St. Paul',
    'Stockholm',
    'Stuttgart',
    'Sur',
    'Surat',
    'Sydney',
    'Syracuse',
    'Tabriz',
    'Tabuk',
    'Taipei',
    'Taif',
    'Tallahassee',
    'Tehran',
    'Tel Aviv',
    'Tianjin',
    'Tokyo',
    'Topeka',
    'Toronto',
    'Toulouse',
    'Trenton',
    'Tunis',
    'Turin',
    'Umm Al Quwain',
    'Utrecht',
    'Vancouver',
    'Venice',
    'Vienna',
    'Washington DC',
    'Warsaw',
    'Wellington',
    'Westminster',
    'Wuhan',
    'Yaoundé',
    'Yanbu',
    'Yokohama',
    'Zagreb',
    'Zürich'
  ]

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/chat', { replace: true })
    }
  }, [user, navigate])
  
  // Global error handler for unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      const err = event.reason
      const errorStr = String(err?.message || err || '').toLowerCase()
      
      if (errorStr.includes('failed to fetch') ||
          errorStr.includes('err_name_not_resolved') ||
          errorStr.includes('networkerror')) {
        event.preventDefault() // Prevent console error
        safeSetError('❌ Connection Error: Cannot connect to Supabase. Check if your project is active at https://supabase.com/dashboard')
        setLoading(false)
      }
    }
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection)
  }, [])
  
  // Optional debug: run a quick preflight on mount when ?debug=1 is present
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const debug = params.get('debug') === '1'
      if (!debug) return
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
      if (!supabaseUrl || !supabaseAnonKey) {
        setPreflightStatus('config-missing')
        return
      }
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2000)
      fetch(`${supabaseUrl}/rest/v1/`, { method: 'HEAD', headers: { apikey: supabaseAnonKey }, signal: controller.signal })
        .then(r => {
          clearTimeout(timeoutId)
          setPreflightStatus(`ok:${r.status}`)
        })
        .catch(err => {
          clearTimeout(timeoutId)
          setPreflightStatus(`err:${String(err?.message || err)}`)
        })
    } catch {}
  }, [])

  // Block form submission if Supabase client is invalid
  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
    if (!supabaseUrl || !supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
      safeSetError('❌ Configuration Error: Invalid Supabase URL. Please check your .env file.')
    }
  }, [])
  
  // Extra protection - transform error if it somehow bypassed safeSetError
  useEffect(() => {
    if (errorState && errorState !== '' && typeof errorState === 'string') {
      const errorStr = errorState.toLowerCase()
      if (errorStr.includes('failed to fetch') || 
          errorStr.includes('err_name_not_resolved') || 
          errorStr.includes('networkerror')) {
        // Transform immediately
        setErrorState('❌ Connection Error: Cannot connect to Supabase. Check if your project is active at https://supabase.com/dashboard')
      }
    }
  }, [errorState])

  // Handle profile picture selection
  const handlePictureChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        safeSetError('Please select an image file')
        return
      }
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        safeSetError('Image size must be less than 5MB')
        return
      }
      setProfilePicture(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // Helper function to transform ANY error to user-friendly message
  const transformAnyError = (error) => {
    if (!error) return null
    
    // Check multiple possible error formats
    const errorStr = String(error).toLowerCase()
    const errorMsg = (error?.message || String(error) || '').toLowerCase()
    const errorString = String(error).toLowerCase()
    
    const checks = [
      errorStr,
      errorMsg,
      errorString,
      (error?.error?.message || '').toLowerCase(),
      (error?.details || '').toLowerCase(),
      (error?.hint || '').toLowerCase()
    ]
    
    for (const check of checks) {
      if (check.includes('failed to fetch') ||
          check.includes('err_name_not_resolved') ||
          check.includes('networkerror') ||
          check.includes('network request failed') ||
          check === 'failed to fetch' ||
          check.trim() === 'failed to fetch') {
        return '❌ Connection Error: Cannot connect to Supabase. Check if your project is active at https://supabase.com/dashboard'
      }
    }
    
    return null
  }

  // ABSOLUTE ERROR INTERCEPTOR - transforms ANY error containing "Failed to fetch"
  const interceptError = (err) => {
    if (!err) return '❌ Connection Error: Cannot connect to Supabase. Check if your project is active at https://supabase.com/dashboard'
    
    const errStr = String(err?.message || err || '').toLowerCase()
    if (errStr.includes('failed to fetch') || errStr.includes('err_name_not_resolved') || errStr.includes('networkerror')) {
      return '❌ Connection Error: Cannot connect to Supabase. Check if your project is active at https://supabase.com/dashboard'
    }
    return String(err?.message || err || 'An error occurred')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    safeSetError('')
    setLoading(true)

    // Validate Supabase environment and reachability before any DB calls
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

      if (!supabaseUrl || !supabaseAnonKey || !supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
        safeSetError('❌ Configuration Error: Supabase credentials are missing or invalid. Please check your .env and deployment settings.')
        setLoading(false)
        return
      }

      // Lightweight pre-flight connectivity test (3s timeout)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      try {
        const resp = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'HEAD',
          headers: { apikey: supabaseAnonKey },
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        // Any response (even 401/404) means the host is reachable; only network errors/timeout should block
      } catch (preflightErr) {
        clearTimeout(timeoutId)
        safeSetError('❌ Connection Error: Cannot connect to Supabase. Your project may be paused or the URL is incorrect. Restore the project in the dashboard and verify env variables.')
        setLoading(false)
        return
      }
    } catch (envErr) {
      safeSetError(interceptError(envErr))
      setLoading(false)
      return
    }

    // Validate inputs first
    if (!username?.trim()) {
      safeSetError('Username is required')
      setLoading(false)
      return
    }
    if (!city?.trim()) {
      safeSetError('City is required')
      setLoading(false)
      return
    }

    try {
      // Check username availability
      try {
        const usernameCheck = await supabase
          .from('user_profiles')
          .select('username')
          .eq('username', username.trim())
          .single()

        if (usernameCheck.error && usernameCheck.error.code !== 'PGRST116') {
          safeSetError(interceptError(usernameCheck.error))
          setLoading(false)
          return
        }

        if (usernameCheck.data) {
          safeSetError('This username is already taken. Please choose another.')
          setLoading(false)
          return
        }
      } catch (checkErr) {
        safeSetError(interceptError(checkErr))
        setLoading(false)
        return
      }

      // Sign up user
      try {
        const signupResult = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            // Ensure the confirmation link returns to this app's origin (must be allowlisted in Supabase Auth settings)
            emailRedirectTo: `${window.location.origin}/login`
          }
        })

        if (signupResult.error) {
          const errorMsg = String(signupResult.error.message || '').toLowerCase()
          if (errorMsg.includes('already registered')) {
            safeSetError('This email is already registered. Please try logging in.')
          } else if (errorMsg.includes('password')) {
            safeSetError('Password must be at least 6 characters long.')
          } else {
            safeSetError(interceptError(signupResult.error))
          }
          setLoading(false)
          return
        }

        if (!signupResult.data?.user) {
          safeSetError('Failed to create account. Please try again.')
          setLoading(false)
          return
        }

        // If email confirmation is enabled, session will be null. Avoid profile creation until after confirmation/login.
        if (!signupResult.data?.session) {
          safeSetError('We\'ve sent a verification email. Please confirm your email, then log in to complete setup.')
          setLoading(false)
          return
        }

        const userId = signupResult.data.user.id
        let profilePictureUrl = ''

        // Upload profile picture if provided
        if (profilePicture) {
          try {
            const fileExt = profilePicture.name.split('.').pop()
            const fileName = `${userId}-${Date.now()}.${fileExt}`
            const filePath = `${userId}/${fileName}`

            const uploadResult = await supabase.storage
              .from('avatars')
              .upload(filePath, profilePicture)

            if (!uploadResult.error) {
              const urlResult = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)
              profilePictureUrl = urlResult.data.publicUrl
            }
          } catch (uploadErr) {
            // Continue even if upload fails
            console.error('Upload error:', uploadErr)
          }
        }

        // Create user profile
        try {
          const profileResult = await supabase
            .from('user_profiles')
            .insert({
              id: userId,
              email: signupResult.data.user.email,
              username: username.trim(),
              city: city.trim(),
              full_name: '',
              profile_picture: profilePictureUrl,
              is_online: true
            })

          if (profileResult.error) {
            safeSetError('Account created but profile failed to initialize. Please contact support.')
            setLoading(false)
            return
          }

          // Success!
          navigate('/chat')
        } catch (profileErr) {
          safeSetError(interceptError(profileErr))
          setLoading(false)
        }
      } catch (signupErr) {
        safeSetError(interceptError(signupErr))
        setLoading(false)
      }
    } catch (err) {
      safeSetError(interceptError(err))
      setLoading(false)
    }
  }

  // Don't render if already logged in
  if (user) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ backgroundColor: 'var(--background)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <header className="frosted-glass border-b transition-colors duration-300" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex-shrink-0">
              <Link to="/" className="text-3xl font-bold gradient-text">BuildFast Chat</Link>
            </div>
            <nav className="flex space-x-6">
              <Link to="/" className="px-3 py-2 rounded-lg transition-colors" style={{ color: 'var(--text-secondary)' }} onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}>Home</Link>
              <Link to="/login" className="frosted-glass btn-rounded px-6 py-2 font-medium hover-lift transition-all duration-200" style={{ color: 'var(--text-primary)' }}>Log In</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Signup Form */}
      <div className="flex-1 flex items-center justify-center p-4">
      <div className="frosted-glass rounded-2xl shadow-2xl p-10 w-full max-w-md border transition-colors duration-300" style={{ borderColor: 'var(--border)' }}>
        {(() => {
          const params = new URLSearchParams(window.location.search)
          if (params.get('debug') === '1') {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
            return (
              <div className="mb-6 text-xs p-3 rounded-lg" style={{ backgroundColor: 'var(--surface-light)', border: '1px solid var(--border)' }}>
                <div>debug: url={supabaseUrl || 'n/a'}</div>
                <div>preflight={preflightStatus || 'pending'}</div>
              </div>
            )
          }
          return null
        })()}
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-6 frosted-glass btn-rounded flex items-center justify-center">
            <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Create Account</h1>
          <p className="text-lg" style={{ color: 'var(--text-muted)' }}>Sign up to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="frosted-glass rounded-xl p-4 border border-red-500/30 text-red-200 text-sm">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {(() => {
  // ABSOLUTE FINAL RENDER CHECK - NEVER show "Failed to fetch"
  let displayError = String(error || '')
  const lower = displayError.toLowerCase()

  if (lower.includes('failed to fetch') ||
      lower.includes('err_name_not_resolved') ||
      lower.includes('networkerror') ||
      lower === 'failed to fetch') {
    displayError = '❌ Connection Error: Cannot connect to Supabase. Check if your project is active at https://supabase.com/dashboard'
  }

  return displayError
})()}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full px-5 py-4 frosted-glass btn-rounded focus-ring disabled:opacity-50 transition-colors duration-300"
              style={{ color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-3">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full px-5 py-4 frosted-glass btn-rounded text-white placeholder-slate-400 focus-ring disabled:opacity-50 pr-12"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-200"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M9.88 9.88A3 3 0 0112 9c1.657 0 3 1.343 3 3 0 .74-.267 1.417-.712 1.94M6.343 6.343C4.78 7.53 3.5 9.11 2.458 11.003a1.043 1.043 0 000 .994C4.55 16.117 8.013 18 12 18c1.57 0 3.06-.287 4.414-.81M15 15a3 3 0 01-3 3" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12.003C3.732 8.943 7.523 6 12 6c4.477 0 8.268 2.943 9.542 6.003a1.043 1.043 0 010 .994C20.268 16.057 16.477 19 12 19c-4.477 0-8.268-2.943-9.542-6.003a1.043 1.043 0 010-.994z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-3">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              className="w-full px-5 py-4 frosted-glass btn-rounded text-white placeholder-slate-400 focus-ring disabled:opacity-50"
              placeholder="johndoe"
            />
            <p className="mt-2 text-xs text-slate-400">Must be unique</p>
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium text-slate-300 mb-3">
              City
            </label>
            <select
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              disabled={loading}
              className="w-full px-5 py-4 frosted-glass btn-rounded text-white focus-ring disabled:opacity-50 appearance-none"
            >
              <option value="">Select a city</option>
              {cities.map((cityName, index) => (
                <option key={`${cityName}-${index}`} value={cityName} className="bg-slate-800">
                  {cityName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="profile-picture" className="block text-sm font-medium text-slate-300 mb-3">
              Profile Picture (Optional)
            </label>
            {previewUrl && (
              <div className="mb-4 flex items-center">
                <img src={previewUrl} alt="Preview" className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500" />
                <button
                  type="button"
                  onClick={() => {
                    setProfilePicture(null)
                    setPreviewUrl(null)
                  }}
                  className="ml-4 frosted-glass btn-rounded text-red-300 px-4 py-2 text-sm font-medium hover-lift transition-all duration-200 hover:text-red-200"
                >
                  Remove
                </button>
              </div>
            )}
            <input
              id="profile-picture"
              type="file"
              accept="image/*"
              onChange={handlePictureChange}
              disabled={loading}
              className="w-full px-5 py-4 frosted-glass btn-rounded text-white focus-ring disabled:opacity-50 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
            />
            <p className="mt-2 text-xs text-slate-400">Max 5MB, JPG, PNG, GIF, or WEBP</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full frosted-glass btn-rounded-lg btn-glow text-white py-4 text-lg font-semibold focus-ring disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center hover-lift transition-all duration-200"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Account...
              </>
            ) : (
              'Sign Up'
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-slate-400 text-lg">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold hover-lift transition-all duration-200">
              Log in
            </Link>
          </p>
        </div>
      </div>
      </div>
    </div>
  )
}

export default Signup
