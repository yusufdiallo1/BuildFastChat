import { useNavigate, useLocation } from 'react-router-dom'

export function PageNavigation({ title }) {
  const navigate = useNavigate()
  const location = useLocation()

  const navigationItems = [
    { path: '/chat', label: 'Chats', icon: '💬' },
    { path: '/templates', label: 'Templates', icon: '⚡' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
    { path: '/blocked-users', label: 'Blocked', icon: '🚫' },
    { path: '/scheduled-messages', label: 'Scheduled', icon: '📅' },
  ]

  return (
    <div className="sticky top-0 z-10 frosted-glass border-b" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold gradient-text">{title}</h1>
          
          {/* Navigation Buttons */}
          <div className="flex items-center space-x-2">
            {navigationItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  location.pathname === item.path
                    ? 'frosted-glass'
                    : 'hover:bg-opacity-50'
                }`}
                style={{
                  backgroundColor: location.pathname === item.path ? 'var(--surface-light)' : 'transparent',
                  color: location.pathname === item.path ? 'var(--text-primary)' : 'var(--text-muted)'
                }}
                title={item.label}
              >
                <span className="mr-1">{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

