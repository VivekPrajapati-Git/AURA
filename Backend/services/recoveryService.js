/**
 * MongoDB → SQL Session Recovery Service
 *
 * If the SQL `sessions` table is empty (e.g. after accidental deletion),
 * this service rebuilds it from the MongoDB `messages` collection.
 *
 * Each MongoDB message has a `sessionId` field linking it to a session.
 * We aggregate all unique sessionIds, compute stats, and re-insert them.
 */

const mongoose = require('mongoose');
const { pool } = require('../database/sql_connection');
const Message = require('../models/Message');

/**
 * Recover sessions table from MongoDB messages.
 * - Finds all distinct sessionIds
 * - For each session: counts messages, finds first/last timestamp, first prompt as title
 * - Inserts into SQL sessions if row doesn't already exist
 *
 * @param {string} [defaultUserId] – fallback user_id when we can't determine ownership
 * @returns {Promise<{recovered: number, skipped: number}>}
 */
async function recoverSessionsFromMongo(defaultUserId = null) {
  // Wait for MongoDB to be connected
  if (mongoose.connection.readyState !== 1) {
    console.log('[Recovery] MongoDB not yet connected, skipping recovery.');
    return { recovered: 0, skipped: 0 };
  }

  const connection = await pool.getConnection();

  try {
    // 1. Check if sessions table is empty
    const [countResult] = await connection.query('SELECT COUNT(*) as cnt FROM sessions');
    const sessionCount = countResult[0].cnt;

    if (sessionCount > 0) {
      console.log(`[Recovery] Sessions table has ${sessionCount} rows — no recovery needed.`);
      connection.release();
      return { recovered: 0, skipped: 0 };
    }

    console.log('[Recovery] Sessions table is EMPTY — starting MongoDB recovery...');

    // 2. If no defaultUserId provided, grab the first user from SQL
    if (!defaultUserId) {
      const [users] = await connection.query('SELECT id FROM users LIMIT 1');
      if (users.length === 0) {
        console.log('[Recovery] No users in SQL either — cannot recover. Skipping.');
        connection.release();
        return { recovered: 0, skipped: 0 };
      }
      defaultUserId = users[0].id;
    }

    // 3. Aggregate distinct sessions from MongoDB
    const sessions = await Message.aggregate([
      {
        $group: {
          _id: '$sessionId',
          messageCount: { $sum: 2 },  // each doc is 1 block = user+assistant = 2 messages
          firstTimestamp: { $min: '$timestamp' },
          lastTimestamp: { $max: '$timestamp' },
          firstPrompt: { $first: '$userPrompt' },
          avgBias: { $avg: '$biasScore' },
        }
      },
      { $sort: { lastTimestamp: -1 } }
    ]);

    let recovered = 0;
    let skipped = 0;

    for (const s of sessions) {
      const sessionId = s._id;
      if (!sessionId) { skipped++; continue; }

      // Check if session already exists in SQL (in case of partial recovery)
      const [existing] = await connection.query('SELECT id FROM sessions WHERE id = ?', [sessionId]);
      if (existing.length > 0) { skipped++; continue; }

      const title = (s.firstPrompt || 'AURA Chat').substring(0, 50);
      const avgBias = (s.avgBias || 0) / 100; // MongoDB stores 0-100, SQL stores 0-1

      await connection.query(
        `INSERT INTO sessions (id, user_id, title, created_at, last_active, message_count, avg_bias_score)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          defaultUserId,
          title,
          s.firstTimestamp || new Date(),
          s.lastTimestamp || new Date(),
          s.messageCount || 0,
          avgBias,
        ]
      );
      recovered++;
    }

    console.log(`[Recovery] ✅ Recovered ${recovered} sessions from MongoDB (${skipped} skipped).`);
    return { recovered, skipped };

  } catch (err) {
    console.error('[Recovery] ❌ Error during recovery:', err.message);
    return { recovered: 0, skipped: 0 };
  } finally {
    connection.release();
  }
}

module.exports = { recoverSessionsFromMongo };
