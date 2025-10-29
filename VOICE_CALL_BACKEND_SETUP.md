# Voice Call Backend Setup Guide

This guide explains how to set up the Socket.io backend server required for voice calling functionality.

## Overview

The voice calling feature uses WebRTC (Web Real-Time Communication) for peer-to-peer audio connections. However, we need a Socket.io server to handle the initial "signaling" - connecting two users so they can establish a direct connection.

## Backend Server Setup

### Step 1: Create Backend Server File

Create a new directory for your backend server and install dependencies:

```bash
mkdir backend
cd backend
npm init -y
npm install socket.io express cors
```

### Step 2: Create Server File

Create `server.js` with the following code:

```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // In production, replace with your frontend URL
    methods: ["GET", "POST"]
  }
});

// Store user socket connections
const userSockets = new Map(); // userId -> socketId

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // When user connects, store their userId
  socket.on('user-connected', (userId) => {
    userSockets.set(userId, socket.id);
    socket.userId = userId;
    console.log(`User ${userId} connected with socket ${socket.id}`);
  });

  // Handle call initiation
  socket.on('call-user', ({ targetUserId, callerId, callerName, signal, callerProfilePicture }) => {
    const targetSocketId = userSockets.get(targetUserId);
    
    if (!targetSocketId) {
      // User is offline
      socket.emit('call-rejected', { reason: 'User is offline' });
      return;
    }

    // Check if target user is already in a call
    // You can implement this logic based on your needs
    
    // Forward the call to the target user
    io.to(targetSocketId).emit('incoming-call', {
      callerId,
      callerName,
      signal,
      callerProfilePicture
    });
  });

  // Handle call acceptance
  socket.on('answer-call', ({ signal, callerId }) => {
    const callerSocketId = userSockets.get(callerId);
    
    if (!callerSocketId) {
      socket.emit('call-error', { message: 'Caller is no longer available' });
      return;
    }

    // Forward the answer to the caller
    io.to(callerSocketId).emit('call-accepted', { signal });
  });

  // Handle call rejection
  socket.on('reject-call', ({ callerId }) => {
    const callerSocketId = userSockets.get(callerId);
    
    if (callerSocketId) {
      io.to(callerSocketId).emit('call-rejected');
    }
  });

  // Handle call ending
  socket.on('end-call', ({ otherUserId }) => {
    const otherSocketId = userSockets.get(otherUserId);
    
    if (otherSocketId) {
      io.to(otherSocketId).emit('call-ended');
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (socket.userId) {
      userSockets.delete(socket.userId);
      console.log(`User ${socket.userId} disconnected`);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`);
});
```

### Step 3: Update Frontend Socket Connection

Update your frontend `.env` file (or create one) with:

```
VITE_SOCKET_SERVER_URL=http://localhost:3001
```

For production, use your deployed backend URL:
```
VITE_SOCKET_SERVER_URL=https://your-backend-domain.com
```

### Step 4: Update Socket Client to Send User ID

The socket client needs to send the user ID when connecting. Update `src/lib/socket.js` if needed, or ensure your AuthContext properly initializes with userId (already implemented).

### Step 5: Start the Server

```bash
node server.js
```

## Deployment Options

### Option 1: Deploy to Railway

1. Push your backend code to GitHub
2. Connect to Railway
3. Add environment variables
4. Deploy

### Option 2: Deploy to Render

1. Create a new Web Service
2. Connect your repository
3. Set build command: `npm install`
4. Set start command: `node server.js`
5. Deploy

### Option 3: Deploy to Heroku

1. Create `Procfile`:
```
web: node server.js
```

2. Deploy using Heroku CLI

## Testing

1. Start your backend server
2. Start your frontend application
3. Open two browser windows/tabs with different users
4. Click the voice call button in one window
5. The other user should receive an incoming call notification
6. Accept the call and test audio

## Security Considerations

1. **Authentication**: Add authentication middleware to verify user identity
2. **Rate Limiting**: Prevent abuse by limiting call requests per user
3. **CORS**: In production, restrict CORS to your frontend domain only
4. **HTTPS**: Always use HTTPS in production for WebRTC to work
5. **User Validation**: Validate that users exist and are allowed to call each other

## Advanced Features (Optional)

### Call Status Tracking

You can add a system to track active calls:

```javascript
const activeCalls = new Map(); // conversationId -> { callerId, receiverId, status }

socket.on('call-user', (data) => {
  // ... existing code ...
  activeCalls.set(`${data.callerId}-${data.targetUserId}`, {
    callerId: data.callerId,
    receiverId: data.targetUserId,
    status: 'ringing'
  });
});
```

### Busy Status

Check if a user is already in a call:

```javascript
socket.on('call-user', (data) => {
  const isTargetBusy = Array.from(activeCalls.values()).some(
    call => (call.receiverId === data.targetUserId || call.callerId === data.targetUserId) && call.status === 'active'
  );
  
  if (isTargetBusy) {
    socket.emit('user-busy', { userId: data.targetUserId });
    return;
  }
  // ... rest of code
});
```

## Troubleshooting

### Connection Issues

- Check that the backend server is running
- Verify `VITE_SOCKET_SERVER_URL` is set correctly
- Check browser console for connection errors
- Ensure CORS is properly configured

### Microphone Issues

- Verify HTTPS is enabled (required for getUserMedia)
- Check browser permissions for microphone access
- Test on different browsers (Chrome, Firefox, Safari)

### Call Not Connecting

- Check that both users are connected to the socket
- Verify WebRTC is supported in both browsers
- Check network firewall settings
- Review browser console for WebRTC errors

## Production Checklist

- [ ] Set up HTTPS for both frontend and backend
- [ ] Configure proper CORS settings
- [ ] Add authentication to socket connections
- [ ] Implement rate limiting
- [ ] Set up monitoring and logging
- [ ] Configure environment variables
- [ ] Test on multiple browsers and devices
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Configure backup/redundancy for the socket server

