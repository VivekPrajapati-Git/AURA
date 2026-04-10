require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple Route
app.get('/hi', (req, res) => {
  res.json({ message: 'hi' });
});

app.get('/', (req, res) => {
  res.send('AURA Backend is running!');
});

// API Routes
app.use('/auth', require('./routes/auth'));
app.use('/chat', require('./routes/chat'));
app.use('/user', require('./routes/user'));

// Database Connections
require('./database/sql_connection'); // Initialize SQL pool
const { connectRedis } = require('./database/redis_connection'); // Import Redis connection helper

// Connect to Redis
connectRedis();

// Upstream Routes
const dbRoutes = require('./routes/dbRoutes');
app.use('/api/db', dbRoutes);

console.log('Connecting to MongoDB...');
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected successfully!'))
  .catch(err => console.log('MongoDB Connection error:', err));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
