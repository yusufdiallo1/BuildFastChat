function Header() {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-gray-900">BuildFast Chat</h1>
          </div>
          <nav className="hidden md:flex space-x-8">
            <a href="#" className="text-gray-700 hover:text-blue-600 transition-colors">Home</a>
            <a href="#" className="text-gray-700 hover:text-blue-600 transition-colors">Chat</a>
            <a href="#" className="text-gray-700 hover:text-blue-600 transition-colors">About</a>
          </nav>
        </div>
      </div>
    </header>
  )
}

export default Header


