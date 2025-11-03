import { io } from 'socket.io-client'

let socketInstance = null

export const initSocket = (userId) => {
  // Get socket server URL from environment variable
  // Default to localhost for development
  const socketUrl = import.meta.env.VITE_SOCKET_SERVER_URL || 'http://localhost:3001'
  
  if (socketInstance) {
    socketInstance.disconnect()
  }

  socketInstance = io(socketUrl, {
    auth: {
      userId: userId
    },
    transports: ['websocket', 'polling']
  })

  socketInstance.on('connect', () => {
    console.log('Socket connected:', socketInstance.id)
    // Register user with the server
    if (userId) {
      socketInstance.emit('user-connected', userId)
    }
  })

  socketInstance.on('disconnect', () => {
    console.log('Socket disconnected')
  })

  socketInstance.on('connect_error', (error) => {
    // Only log to console, don't show alerts - voice calling is optional
    console.warn('⚠️ Socket.io connection failed (voice calling will be unavailable):', error.message)
    console.info('💡 Voice calling requires a Socket.io backend server.')
    console.info('💡 See VOICE_CALL_BACKEND_SETUP.md for setup instructions.')
    console.info('💡 Server URL:', socketUrl)
    console.info('💡 The app will continue to work normally without voice calling.')
  })

  return socketInstance
}

export const getSocket = () => {
  if (!socketInstance) {
    console.warn('⚠️ Socket not initialized. Voice calling will not work.')
    console.warn('💡 Make sure you are logged in and the socket server is set up.')
    console.warn('💡 See VOICE_CALL_BACKEND_SETUP.md for setup instructions.')
  }
  return socketInstance
}

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
  }
}

