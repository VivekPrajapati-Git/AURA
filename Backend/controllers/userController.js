const { pool } = require('../database/sql_connection');
const Message = require('../models/Message');

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

// 11. Full User Profile (for /user page)
exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const connection = await pool.getConnection();

    // 1. User info
    const [userRows] = await connection.query(
      "SELECT id, username, email, xp_score, level, created_at FROM users WHERE id = ?",
      [userId]
    );
    if (userRows.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userRows[0];

    // 2. Session aggregate
    const [sessionAgg] = await connection.query(
      "SELECT COUNT(*) as chat_count, SUM(message_count) as total_messages, AVG(avg_bias_score) as overall_bias FROM sessions WHERE user_id = ?",
      [userId]
    );

    // 3. Recent chats (top 5)
    const [recentChats] = await connection.query(
      "SELECT id, title, message_count, last_active, created_at FROM sessions WHERE user_id = ? ORDER BY last_active DESC LIMIT 5",
      [userId]
    );

    connection.release();

    // 4. Count bias alerts from MongoDB (messages where biasScore > 40)
    let biasAlerts = 0;
    try {
      biasAlerts = await Message.countDocuments({
        sessionId: { $in: recentChats.map(c => c.id) },
        biasScore: { $gt: 40 }
      });
    } catch { /* MongoDB may be unreachable — don't crash */ }

    // 5. Compute trust level from XP
    const xp = user.xp_score || 0;
    let trustLevel = 'Beginner';
    if (xp >= 500) trustLevel = 'Expert';
    else if (xp >= 200) trustLevel = 'Advanced';
    else if (xp >= 50) trustLevel = 'Intermediate';

    // 6. Compute badges based on user activity
    const badges = [];
    const totalMsgs = sessionAgg[0].total_messages || 0;
    const chatCount = sessionAgg[0].chat_count || 0;
    if (chatCount >= 1) badges.push({ name: 'Explorer', desc: 'Started your first AURA conversation' });
    if (biasAlerts >= 1) badges.push({ name: 'Bias Hunter', desc: 'Encountered a bias-flagged response' });
    if (totalMsgs >= 10) badges.push({ name: 'Trust Builder', desc: 'Sent 10+ messages to AURA' });
    if (xp >= 100) badges.push({ name: 'XP Rising', desc: 'Earned 100+ XP' });
    if (chatCount >= 5) badges.push({ name: 'Power User', desc: 'Created 5+ chat sessions' });

    res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        xp: xp,
        level: user.level || 1,
        trustLevel,
        created_at: user.created_at,
      },
      stats: {
        chatCount,
        totalMessages: totalMsgs,
        overallBias: Math.round((sessionAgg[0].overall_bias || 0) * 100) / 100,
        biasAlerts,
      },
      badges,
      recentChats: recentChats.map(c => ({
        id: c.id,
        title: c.title || 'AURA Chat',
        messageCount: c.message_count,
        lastActive: c.last_active,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error fetching profile' });
  }
};
