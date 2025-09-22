const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname)));

// Store connected users and current messages
let connectedUsers = 0;
let currentMessages = [];

// Message persistence functions
function loadMessages() {
  try {
    if (fs.existsSync('messages.json')) {
      const data = fs.readFileSync('messages.json', 'utf8');
      const allMessages = JSON.parse(data);

      // Filter out expired messages (older than 15 seconds)
      const now = Date.now();
      currentMessages = allMessages.filter(msg => (now - msg.timestamp) < 15000);

      console.log('Loaded', allMessages.length, 'messages from file,', currentMessages.length, 'still active');
    }
  } catch (error) {
    console.error('Error loading messages:', error);
    currentMessages = [];
  }
}

function saveMessages() {
  try {
    fs.writeFileSync('messages.json', JSON.stringify(currentMessages, null, 2));
  } catch (error) {
    console.error('Error saving messages:', error);
  }
}

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  connectedUsers++;
  console.log('Total connected users:', connectedUsers);

  // Send current user count to the new user
  socket.emit('userCount', connectedUsers);

  // Send all current messages to the new user
  if (currentMessages.length > 0) {
    socket.emit('syncMessages', currentMessages);
    console.log('Sent', currentMessages.length, 'messages to new user');
  }

  // Broadcast updated user count to all users
  io.emit('userCount', connectedUsers);

  // Handle new message
  socket.on('newMessage', (data) => {
    console.log('New message received:', data);

    // Add timestamp to message for lifetime tracking
    const messageWithTimestamp = {
      ...data,
      timestamp: Date.now(),
      id: Date.now() + Math.random() // Unique ID
    };

    // Add message to current messages array
    currentMessages.push(messageWithTimestamp);
    console.log('Current messages count:', currentMessages.length);

    // Clean up expired messages (older than 15 seconds)
    const now = Date.now();
    currentMessages = currentMessages.filter(msg => (now - msg.timestamp) < 15000);

    // Keep only last 50 messages to prevent memory issues
    if (currentMessages.length > 50) {
      currentMessages = currentMessages.slice(-50);
    }

    // Save messages to file
    saveMessages();
    console.log('Messages saved to file, active messages:', currentMessages.length);

    // Broadcast the message to all other clients
    socket.broadcast.emit('newMessage', data);
  });



  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    connectedUsers--;
    console.log('Total connected users:', connectedUsers);

    // Broadcast updated user count to remaining users
    io.emit('userCount', connectedUsers);

    // Clear messages if no users left (optional - for clean restarts)
    if (connectedUsers === 0) {
      currentMessages = [];
      console.log('All users disconnected, cleared message history');
    }
  });
});

// Load messages on server start
loadMessages();
console.log('Server started with', currentMessages.length, 'messages loaded');

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
