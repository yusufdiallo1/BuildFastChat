import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Sidebar from './Sidebar'
import MainChat from './MainChat'
import GlobalSearch from './GlobalSearch'
import { useScheduledMessages } from '../hooks/useScheduledMessages'
import { useAutoDeleteMessages } from '../hooks/useAutoDeleteMessages'
import UpgradeProToast from './UpgradeProToast'

function ChatLayout() {
  const [searchParams] = useSearchParams()
  const [selectedConversationId, setSelectedConversationId] = useState(null)
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  
  // Process scheduled messages in background
  useScheduledMessages()
  // Auto-delete expired messages in background
  useAutoDeleteMessages()

  useEffect(() => {
    const conversationId = searchParams.get('conversation')
    // Only update if conversation actually changed
    if (conversationId !== selectedConversationId) {
      setSelectedConversationId(conversationId)
    }
  }, [searchParams, selectedConversationId])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Global search: Ctrl/Cmd + K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsGlobalSearchOpen(true)
        return
      }

      // Archive current conversation: Ctrl/Cmd + D
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && !e.shiftKey && selectedConversationId) {
        e.preventDefault()
        const archiveConversation = async () => {
          const { archiveConversation: archiveFn } = await import('../utils/archiveHelpers')
          const { useAuth } = await import('../contexts/AuthContext')
          // This will be handled by a helper that gets user from context
          // For now, we'll dispatch a custom event
          window.dispatchEvent(new CustomEvent('archiveConversation', { detail: { conversationId: selectedConversationId } }))
        }
        archiveConversation()
        return
      }

      // Unarchive: Ctrl/Cmd + Shift + D
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D' && selectedConversationId && showArchived) {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('unarchiveConversation', { detail: { conversationId: selectedConversationId } }))
        return
      }

      // Open archived: Alt + A
      if (e.altKey && e.key === 'a') {
        e.preventDefault()
        setShowArchived(true)
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedConversationId, showArchived])

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar 
        selectedConversationId={selectedConversationId}
        onConversationSelect={setSelectedConversationId}
        onGlobalSearch={() => setIsGlobalSearchOpen(true)}
        showArchived={showArchived}
        onShowArchivedChange={setShowArchived}
      />
      <MainChat conversationId={selectedConversationId} />
      <GlobalSearch 
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
      />
      <UpgradeProToast />
    </div>
  )
}

export default ChatLayout


