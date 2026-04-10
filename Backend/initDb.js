const { pool } = require('./database/sql_connection');

async function initDb() {
  try {
    const conn = await pool.getConnection();

    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(36) PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          xp_score INT DEFAULT 0,
          level INT DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS sessions (
          id VARCHAR(36) PRIMARY KEY,
          user_id VARCHAR(36) REFERENCES users(id),
          title VARCHAR(255) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          message_count INT DEFAULT 0,
          avg_bias_score FLOAT DEFAULT 0.0
      )
    `);

    console.log("✅ MySQL Tables initialized successfully");
    conn.release();
    process.exit(0);
  } catch (err) {
    console.error("❌ DB Init Failed:", err);
    process.exit(1);
  }
}

initDb();
