// Import required modules
const express = require('express');
const dotenv = require('dotenv');
const mongoDB = require('./db');
const cors = require('cors');  // Import CORS package

// Load environment variables from a .env file
dotenv.config({ path: './config.env' });

const app = express();

// Enable CORS with dynamic configuration
app.use(cors({
  methods: ['GET', 'POST', 'PUT', 'DELETE'],  // Allow certain HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization']  // Specify allowed headers
}));

// Middleware to parse JSON request bodies
app.use(express.json());

// Routes for user and other data
app.use('/api', require('./Routes/CreateUser'));
app.use('/api', require('./Routes/DisplayData'));

// Order routes - Use the order routes
app.use('/api/orders', require('./Routes/orderRoutes'));

// Define a simple GET route for testing
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Initialize database connection and start server
mongoDB().then(() => {
  const port = process.env.PORT || 5000; // Use dynamic port from environment variables
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}).catch(err => {
  console.error("Failed to connect to the database. Server not started.", err);
});
