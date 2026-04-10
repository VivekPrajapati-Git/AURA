const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.SQL_HOST || 'localhost',
  user: process.env.SQL_USER || 'root',
  password: process.env.SQL_PASSWORD || 'root',
  database: process.env.SQL_DATABASE || 'aura',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool.getConnection()
  .then(connection => {
    console.log('MySQL Connected Successfully');
    connection.release();
  })
  .catch(err => {
    console.error('Error acquiring client for MySQL connection. Check if MySQL is running!', err.message);
  });

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
