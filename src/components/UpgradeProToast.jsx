import { useEffect, useState } from 'react'

function UpgradeProToast() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem('upgrade_pro_dismissed')
    if (dismissed !== 'true') {
      const t = setTimeout(() => setVisible(true), 1200)
      return () => clearTimeout(t)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed bottom-6 right-6 z-40"
      role="dialog"
      aria-label="Upgrade to Pro"
    >
      <div
        className="frosted-glass rounded-2xl p-4 shadow-2xl border backdrop-blur-md"
        style={{
          borderColor: 'var(--border)',
          backgroundColor: 'var(--surface)',
          boxShadow: '0 0 24px rgba(99, 102, 241, 0.35)'
        }}
      >
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'radial-gradient(closest-side, rgba(99, 102, 241, 0.35), rgba(236,72,153,0.2))',
              boxShadow: '0 0 30px rgba(99,102,241,0.5)'
            }}
          >
            <svg className="w-6 h-6 text-indigo-300" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 4a2 2 0 00-2 2v3H4a1 1 0 00-.894 1.447l8 14a1 1 0 001.788 0l8-14A1 1 0 0020 9h-2V6a2 2 0 00-2-2H8z"/>
            </svg>
          </div>
          <div className="flex-1">
            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>Upgrade to Pro</div>
            <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Unlock high-quality uploads, message history, and priority support.
            </div>
            <div className="mt-3 flex space-x-2">
              <a
                href="#/upgrade"
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: 'var(--primary)', color: 'white' }}
              >
                Upgrade now
              </a>
              <button
                onClick={() => {
                  localStorage.setItem('upgrade_pro_dismissed', 'true')
                  setVisible(false)
                }}
                className="px-3 py-2 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--surface-light)', color: 'var(--text-primary)' }}
              >
                Not now
              </button>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.setItem('upgrade_pro_dismissed', 'true')
              setVisible(false)
            }}
            className="text-gray-400 hover:text-white"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default UpgradeProToast
