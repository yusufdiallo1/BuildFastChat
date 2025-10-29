import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [city, setCity] = useState('')
  const [profilePicture, setProfilePicture] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { user } = useAuth()

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
    'Birmingham',
    'Bishkek',
    'Bismarck',
    'Bogotá',
    'Bologna',
    'Boise',
    'Bologna',
    'Boston',
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
    'Hyderabad',
    'Ibadan',
    'Indianapolis',
    'Innsbruck',
    'Irbid',
    'Islamabad',
    'Istanbul',
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

  // Handle profile picture selection
  const handlePictureChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB')
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validate required fields
      if (!username || username.trim() === '') {
        setError('Username is required')
        setLoading(false)
        return
      }
      if (!city || city.trim() === '') {
        setError('City is required')
        setLoading(false)
        return
      }

      // Check if username is already taken
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('username', username.trim())
        .single()

      if (existingUser) {
        setError('This username is already taken. Please choose another.')
        setLoading(false)
        return
      }

      // Sign up the user
      const { data, error: supabaseError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (supabaseError) {
        // Handle specific error cases
        if (supabaseError.message.includes('already registered')) {
          setError('This email is already registered. Please try logging in.')
        } else if (supabaseError.message.includes('Password')) {
          setError('Password must be at least 6 characters long.')
        } else {
          setError(supabaseError.message)
        }
        setLoading(false)
        return
      }

      if (data.user) {
        let profilePictureUrl = ''

        // Upload profile picture if one was selected
        if (profilePicture) {
          const fileExt = profilePicture.name.split('.').pop()
          const fileName = `${data.user.id}-${Math.random()}.${fileExt}`
          const filePath = `${data.user.id}/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, profilePicture)

          if (uploadError) {
            console.error('Error uploading profile picture:', uploadError)
            setError('Account created but failed to upload profile picture.')
          } else {
            // Get public URL
            const { data: urlData } = supabase.storage
              .from('avatars')
              .getPublicUrl(filePath)
            profilePictureUrl = urlData.publicUrl
          }
        }

        // Insert user profile into user_profiles table
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            email: data.user.email,
            username: username.trim(),
            city: city.trim(),
            full_name: '',
            profile_picture: profilePictureUrl,
            is_online: true
          })

        if (profileError) {
          console.error('Error creating user profile:', profileError)
          setError('Account created but profile failed to initialize. Please contact support.')
          setLoading(false)
          return
        }

        // Success! Navigate to chat page
        navigate('/chat')
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
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
                {error}
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
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full px-5 py-4 frosted-glass btn-rounded text-white placeholder-slate-400 focus-ring disabled:opacity-50"
              placeholder="••••••••"
            />
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
              {cities.map((cityName) => (
                <option key={cityName} value={cityName} className="bg-slate-800">
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
            className="w-full frosted-glass btn-rounded-lg text-white py-4 text-lg font-semibold focus-ring disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center hover-lift transition-all duration-200"
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
