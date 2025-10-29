import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

function TemplatesPicker({ isOpen, onClose, onSelect, userId }) {
  const [templates, setTemplates] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [categories, setCategories] = useState({})
  const searchInputRef = useRef(null)
  const listContainerRef = useRef(null)

  useEffect(() => {
    if (isOpen && userId) {
      fetchTemplates()
      searchInputRef.current?.focus()
    }
  }, [isOpen, userId])

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
      setSelectedCategory('All')
      setHighlightedIndex(0)
    }
  }, [isOpen])

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('pinned', { ascending: false })
        .order('pinned_order', { ascending: true })
        .order('usage_count', { ascending: false })
        .order('last_used_at', { ascending: false, nullsFirst: false })
        .order('name', { ascending: true })

      if (error) throw error

      // Group by category
      const grouped = {}
      data.forEach(template => {
        if (!grouped[template.category]) {
          grouped[template.category] = []
        }
        grouped[template.category].push(template)
      })

      setCategories(grouped)
      setTemplates(data || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = searchQuery === '' ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const pinnedTemplates = filteredTemplates.filter(t => t.pinned)
  const unpinnedTemplates = filteredTemplates.filter(t => !t.pinned)

  const handleSelect = (template) => {
    // Increment usage count
    supabase
      .from('message_templates')
      .update({
        usage_count: (template.usage_count || 0) + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('id', template.id)
      .then(() => {
        fetchTemplates()
      })

    // Process variables
    let processedContent = template.content
    const now = new Date()
    
    // Replace variables (case-insensitive)
    processedContent = processedContent.replace(/{name}/gi, '')
    processedContent = processedContent.replace(/{time}/gi, now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    processedContent = processedContent.replace(/{date}/gi, now.toLocaleDateString())

    onSelect(processedContent.trim())
    onClose()
  }

  const handleKeyDown = (e) => {
    if (!isOpen) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(prev => Math.min(prev + 1, filteredTemplates.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredTemplates[highlightedIndex]) {
        handleSelect(filteredTemplates[highlightedIndex])
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }

    // Scroll highlighted item into view
    if (listContainerRef.current) {
      const items = listContainerRef.current.querySelectorAll('[data-template-index]')
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest' })
      }
    }
  }

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, filteredTemplates, highlightedIndex])

  useEffect(() => {
    if (filteredTemplates.length > 0 && highlightedIndex >= filteredTemplates.length) {
      setHighlightedIndex(filteredTemplates.length - 1)
    }
  }, [filteredTemplates.length])

  if (!isOpen) return null

  const renderTemplateGroup = (templatesList, title = null) => {
    if (templatesList.length === 0) return null

    return (
      <div className="mb-4">
        {title && (
          <div className="px-3 py-1 text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
            {title}
          </div>
        )}
        {templatesList.map((template, index) => {
          const globalIndex = filteredTemplates.indexOf(template)
          const isHighlighted = globalIndex === highlightedIndex
          
          return (
            <div
              key={template.id}
              data-template-index={globalIndex}
              onClick={() => handleSelect(template)}
              className={`px-4 py-3 cursor-pointer transition-all ${
                isHighlighted ? 'frosted-glass' : ''
              }`}
              style={{
                backgroundColor: isHighlighted ? 'var(--surface-light)' : 'transparent',
                borderLeft: isHighlighted ? '3px solid var(--primary)' : '3px solid transparent'
              }}
              onMouseEnter={() => setHighlightedIndex(globalIndex)}
            >
              <div className="flex items-start space-x-3">
                {template.icon && (
                  <span className="text-xl flex-shrink-0">{template.icon}</span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {template.name}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      template.category === 'Personal' ? 'bg-blue-500/20 text-blue-400' :
                      template.category === 'Work' ? 'bg-purple-500/20 text-purple-400' :
                      template.category === 'Common' ? 'bg-green-500/20 text-green-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {template.category}
                    </span>
                    {template.pinned && <span className="text-yellow-400">⭐</span>}
                  </div>
                  <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                    {template.content.length > 60 ? `${template.content.substring(0, 60)}...` : template.content}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      <div
        className="fixed z-50 rounded-lg shadow-2xl border overflow-hidden"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
          width: '400px',
          maxHeight: '500px',
          bottom: '120px',
          left: '50%',
          transform: 'translateX(-50%)',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setHighlightedIndex(0)
            }}
            placeholder="Search templates..."
            className="w-full px-4 py-2 rounded-lg border text-sm"
            style={{
              backgroundColor: 'var(--surface-light)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)'
            }}
          />
          <div className="flex items-center space-x-2 mt-2">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                setHighlightedIndex(0)
              }}
              className="flex-1 px-3 py-1.5 rounded-lg border text-sm"
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
          </div>
        </div>

        {/* Templates List */}
        <div ref={listContainerRef} className="overflow-y-auto max-h-96">
          {filteredTemplates.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {searchQuery ? 'No templates found' : 'No templates available'}
              </p>
            </div>
          ) : (
            <div>
              {renderTemplateGroup(pinnedTemplates, pinnedTemplates.length > 0 ? '⭐ Pinned' : null)}
              {renderTemplateGroup(unpinnedTemplates)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          Use arrow keys to navigate, Enter to select, Esc to close
        </div>
      </div>
    </>
  )
}

export default TemplatesPicker

