const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

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

// Store connected users
let connectedUsers = 0;

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  connectedUsers++;
  console.log('Total connected users:', connectedUsers);

  // Send current user count to the new user
  socket.emit('userCount', connectedUsers);

  // Broadcast updated user count to all users
  io.emit('userCount', connectedUsers);

  // Handle new message
  socket.on('newMessage', (data) => {
    console.log('New message received:', data);
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
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
