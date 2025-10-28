import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'

function Portal({ children }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  return createPortal(children, document.body)
}

export default Portal

