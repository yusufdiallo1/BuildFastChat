import React from 'react'

function HighlightedText({ text, searchQuery }) {
  if (!searchQuery || searchQuery.trim().length < 2) {
    return <span>{text}</span>
  }

  const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)

  return (
    <span>
      {parts.map((part, index) => {
        if (regex.test(part)) {
          return (
            <mark key={index} className="bg-yellow-300 text-yellow-900 px-1 rounded">
              {part}
            </mark>
          )
        }
        return part
      })}
    </span>
  )
}

export default HighlightedText
