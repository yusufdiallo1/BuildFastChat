import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function Home() {
  const { user } = useAuth()

  const features = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: "Fast Development",
      description: "Built with Vite for lightning-fast hot module replacement and build times."
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      title: "Modern UI",
      description: "Styled with Tailwind CSS for a beautiful and responsive user interface."
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: "Type Safe",
      description: "Built with React for a robust and maintainable codebase."
    }
  ]

  return (
    <div className="min-h-screen bg-[#111827]">
      {/* Header */}
      <header className="bg-[#1f2937] border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex-shrink-0">
              <Link to="/" className="text-2xl font-bold text-white">BuildFast Chat</Link>
            </div>
            <nav className="flex space-x-4">
              <Link to="/" className="text-gray-300 hover:text-white transition-colors">Home</Link>
              <Link to="/chat" className="text-gray-300 hover:text-white transition-colors">Chat</Link>
              {user ? (
                <Link 
                  to="/chat" 
                  className="text-blue-500 hover:text-blue-400 transition-colors"
                >
                  Go to Chat
                </Link>
              ) : (
                <Link to="/login" className="text-blue-500 hover:text-blue-400 transition-colors">Log In</Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Welcome to <span className="text-blue-500">BuildFast Chat</span>
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            A modern chat application built with React, Vite, and Tailwind CSS.
          </p>
          
          {user ? (
            <div className="flex justify-center space-x-4">
              <Link 
                to="/chat" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
              >
                Go to Chat
              </Link>
            </div>
          ) : (
            <div className="flex justify-center space-x-4">
              <Link 
                to="/login" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
              >
                Get Started
              </Link>
              <Link 
                to="/signup" 
                className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-medium transition-colors border border-gray-600"
              >
                Learn More
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-[#1f2937] rounded-lg p-6 hover:bg-[#293548] transition-colors">
              <div className="bg-blue-600/10 rounded-lg w-16 h-16 flex items-center justify-center mb-4 text-blue-500">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default Home


