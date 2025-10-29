import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { PageNavigation } from '../components/PageNavigation'
import TemplateModal from '../components/TemplateModal'

function MessageTemplates() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState('Recently Used')
  const [showModal, setShowModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [selectedTemplates, setSelectedTemplates] = useState(new Set())
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'

  useEffect(() => {
    if (user) {
      fetchTemplates()
      createDefaultTemplates()
    }
  }, [user])

  const createDefaultTemplates = async () => {
    if (!user) return

    // Check if user already has templates
    const { count } = await supabase
      .from('message_templates')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('deleted_at', null)

    if (count > 0) return // User already has templates

    const defaultTemplates = [
      { name: 'Thanks!', content: 'Thank you!', category: 'Common', icon: '🙏' },
      { name: 'On my way', content: "I'm on my way, be there soon!", category: 'Common', icon: '🚶' },
      { name: 'In a meeting', content: "I'm in a meeting, will reply later", category: 'Work', icon: '📅' },
      { name: 'Sounds good', content: 'Sounds good to me!', category: 'Common', icon: '👍' },
      { name: 'Talk soon', content: 'Talk to you soon!', category: 'Personal', icon: '💬' },
      { name: 'Running late', content: 'Sorry, running a bit late', category: 'Common', icon: '⏰' },
    ]

    try {
      const templatesToInsert = defaultTemplates.map(t => ({
        ...t,
        user_id: user.id
      }))

      await supabase
        .from('message_templates')
        .insert(templatesToInsert)
    } catch (error) {
      console.error('Error creating default templates:', error)
    }
  }

  const fetchTemplates = async () => {
    if (!user) return

    try {
      setLoading(true)
      let query = supabase
        .from('message_templates')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)

      // Apply sorting
      switch (sortBy) {
        case 'Alphabetical':
          query = query.order('name', { ascending: true })
          break
        case 'Most Used':
          query = query.order('usage_count', { ascending: false })
          break
        case 'Recently Created':
          query = query.order('created_at', { ascending: false })
          break
        case 'Recently Used':
          query = query.order('last_used_at', { ascending: false, nullsFirst: false })
          break
        default:
          query = query.order('pinned', { ascending: false })
            .order('pinned_order', { ascending: true })
            .order('name', { ascending: true })
      }

      const { data, error } = await query

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = searchQuery === '' ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleDelete = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template? This action cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('message_templates')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', templateId)

      if (error) throw error
      fetchTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
      alert('Failed to delete template')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedTemplates.size === 0) return
    if (!window.confirm(`Delete ${selectedTemplates.size} template(s)? This action cannot be undone.`)) return

    try {
      const { error } = await supabase
        .from('message_templates')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', Array.from(selectedTemplates))

      if (error) throw error
      setSelectedTemplates(new Set())
      fetchTemplates()
    } catch (error) {
      console.error('Error bulk deleting templates:', error)
      alert('Failed to delete templates')
    }
  }

  const handlePin = async (template) => {
    try {
      // Get current pinned count
      const { count } = await supabase
        .from('message_templates')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('pinned', true)
        .is('deleted_at', null)

      if (!template.pinned && count >= 5) {
        alert('You can only pin up to 5 templates')
        return
      }

      const { error } = await supabase
        .from('message_templates')
        .update({
          pinned: !template.pinned,
          pinned_order: !template.pinned ? (count || 0) + 1 : null
        })
        .eq('id', template.id)

      if (error) throw error
      fetchTemplates()
    } catch (error) {
      console.error('Error pinning template:', error)
    }
  }

  const handleDuplicate = async (template) => {
    try {
      const { error } = await supabase
        .from('message_templates')
        .insert({
          user_id: user.id,
          name: `${template.name} (Copy)`,
          content: template.content,
          category: template.category,
          icon: template.icon
        })

      if (error) throw error
      fetchTemplates()
    } catch (error) {
      console.error('Error duplicating template:', error)
    }
  }

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Personal': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'Work': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'Common': return 'bg-green-500/20 text-green-400 border-green-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const handleExport = () => {
    const dataStr = JSON.stringify(templates, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'message_templates.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: 'var(--background)', color: 'var(--text-primary)' }}>
        <PageNavigation title="Message Templates" />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--primary)' }}></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: 'var(--background)', color: 'var(--text-primary)' }}>
      <PageNavigation title="Message Templates" />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header with Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4 flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="flex-1 px-4 py-2 rounded-lg border"
              style={{
                backgroundColor: 'var(--surface-light)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)'
              }}
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 rounded-lg border"
              style={{
                backgroundColor: 'var(--surface-light)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="All">All Categories</option>
              <option value="Personal">Personal</option>
              <option value="Work">Work</option>
              <option value="Common">Common</option>
              <option value="Custom">Custom</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 rounded-lg border"
              style={{
                backgroundColor: 'var(--surface-light)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="Recently Used">Recently Used</option>
              <option value="Alphabetical">Alphabetical</option>
              <option value="Most Used">Most Used</option>
              <option value="Recently Created">Recently Created</option>
            </select>
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="px-4 py-2 rounded-lg border transition-colors"
              style={{
                backgroundColor: 'var(--surface-light)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)'
              }}
            >
              {viewMode === 'grid' ? '☷' : '☰'}
            </button>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            {selectedTemplates.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
              >
                Delete Selected ({selectedTemplates.size})
              </button>
            )}
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-lg border transition-colors"
              style={{
                backgroundColor: 'var(--surface-light)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)'
              }}
            >
              Export
            </button>
            <button
              onClick={() => {
                setEditingTemplate(null)
                setShowModal(true)
              }}
              className="px-6 py-2 rounded-lg font-medium transition-colors"
              style={{ backgroundColor: 'var(--primary)', color: 'white' }}
            >
              + Create Template
            </button>
          </div>
        </div>

        {/* Templates Grid/List */}
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 frosted-glass btn-rounded flex items-center justify-center text-4xl">
              ⚡
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              No templates found
            </h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              {searchQuery || selectedCategory !== 'All'
                ? 'Try adjusting your search or filters'
                : 'Create your first template to get started'}
            </p>
            {!searchQuery && selectedCategory === 'All' && (
              <button
                onClick={() => {
                  setEditingTemplate(null)
                  setShowModal(true)
                }}
                className="px-6 py-2 rounded-lg font-medium transition-colors"
                style={{ backgroundColor: 'var(--primary)', color: 'white' }}
              >
                Create Template
              </button>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="frosted-glass rounded-lg p-4 border transition-all hover-lift group relative"
                style={{
                  backgroundColor: 'var(--surface)',
                  borderColor: selectedTemplates.has(template.id) ? 'var(--primary)' : 'var(--border)'
                }}
              >
                {/* Selection Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedTemplates.has(template.id)}
                  onChange={(e) => {
                    const newSelected = new Set(selectedTemplates)
                    if (e.target.checked) {
                      newSelected.add(template.id)
                    } else {
                      newSelected.delete(template.id)
                    }
                    setSelectedTemplates(newSelected)
                  }}
                  className="absolute top-2 right-2 w-5 h-5"
                  onClick={(e) => e.stopPropagation()}
                />

                {/* Template Content */}
                <div className="pr-6">
                  <div className="flex items-start space-x-3 mb-2">
                    {template.icon && (
                      <span className="text-2xl flex-shrink-0">{template.icon}</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-lg truncate" style={{ color: 'var(--text-primary)' }}>
                          {template.name}
                        </h3>
                        {template.pinned && <span className="text-yellow-400 text-sm">⭐</span>}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getCategoryColor(template.category)}`}>
                        {template.category}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                    {template.content}
                  </p>
                  <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>Used {template.usage_count || 0} times</span>
                    {template.last_used_at && (
                      <span>{new Date(template.last_used_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                {/* Action Buttons (on hover) */}
                <div className="absolute bottom-2 right-2 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handlePin(template)}
                    className="p-1.5 rounded transition-colors"
                    style={{
                      backgroundColor: 'var(--surface-light)',
                      color: template.pinned ? 'var(--primary)' : 'var(--text-muted)'
                    }}
                    title={template.pinned ? 'Unpin' : 'Pin'}
                  >
                    ⭐
                  </button>
                  <button
                    onClick={() => {
                      setEditingTemplate(template)
                      setShowModal(true)
                    }}
                    className="p-1.5 rounded transition-colors"
                    style={{ backgroundColor: 'var(--surface-light)', color: 'var(--text-primary)' }}
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDuplicate(template)}
                    className="p-1.5 rounded transition-colors"
                    style={{ backgroundColor: 'var(--surface-light)', color: 'var(--text-primary)' }}
                    title="Duplicate"
                  >
                    📋
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-1.5 rounded transition-colors text-red-400 hover:text-red-300"
                    style={{ backgroundColor: 'var(--surface-light)' }}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Template Modal */}
      <TemplateModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingTemplate(null)
        }}
        template={editingTemplate}
        onSave={fetchTemplates}
        userId={user?.id}
      />
    </div>
  )
}

export default MessageTemplates

