const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../database/sql_connection');

const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_for_development';

// Register User
exports.register = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const connection = await pool.getConnection();

    // Check if user exists
    const [existing] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      connection.release();
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Create user. Using UUID() for MySQL.
    const [result] = await connection.query(
      'INSERT INTO users (id, username, email, password_hash) VALUES (UUID(), ?, ?, ?)',
      [username, email, password_hash]
    );

    // Fetch the inserted user to get their UUID
    const [newUser] = await connection.query('SELECT id, username, email FROM users WHERE email = ?', [email]);
    connection.release();

    const userRecord = newUser[0];

    const payload = {
      user: { id: userRecord.id, username: userRecord.username }
    };

    jwt.sign(payload, jwtSecret, { expiresIn: '24h' }, (err, token) => {
      if (err) throw err;
      res.json({ token, user: userRecord });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Login User
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const connection = await pool.getConnection();
    const [users] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);
    connection.release();

    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid Credentials' });
    }

    const userRecord = users[0];

    const isMatch = await bcrypt.compare(password, userRecord.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid Credentials' });
    }

    const payload = {
      user: { id: userRecord.id, username: userRecord.username }
    };

    jwt.sign(payload, jwtSecret, { expiresIn: '24h' }, (err, token) => {
      if (err) throw err;
      res.json({ token, user: { id: userRecord.id, username: userRecord.username } });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
