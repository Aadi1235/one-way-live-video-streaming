const express = require('express');
const http = require('http');
// const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors({
  origin: ['http://localhost:5173',
  'https://one-way-live-video-streaming.vercel.app/'
  ],
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

// MongoDB connection
// mongoose.connect('mongodb://localhost:27017/videostream', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });

// const streamSchema = new mongoose.Schema({
//   streamId: String,
//   createdAt: { type: Date, default: Date.now },
// });
// const Stream = mongoose.model('Stream', streamSchema);

// Simple in-memory storage instead of MongoDB
const streams = new Map();

// API to create a new stream
app.post('/api/stream', async (req, res) => {
  const streamId = Math.random().toString(36).substr(2, 9);
  const stream = new Stream({ streamId });
  await stream.save();
  res.json({ streamId });
});

// API to check if a stream exists
// app.get('/api/stream/:streamId', async (req, res) => {
//   const { streamId } = req.params;
//   const stream = await Stream.findOne({ streamId });
//   if (stream) {
//     res.json({ exists: true });
//   } else {
//     res.status(404).json({ exists: false });
//   }
// });

// API to create a new stream
app.post('/api/stream', async (req, res) => {
  const streamId = Math.random().toString(36).substr(2, 9);
  // const stream = new Stream({ streamId }); // Comment out mongoose
  // await stream.save(); // Comment out mongoose
  streams.set(streamId, { createdAt: new Date() }); // Use in-memory instead
  res.json({ streamId });
});

// API to check if a stream exists
app.get('/api/stream/:streamId', async (req, res) => {
  const { streamId } = req.params;
  // const stream = await Stream.findOne({ streamId }); // Comment out mongoose
  // if (stream) { // Comment out mongoose
  if (streams.has(streamId)) { // Use in-memory instead
    res.json({ exists: true });
  } else {
    res.status(404).json({ exists: false });
  }
});

// Socket.IO signaling for WebRTC
io.on('connection', (socket) => {
  socket.on('join-stream', (streamId) => {
    console.log(`[Socket.IO] ${socket.id} joined stream ${streamId}`);
    socket.join(streamId);
    socket.streamId = streamId;
  });

  // Viewer notifies server it joined
  socket.on('viewer-join', ({ streamId, viewerId, name }) => {
    console.log(`[Socket.IO] Viewer ${socket.id} joined stream ${streamId} as ${viewerId} (${name})`);
    socket.viewerId = viewerId;
    socket.viewerName = name;
    // Log all sockets and their streamId
    console.log('[Socket.IO] Current sockets and their streamId:');
    for (const [id, s] of io.sockets.sockets) {
      console.log(`  Socket ${id}: streamId=${s.streamId}, viewerId=${s.viewerId}, viewerName=${s.viewerName}`);
    }
    // Notify host that a new viewer joined
    const hostSocket = Array.from(io.sockets.sockets.values()).find(s => s.streamId === streamId && s !== socket);
    if (hostSocket) {
      console.log(`[Socket.IO] Notifying host ${hostSocket.id} of new viewer ${socket.id}`);
      hostSocket.emit('new-viewer', { viewerId, name });
    } else {
      console.log(`[Socket.IO] No host found for stream ${streamId}`);
    }
  });

  // Host notifies server it is ready
  socket.on('host-ready', ({ streamId }) => {
    console.log(`[Socket.IO] Host ${socket.id} is ready for stream ${streamId}`);
    socket.streamId = streamId;
    socket.isHost = true;
  });

  // Relay signaling messages
  socket.on('signal', ({ streamId, to, type, data, viewerId, name }) => {
    if (to) {
      console.log(`[Socket.IO] Relaying signal '${type}' from ${socket.id} to ${to} for stream ${streamId}`);
      io.to(to).emit('signal', { type, data, from: socket.id, viewerId, name });
    } else {
      // Broadcast to all in the room except sender
      socket.to(streamId).emit('signal', { type, data, from: socket.id, viewerId, name });
    }
  });

  // Relay chat messages to everyone in the stream room
  socket.on('chat-message', ({ streamId, name, message }) => {
    io.to(streamId).emit('chat-message', { name, message });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 