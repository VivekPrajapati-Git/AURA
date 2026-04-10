const { pool } = require('../database/sql_connection');

// 10. Gamification User Stats
exports.getUserStats = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Security check
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized viewing of stats' });
    }

    const connection = await pool.getConnection();
    
    // Fetch user details
    const [userRows] = await connection.query(
      "SELECT xp_score, level FROM users WHERE id = ?",
      [userId]
    );

    if (userRows.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch aggregate sessions details
    const [sessionAgg] = await connection.query(
      "SELECT SUM(message_count) as total_messages, AVG(avg_bias_score) as overall_bias FROM sessions WHERE user_id = ?",
      [userId]
    );
    
    connection.release();

    const stats = {
      xp_score: userRows[0].xp_score,
      level: userRows[0].level,
      total_messages: sessionAgg[0].total_messages || 0,
      overall_bias: sessionAgg[0].overall_bias || 0
    };

    res.status(200).json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error fetching user stats' });
  }
};
