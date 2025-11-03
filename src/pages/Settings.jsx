import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import TwoFactorManagement from '../components/TwoFactorManagement'
import { PasswordChange, UsernameChange, ThemeToggle, ReadReceiptsToggle } from '../components/SettingsSections'
import { PageNavigation } from '../components/PageNavigation'
import OnboardingTutorial from '../components/OnboardingTutorial'

function Settings() {
  const { userProfile } = useAuth()
  const navigate = useNavigate()
  const [showTutorial, setShowTutorial] = useState(false)

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: 'var(--background)', color: 'var(--text-primary)' }}>
      {/* Navigation Bar */}
      <PageNavigation title="Settings" />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Account Settings */}
          <div>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Account Settings</h2>
            <PasswordChange />
            <UsernameChange />
          </div>

          {/* Appearance */}
          <div>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Appearance & Privacy</h2>
            <ThemeToggle />
            <ReadReceiptsToggle />
          </div>

          {/* Security Settings */}
          <div>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Security Settings</h2>
            <div className="frosted-glass rounded-lg p-6 border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <TwoFactorManagement />
            </div>
          </div>

          {/* Message Templates */}
          <div>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Message Templates</h2>
            <div className="frosted-glass rounded-lg p-6 border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Create and manage quick reply templates for faster messaging
              </p>
              <button
                onClick={() => navigate('/templates')}
                className="px-6 py-2 rounded-lg font-medium transition-colors"
                style={{ backgroundColor: 'var(--primary)', color: 'white' }}
              >
                Manage Templates →
              </button>
            </div>
          </div>

          {/* Help & Support */}
          <div>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Help & Support</h2>
            <div className="frosted-glass rounded-lg p-6 border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>App Tutorial</h3>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Learn how to use BuildFast Chat features</p>
                  </div>
                  <button
                    onClick={() => setShowTutorial(true)}
                    className="px-6 py-2 rounded-lg font-medium transition-all hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                      color: 'white',
                      boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                    }}
                  >
                    View Tutorial →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Video Settings */}
          <div>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Video Settings</h2>
            <div className="frosted-glass rounded-lg p-6 border space-y-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Auto-play videos</h3>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Automatically play videos when scrolled into view</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked={false}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 rounded-full peer bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Auto-compress videos</h3>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Automatically compress videos before uploading</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked={true}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 rounded-full peer bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Maximum upload size
                </label>
                <select
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--surface-light)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)'
                  }}
                  defaultValue="1500"
                >
                  <option value="50">50 MB</option>
                  <option value="100">100 MB</option>
                  <option value="200">200 MB</option>
                  <option value="500">500 MB</option>
                  <option value="550">550 MB</option>
                  <option value="1000">1000 MB</option>
                  <option value="1500">1500 MB</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Compression quality
                </label>
                <select
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--surface-light)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)'
                  }}
                  defaultValue="medium"
                >
                  <option value="low">Low (smaller file, lower quality)</option>
                  <option value="medium">Medium (balanced)</option>
                  <option value="high">High (larger file, better quality)</option>
                </select>
              </div>

              <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Videos: <span className="font-medium" style={{ color: 'var(--text-primary)' }}>0 MB</span> this month
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Onboarding Tutorial Modal */}
      {showTutorial && (
        <OnboardingTutorial
          onClose={() => setShowTutorial(false)}
          isReplay={true}
        />
      )}
    </div>
  )
}

export default Settings
