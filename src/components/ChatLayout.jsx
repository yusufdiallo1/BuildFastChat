import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Sidebar from './Sidebar'
import MainChat from './MainChat'

function ChatLayout() {
  const [searchParams] = useSearchParams()
  const [selectedConversationId, setSelectedConversationId] = useState(null)

  useEffect(() => {
    const conversationId = searchParams.get('conversation')
    // Only update if conversation actually changed
    if (conversationId !== selectedConversationId) {
      setSelectedConversationId(conversationId)
    }
  }, [searchParams, selectedConversationId])

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar 
        selectedConversationId={selectedConversationId}
        onConversationSelect={setSelectedConversationId}
      />
      <MainChat conversationId={selectedConversationId} />
    </div>
  )
}

export default ChatLayout


