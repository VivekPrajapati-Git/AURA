const { createClient } = require('redis');
require('dotenv').config();

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));

const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log('Redis Connected Successfully');
  } catch (error) {
    console.error('Could not connect to Redis:', error);
  }
};

module.exports = { redisClient, connectRedis };
