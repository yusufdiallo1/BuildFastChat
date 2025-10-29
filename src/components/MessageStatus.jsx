import React from 'react'

function MessageStatus({ status = 'sent', isSent, sender }) {
  // Only show status indicators for sent messages
  if (!isSent) return null

  // If sender has disabled read receipts, show 'delivered' instead of 'read'
  let displayStatus = status
  if (status === 'read' && sender?.send_read_receipts === false) {
    displayStatus = 'delivered'
  }

  // Render checkmarks based on status
  if (displayStatus === 'sent') {
    // Single gray checkmark
    return (
      <div className="flex items-center mt-0.5">
        <svg className="w-3.5 h-3.5" fill="#9CA3AF" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>
    )
  }
  
  if (displayStatus === 'delivered') {
    // Double gray checkmarks
    return (
      <div className="flex items-center mt-0.5">
        <svg className="w-3.5 h-3.5" fill="#9CA3AF" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        <svg className="w-3.5 h-3.5 -ml-1.5" fill="#9CA3AF" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>
    )
  }
  
  if (displayStatus === 'read') {
    // Double baby blue checkmarks
    return (
      <div className="flex items-center mt-0.5">
        <svg className="w-3.5 h-3.5" fill="#60A5FA" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        <svg className="w-3.5 h-3.5 -ml-1.5" fill="#60A5FA" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>
    )
  }

  return null
}

export default MessageStatus
