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
    <div className="min-h-screen bg-[#111827] flex flex-col">
      {/* Header */}
      <header className="bg-[#1f2937] border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex-shrink-0">
              <Link to="/" className="text-2xl font-bold text-white">BuildFast Chat</Link>
            </div>
            <nav className="flex space-x-4">
              <Link to="/" className="text-gray-300 hover:text-white transition-colors">Home</Link>
              <Link to="/login" className="text-blue-500 hover:text-blue-400 transition-colors">Log In</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Signup Form */}
      <div className="flex-1 flex items-center justify-center p-4">
      <div className="bg-[#1f2937] rounded-lg shadow-xl p-8 w-full max-w-md border border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-gray-400">Sign up to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition placeholder-gray-400 disabled:opacity-50"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition placeholder-gray-400 disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition placeholder-gray-400 disabled:opacity-50"
              placeholder="johndoe"
            />
            <p className="mt-1 text-xs text-gray-400">Must be unique</p>
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-300 mb-2">
              City
            </label>
            <select
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              disabled={loading}
              className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:opacity-50 appearance-none"
            >
              <option value="">Select a city</option>
              {cities.map((cityName) => (
                <option key={cityName} value={cityName}>
                  {cityName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="profile-picture" className="block text-sm font-medium text-gray-300 mb-2">
              Profile Picture (Optional)
            </label>
            {previewUrl && (
              <div className="mb-3 flex items-center">
                <img src={previewUrl} alt="Preview" className="w-16 h-16 rounded-full object-cover border-2 border-blue-500" />
                <button
                  type="button"
                  onClick={() => {
                    setProfilePicture(null)
                    setPreviewUrl(null)
                  }}
                  className="ml-3 text-red-400 hover:text-red-300 text-sm"
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
              className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition placeholder-gray-400 disabled:opacity-50 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            />
            <p className="mt-1 text-xs text-gray-400">Max 5MB, JPG, PNG, GIF, or WEBP</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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

        <div className="mt-6 text-center">
          <p className="text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-500 hover:text-blue-400 font-semibold">
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
