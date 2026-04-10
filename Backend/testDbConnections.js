require('dotenv').config();
const { pool } = require('./sql_connection');
const { connectRedis } = require('./redis_connection');
const mongoose = require('mongoose');

async function testAllConnections() {
  console.log('--- Database Connection Tests ---\n');

  // 1. Test Redis (Both standard and ioredis)
  try {
    await connectRedis(); // tests redis_connection.js
    
    // Test ioredis from redis_client.js
    const ioRedis = require('./redis_client');
    await ioRedis.set('aura_status', 'ready');
    const status = await ioRedis.get('aura_status');
    console.log(`✅ ioRedis Connected Successfully (Status: ${status})`);
  } catch (error) {
    console.error('❌ Redis test failed:', error.message);
  }

  // 2. Test MySQL
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL Connected Successfully');
    const [rows] = await connection.query('SELECT NOW() AS now');
    console.log('   MySQL Time:', rows[0].now);
    connection.release();
  } catch (error) {
    console.error('❌ MySQL test failed:', error.message);
  }

  // 3. Test MongoDB
  try {
    if (!process.env.MONGO_URI || process.env.MONGO_URI === 'your_mongodb_connection_string_here') {
      console.log('\n⚠️ MongoDB test skipped: Please add a valid MONGO_URI in .env');
    } else {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('✅ MongoDB Connected Successfully');
    }
  } catch (error) {
    console.error('❌ MongoDB test failed:', error.message);
  }

  console.log('\n--- Tests Complete ---');
  process.exit(0);
}

testAllConnections();
