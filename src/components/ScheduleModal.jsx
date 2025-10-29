import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Portal from './Portal'

function ScheduleModal({ message, conversationId, selectedImage, messageType, onClose, onScheduleSuccess }) {
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const { user } = useAuth()

  // Set default to tomorrow at current time + 1 hour
  useEffect(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(tomorrow.getHours() + 1, 0, 0, 0)
    
    const dateStr = tomorrow.toISOString().split('T')[0]
    const timeStr = `${String(tomorrow.getHours()).padStart(2, '0')}:${String(tomorrow.getMinutes()).padStart(2, '0')}`
    
    setSelectedDate(dateStr)
    setSelectedTime(timeStr)
  }, [])

  const handleSchedule = async () => {
    if (!selectedDate || !selectedTime || scheduling || !conversationId || !user || !message?.trim()) return

    try {
      setScheduling(true)

      // Combine date and time
      const [year, month, day] = selectedDate.split('-').map(Number)
      const [hours, minutes] = selectedTime.split(':').map(Number)
      
      const scheduledDateTime = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0))
      const now = new Date()

      // Validate that scheduled time is in the future
      if (scheduledDateTime <= now) {
        alert('Please select a future date and time')
        return
      }

      let imageData = null
      if (selectedImage && messageType === 'image') {
        // Upload image first
        const fileExt = selectedImage.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `chat-images/${fileName}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-images')
          .upload(filePath, selectedImage, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('chat-images')
          .getPublicUrl(filePath)

        imageData = {
          url: publicUrl,
          path: filePath,
          filename: selectedImage.name,
          size: selectedImage.size,
          type: selectedImage.type
        }
      }

      const scheduledMessageData = {
        conversation_id: conversationId,
        sender_id: user.id,
        content: message.trim() || '',
        message_type: messageType || 'text',
        scheduled_for: scheduledDateTime.toISOString(),
        status: 'pending',
        payload: imageData || null
      }

      const { error } = await supabase
        .from('scheduled_messages')
        .insert(scheduledMessageData)

      if (error) throw error

      if (onScheduleSuccess) {
        onScheduleSuccess()
      }

      alert(`Message scheduled for ${scheduledDateTime.toLocaleString()}`)
      onClose()
    } catch (error) {
      console.error('Error scheduling message:', error)
      alert('Failed to schedule message: ' + (error?.message || 'Please try again.'))
    } finally {
      setScheduling(false)
    }
  }

  // Get minimum date/time (now + 1 minute)
  const getMinDateTime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 1)
    return now.toISOString().slice(0, 16)
  }

  const getMinDate = () => {
    const now = new Date()
    return now.toISOString().split('T')[0]
  }

  const formatScheduledTime = () => {
    if (!selectedDate || !selectedTime) return ''
    const [year, month, day] = selectedDate.split('-').map(Number)
    const [hours, minutes] = selectedTime.split(':').map(Number)
    const scheduledDateTime = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0))
    return scheduledDateTime.toLocaleString()
  }

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const isValidDateTime = () => {
    if (!selectedDate || !selectedTime) return false
    const [year, month, day] = selectedDate.split('-').map(Number)
    const [hours, minutes] = selectedTime.split(':').map(Number)
    const scheduledDateTime = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0))
    const now = new Date()
    return scheduledDateTime > now
  }

  return (
    <Portal>
      <div 
        className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div 
          className="frosted-glass rounded-2xl shadow-2xl w-full max-w-md border border-slate-600"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-600">
            <h2 className="text-2xl font-bold gradient-text">Schedule Message</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Message Preview */}
            <div>
              <label className="text-sm font-medium text-slate-400 mb-2 block">Message Preview</label>
              <div className="frosted-glass rounded-lg p-4 text-slate-300">
                {messageType === 'image' && selectedImage ? (
                  <div className="space-y-2">
                    <img 
                      src={URL.createObjectURL(selectedImage)} 
                      alt="Preview" 
                      className="max-w-full max-h-48 rounded-lg object-contain"
                    />
                    {message.trim() && (
                      <p className="text-sm">{message.trim()}</p>
                    )}
                  </div>
                ) : (
                  <p className={message.trim() ? '' : 'text-slate-500 italic'}>
                    {message.trim() || 'No message content'}
                  </p>
                )}
              </div>
            </div>

            {/* Date Picker */}
            <div>
              <label className="text-sm font-medium text-slate-400 mb-2 block">
                Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={getMinDate()}
                className="w-full px-4 py-3 frosted-glass btn-rounded text-white border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Time Picker */}
            <div>
              <label className="text-sm font-medium text-slate-400 mb-2 block">
                Time <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-4 py-3 frosted-glass btn-rounded text-white border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Scheduled Time Preview */}
            {isValidDateTime() && (
              <div className="bg-blue-600/20 border border-blue-500 rounded-lg p-3">
                <p className="text-sm text-blue-300">
                  <span className="font-medium">Scheduled for:</span> {formatScheduledTime()}
                </p>
              </div>
            )}

            {!isValidDateTime() && selectedDate && selectedTime && (
              <div className="bg-red-600/20 border border-red-500 rounded-lg p-3">
                <p className="text-sm text-red-300">
                  Please select a future date and time
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <button
                onClick={onClose}
                disabled={scheduling}
                className="flex-1 frosted-glass btn-rounded text-slate-300 px-6 py-2 font-medium hover-lift transition-all duration-200 hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSchedule}
                disabled={!isValidDateTime() || scheduling}
                className="flex-1 frosted-glass btn-rounded text-white px-6 py-2 font-medium hover-lift transition-all duration-200 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {scheduling ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Scheduling...
                  </div>
                ) : (
                  'Schedule Message'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}

export default ScheduleModal


