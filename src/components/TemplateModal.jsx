import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function TemplateModal({ isOpen, onClose, template, onSave, userId }) {
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('Custom')
  const [icon, setIcon] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      if (template) {
        setName(template.name || '')
        setContent(template.content || '')
        setCategory(template.category || 'Custom')
        setIcon(template.icon || '')
      } else {
        setName('')
        setContent('')
        setCategory('Custom')
        setIcon('')
      }
      setError('')
    }
  }, [isOpen, template])

  const validateTemplate = async () => {
    if (!name.trim()) {
      setError('Template name is required')
      return false
    }
    if (name.length > 50) {
      setError('Template name must be 50 characters or less')
      return false
    }
    if (!content.trim()) {
      setError('Message text is required')
      return false
    }
    if (content.length > 500) {
      setError('Message text must be 500 characters or less')
      return false
    }

    // Check for duplicate name
    const { data, error } = await supabase
      .from('message_templates')
      .select('id')
      .eq('user_id', userId)
      .eq('name', name.trim())
      .is('deleted_at', null)
      .neq('id', template?.id || '00000000-0000-0000-0000-000000000000')

    if (error && error.code !== 'PGRST116') {
      setError('Error checking template name')
      return false
    }

    if (data && data.length > 0) {
      setError('A template with this name already exists')
      return false
    }

    return true
  }

  const handleSave = async () => {
    if (!userId) return

    const isValid = await validateTemplate()
    if (!isValid) return

    setLoading(true)
    setError('')

    try {
      const templateData = {
        user_id: userId,
        name: name.trim(),
        content: content.trim(),
        category: category,
        icon: icon || null,
        updated_at: new Date().toISOString()
      }

      if (template) {
        // Update existing template
        const { error: updateError } = await supabase
          .from('message_templates')
          .update(templateData)
          .eq('id', template.id)

        if (updateError) throw updateError
      } else {
        // Create new template
        const { error: createError } = await supabase
          .from('message_templates')
          .insert(templateData)

        if (createError) throw createError
      }

      onSave?.()
      onClose()
    } catch (err) {
      console.error('Error saving template:', err)
      setError(err.message || 'Failed to save template')
    } finally {
      setLoading(false)
    }
  }

  const commonEmojis = ['⚡', '💬', '👋', '📝', '✅', '👍', '🎉', '🚀', '⏰', '📍']

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/50" onClick={onClose}>
      <div
        className="frosted-glass rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {template ? 'Edit Template' : 'Create New Template'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Template Name */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Template Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              className="w-full px-4 py-2 rounded-lg border transition-colors"
              style={{
                backgroundColor: 'var(--surface-light)',
                borderColor: error && !name.trim() ? '#ef4444' : 'var(--border)',
                color: 'var(--text-primary)'
              }}
              placeholder="e.g., Quick Thanks"
              autoFocus
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {name.length}/50 characters
              </span>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border transition-colors"
              style={{
                backgroundColor: 'var(--surface-light)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="Personal">Personal</option>
              <option value="Work">Work</option>
              <option value="Common">Common</option>
              <option value="Custom">Custom</option>
            </select>
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Icon (Optional)
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                maxLength={2}
                className="w-16 px-4 py-2 rounded-lg border text-center text-xl transition-colors"
                style={{
                  backgroundColor: 'var(--surface-light)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)'
                }}
                placeholder="⚡"
              />
              <div className="flex flex-wrap gap-2">
                {commonEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setIcon(icon === emoji ? '' : emoji)}
                    className={`w-10 h-10 rounded-lg text-xl transition-all ${
                      icon === emoji ? 'ring-2 ring-indigo-500' : ''
                    }`}
                    style={{
                      backgroundColor: icon === emoji ? 'var(--surface-light)' : 'var(--surface)',
                      border: `1px solid ${icon === emoji ? 'var(--primary)' : 'var(--border)'}`
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Message Text */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Message Text <span className="text-red-400">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={500}
              rows={6}
              className="w-full px-4 py-2 rounded-lg border transition-colors resize-none"
              style={{
                backgroundColor: 'var(--surface-light)',
                borderColor: error && !content.trim() ? '#ef4444' : 'var(--border)',
                color: 'var(--text-primary)'
              }}
              placeholder="Enter your message template here..."
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {content.length}/500 characters
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Variables: {'{name}'}, {'{time}'}, {'{date}'}
              </span>
            </div>
          </div>

          {/* Preview */}
          {content && (
            <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--surface-light)', borderColor: 'var(--border)' }}>
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Preview:</p>
              <p style={{ color: 'var(--text-primary)' }}>{content}</p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--surface-light)', color: 'var(--text-primary)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !name.trim() || !content.trim()}
              className="px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--primary)', color: 'white' }}
            >
              {loading ? 'Saving...' : template ? 'Save Changes' : 'Save Template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TemplateModal

