const express = require('express');
const router = express.Router();
const sql = require('../database/sql_connection');
const { redisClient } = require('../database/redis_connection');

// SQL Query Endpoint (Testing purposes)
// Example Body: { "query": "SELECT * FROM users", "params": [] }
router.post('/sql', async (req, res) => {
  try {
    const { query, params } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    // Using pool to execute query (mysql2/promise syntax)
    const [rows, fields] = await sql.query(query, params || []);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('SQL Query Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Redis Set Endpoint
// Example Body: { "key": "test_key", "value": "test_value" }
router.post('/redis/set', async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value are required' });
    }
    
    // Store as string or serialize JSON
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    await redisClient.set(key, stringValue);
    
    res.json({ success: true, message: 'Value set successfully in Redis' });
  } catch (error) {
    console.error('Redis Set Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Redis Get Endpoint
// Example: GET /api/db/redis/get/test_key
router.get('/redis/get/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const value = await redisClient.get(key);
    res.json({ success: true, data: value });
  } catch (error) {
    console.error('Redis Get Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
