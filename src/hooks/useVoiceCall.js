import { useState, useEffect, useRef, useCallback } from 'react'
import SimplePeer from 'simple-peer'
import { getSocket } from '../lib/socket'

export const useVoiceCall = (currentUserId, currentUserName) => {
  const [callState, setCallState] = useState(null) // null, 'calling', 'incoming', 'active'
  const [otherUser, setOtherUser] = useState(null) // { id, name, profilePicture }
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [isMuted, setIsMuted] = useState(false)
  const [callStartTime, setCallStartTime] = useState(null)
  const [callDuration, setCallDuration] = useState(0)
  const [connectionError, setConnectionError] = useState(null)

  const peerRef = useRef(null)
  const audioElementRef = useRef(null)
  const callTimeoutRef = useRef(null)
  const durationIntervalRef = useRef(null)
  const incomingSignalRef = useRef(null) // Store incoming call signal data

  // Cleanup function
  const cleanup = useCallback(() => {
    // Stop local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
      setLocalStream(null)
    }

    // Stop remote audio
    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current.srcObject = null
      audioElementRef.current = null
    }

    // Destroy peer connection
    if (peerRef.current) {
      peerRef.current.destroy()
      peerRef.current = null
    }

    // Clear timeouts and intervals
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current)
      callTimeoutRef.current = null
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }

    // Reset state
    setCallState(null)
    setOtherUser(null)
    setRemoteStream(null)
    setCallStartTime(null)
    setCallDuration(0)
    setConnectionError(null)
    setIsMuted(false)
    incomingSignalRef.current = null
  }, [localStream])

  // Request microphone permission and get stream
  const getAudioStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
        video: false
      })
      return stream
    } catch (error) {
      console.error('Error accessing microphone:', error)
      throw new Error('Microphone access denied. Please enable it in browser settings.')
    }
  }, [])

  // Initiate a call
  const initiateCall = useCallback(async (targetUserId, targetUserName, targetUserProfilePicture) => {
    const socket = getSocket()
    if (!socket || !socket.connected) {
      setConnectionError('Connection to server lost. Please refresh the page.')
      return
    }

    try {
      // Request microphone permission
      const stream = await getAudioStream()
      setLocalStream(stream)

      // Create peer as initiator
      const peer = new SimplePeer({
        initiator: true,
        trickle: false,
        stream: stream
      })

      peerRef.current = peer

      // Listen for signal data (offer)
      peer.on('signal', (data) => {
        socket.emit('call-user', {
          targetUserId,
          callerId: currentUserId,
          callerName: currentUserName,
          signal: data
        })
      })

      // Listen for remote stream
      peer.on('stream', (remoteAudioStream) => {
        setRemoteStream(remoteAudioStream)
        
        // Play remote audio
        const audio = new Audio()
        audio.srcObject = remoteAudioStream
        audio.play().catch(err => console.error('Error playing remote audio:', err))
        audioElementRef.current = audio
      })

      // Handle errors
      peer.on('error', (err) => {
        console.error('Peer connection error:', err)
        setConnectionError('Connection failed. Please check your internet and try again.')
        cleanup()
      })

      // Set calling state
      setCallState('calling')
      setOtherUser({
        id: targetUserId,
        name: targetUserName,
        profilePicture: targetUserProfilePicture
      })

      // Set timeout for no answer (30 seconds)
      callTimeoutRef.current = setTimeout(() => {
        setCallState(currentState => {
          if (currentState === 'calling') {
            endCall()
          }
          return currentState
        })
      }, 30000)

    } catch (error) {
      console.error('Error initiating call:', error)
      setConnectionError(error.message || 'Failed to start call')
      cleanup()
    }
  }, [currentUserId, currentUserName, getAudioStream, cleanup])

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    const signalData = incomingSignalRef.current
    if (!signalData || !otherUser) {
      console.error('No incoming call signal or user data')
      return
    }

    const callerId = otherUser.id
    const callerName = otherUser.name
    const callerProfilePicture = otherUser.profilePicture
    try {
      // Request microphone permission
      const stream = await getAudioStream()
      setLocalStream(stream)

      // Create peer as answerer
      const peer = new SimplePeer({
        initiator: false,
        trickle: false,
        stream: stream
      })

      peerRef.current = peer

      // Set the incoming signal
      peer.signal(signalData)

      // Listen for signal data (answer)
      peer.on('signal', (data) => {
        const socket = getSocket()
        if (socket && socket.connected) {
          socket.emit('answer-call', {
            signal: data,
            callerId: callerId
          })
        }
      })

      // Listen for remote stream
      peer.on('stream', (remoteAudioStream) => {
        setRemoteStream(remoteAudioStream)
        
        // Play remote audio
        const audio = new Audio()
        audio.srcObject = remoteAudioStream
        audio.play().catch(err => console.error('Error playing remote audio:', err))
        audioElementRef.current = audio
      })

      // Handle errors
      peer.on('error', (err) => {
        console.error('Peer connection error:', err)
        setConnectionError('Connection failed. Please check your internet and try again.')
        cleanup()
      })

      // Set active state
      setCallState('active')
      setOtherUser({
        id: callerId,
        name: callerName,
        profilePicture: callerProfilePicture
      })
      const startTime = Date.now()
      setCallStartTime(startTime)
      
      // Start call timer
      durationIntervalRef.current = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)

      // Clear incoming signal
      incomingSignalRef.current = null

    } catch (error) {
      console.error('Error accepting call:', error)
      setConnectionError(error.message || 'Failed to accept call')
      
      // Notify caller that call was rejected
      const socket = getSocket()
      if (socket && socket.connected && otherUser) {
        socket.emit('reject-call', { callerId: otherUser.id })
      }
      
      cleanup()
    }
  }, [getAudioStream, cleanup, otherUser])

  // Reject incoming call
  const rejectCall = useCallback(() => {
    const socket = getSocket()
    if (socket && socket.connected && otherUser) {
      socket.emit('reject-call', { callerId: otherUser.id })
    }
    incomingSignalRef.current = null
    cleanup()
  }, [cleanup, otherUser])

  // End call
  const endCall = useCallback(() => {
    const socket = getSocket()
    if (socket && socket.connected && otherUser) {
      socket.emit('end-call', { otherUserId: otherUser.id })
    }
    cleanup()
  }, [otherUser, cleanup])

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!localStream) return

    const newMutedState = !isMuted
    setIsMuted(newMutedState)

    // Enable/disable audio tracks
    localStream.getAudioTracks().forEach(track => {
      track.enabled = !newMutedState
    })
  }, [localStream, isMuted])

  // Handle call accepted (for caller)
  const handleCallAccepted = useCallback((signalData) => {
    setCallState(currentState => {
      if (currentState === 'calling' && peerRef.current) {
        // Clear no-answer timeout
        if (callTimeoutRef.current) {
          clearTimeout(callTimeoutRef.current)
          callTimeoutRef.current = null
        }

        // Set the answer signal
        peerRef.current.signal(signalData)

        // Set active state
        const startTime = Date.now()
        setCallStartTime(startTime)
        setConnectionError(null)
        
        // Start call timer
        durationIntervalRef.current = setInterval(() => {
          setCallDuration(Math.floor((Date.now() - startTime) / 1000))
        }, 1000)

        return 'active'
      }
      return currentState
    })
  }, [])

  // Handle call rejected (for caller)
  const handleCallRejected = useCallback(() => {
    cleanup()
  }, [cleanup])

  // Handle call ended (for both)
  const handleCallEnded = useCallback(() => {
    cleanup()
  }, [cleanup])

  // Format call duration
  const formatDuration = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }, [])

  // Set up socket listeners
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleIncomingCall = (data) => {
      const { callerId, callerName, signal, callerProfilePicture } = data
      incomingSignalRef.current = signal
      setCallState('incoming')
      setOtherUser({
        id: callerId,
        name: callerName,
        profilePicture: callerProfilePicture || null
      })
    }

    const handleCallAcceptedEvent = (data) => {
      if (data && data.signal) {
        handleCallAccepted(data.signal)
      }
    }

    const handleCallRejectedEvent = () => {
      handleCallRejected()
    }

    const handleCallEndedEvent = () => {
      handleCallEnded()
    }

    socket.on('incoming-call', handleIncomingCall)
    socket.on('call-accepted', handleCallAcceptedEvent)
    socket.on('call-rejected', handleCallRejectedEvent)
    socket.on('call-ended', handleCallEndedEvent)

    return () => {
      socket.off('incoming-call', handleIncomingCall)
      socket.off('call-accepted', handleCallAcceptedEvent)
      socket.off('call-rejected', handleCallRejectedEvent)
      socket.off('call-ended', handleCallEndedEvent)
    }
  }, [handleCallAccepted, handleCallRejected, handleCallEnded])

  // Update call duration - this is now handled in handleCallAccepted and acceptCall
  // Removed duplicate timer setup

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    callState,
    otherUser,
    isMuted,
    callDuration: formatDuration(callDuration),
    connectionError,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute
  }
}

