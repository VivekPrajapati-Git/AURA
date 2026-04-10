const { pool } = require('../database/sql_connection');
const Message = require('../models/Message');

// 1. Create New Chat (Session)
exports.createChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const connection = await pool.getConnection();

    // Insert to SQL sessions table
    const [result] = await connection.query(
      `INSERT INTO sessions (id, user_id, message_count) VALUES (UUID(), ?, 0)`,
      [userId]
    );

    // Fetch the newly created session id safely using LAST_INSERT_ID() if it was an Int, 
    // but since we used UUID(), we can't easily retrieve it without reading the latest record. 
    // Better pattern for UUID in MySQL: Generate in JS or read latest.
    // Let's generate it in JS to guarantee we have it:
    
    // Instead of above query, we'll generate the UUID first (or fallback to getting latest)
    connection.release();
    
    // To strictly support MySQL UUID natively without JS UUID generation:
    const conn2 = await pool.getConnection();
    const [rows] = await conn2.query("SELECT id FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1", [userId]);
    conn2.release();

    res.status(201).json({ 
      message: 'Chat created successfully', 
      chatId: rows[0].id 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error creating chat' });
  }
};

// 2. Send Message
exports.sendMessage = async (req, res) => {
  try {
    const { chatId, text, role } = req.body;
    const userId = req.user.id;

    // Verify session belongs to user
    const connection = await pool.getConnection();
    const [sessions] = await connection.query("SELECT * FROM sessions WHERE id = ? AND user_id = ?", [chatId, userId]);
    
    if (sessions.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Chat not found or unauthorized' });
    }

    // Save message to MongoDB
    const newMessage = new Message({
      sessionId: chatId,
      role: role || "user",
      text: text,
      // Defaulting analytics for now
      confidence: { overall: 95, llm: 90, intent: 99, coverage: 100 },
      biasScore: 5,
      readability: { score: 80, level: "Easy" }
    });
    
    await newMessage.save();

    // Update SQL message_count & last_active
    await connection.query(
      "UPDATE sessions SET message_count = message_count + 1, last_active = CURRENT_TIMESTAMP WHERE id = ?",
      [chatId]
    );
    connection.release();

    res.status(200).json({ 
      message: 'Message sent', 
      savedMessage: newMessage 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error sending message' });
  }
};

// 3. Get Single Chat (Messages)
exports.getChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    // Verify ownership in SQL
    const connection = await pool.getConnection();
    const [sessions] = await connection.query("SELECT * FROM sessions WHERE id = ? AND user_id = ?", [chatId, userId]);
    connection.release();

    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Fetch message history from MongoDB
    const messages = await Message.find({ sessionId: chatId }).sort({ timestamp: 1 });

    res.status(200).json({
      sessionDetails: sessions[0],
      messages
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error fetching chat' });
  }
};

// 4. Get All Chats (Sidebar)
exports.getUserChats = async (req, res) => {
  try {
    const requestedUserId = req.params.userId;
    // Security check: ensure requesting user matches
    if (requestedUserId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to view these chats' });
    }

    const connection = await pool.getConnection();
    const [sessions] = await connection.query(
      "SELECT id, created_at, last_active, message_count FROM sessions WHERE user_id = ? ORDER BY last_active DESC",
      [requestedUserId]
    );
    connection.release();

    res.status(200).json({ chats: sessions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error fetching chat list' });
  }
};
