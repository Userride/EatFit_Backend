// Import required modules
const express = require('express');
const dotenv = require('dotenv');
const mongoDB = require('./db');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// Load environment variables
dotenv.config({ path: './config.env' });

const app = express();
app.use(express.json());

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Import routes
const orderRoutes = require('./Routes/orderRoutes');
app.use('/api/orders', orderRoutes);
app.use('/api', require('./Routes/CreateUser'));
app.use('/api', require('./Routes/DisplayData'));

// Simple route
app.get('/', (req, res) => {
  res.send('🚀 EatFit Server is Running');
});

// Database + Server
mongoDB().then(() => {
  const port = process.env.PORT || 5000;

  // Create HTTP server for socket.io
  const server = http.createServer(app);

  // Initialize socket.io
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Store io in app for route access
  app.set('io', io);

  io.on('connection', (socket) => {
    console.log('✅ New client connected:', socket.id);

    socket.on('join_order', (orderId) => {
      console.log(`📦 Socket ${socket.id} joined order room: ${orderId}`);
      socket.join(orderId);
    });

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
    });
  });

  server.listen(port, () => {
    console.log(`✅ Server running on port ${port}`);
  });
}).catch(err => {
  console.error("❌ Failed to connect to the database:", err);
});
