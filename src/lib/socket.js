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
    console.error('Socket connection error:', error)
  })

  return socketInstance
}

export const getSocket = () => {
  if (!socketInstance) {
    console.warn('Socket not initialized. Call initSocket() first.')
  }
  return socketInstance
}

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
  }
}

