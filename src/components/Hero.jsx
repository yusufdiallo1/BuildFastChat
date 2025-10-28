function Hero() {
  return (
    <section className="bg-white py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Welcome to <span className="text-blue-600">BuildFast Chat</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          A modern chat application built with React, Vite, and Tailwind CSS.
        </p>
        <div className="flex justify-center space-x-4">
          <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
            Get Started
          </button>
          <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-medium border-2 border-gray-300 hover:border-blue-600 transition-colors">
            Learn More
          </button>
        </div>
      </div>
    </section>
  )
}

export default Hero


