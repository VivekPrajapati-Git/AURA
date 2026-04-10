const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.PG_USER || 'postgres',
  host: process.env.PG_HOST || 'localhost',
  database: process.env.PG_DATABASE || 'aura',
  password: process.env.PG_PASSWORD || 'postgres',
  port: process.env.PG_PORT || 5432,
});

pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client for PostgreSQL connection', err.stack);
  }
  console.log('PostgreSQL Connected Successfully');
  release();
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
