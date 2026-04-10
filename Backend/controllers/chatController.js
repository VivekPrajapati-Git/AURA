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
    const { chatId, text } = req.body;
    const userId = req.user.id;

    // Verify session belongs to user
    const connection = await pool.getConnection();
    const [sessions] = await connection.query("SELECT * FROM sessions WHERE id = ? AND user_id = ?", [chatId, userId]);
    
    if (sessions.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Chat not found or unauthorized' });
    }

    const fakeAiOutput = "I have queried the underlying SQL and MongoDB engines. This is securely mapped through real routing!";

    // Save Unified Message Block to MongoDB
    const newMessageBlock = new Message({
      sessionId: chatId,
      userPrompt: text,
      systemResponse: fakeAiOutput,
      // Defaulting analytics for the AI turn to zeros so it doesn't inflate metrics falsely
      confidence: { overall: 0, llm: 0, intent: 0, coverage: 0 },
      biasScore: 0,
      readability: { score: 0, level: "N/A" }
    });
    
    await newMessageBlock.save();

    // Update SQL message_count & last_active. (User+System = 2 turns technically, but 1 block. Let's add 2 since stats rely on it)
    await connection.query(
      "UPDATE sessions SET message_count = message_count + 2, last_active = CURRENT_TIMESTAMP WHERE id = ?",
      [chatId]
    );
    connection.release();

    res.status(200).json({ 
      message: 'Message Block sent', 
      savedMessage: newMessageBlock 
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

// 5. Update Chat Title
exports.updateChatTitle = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { title } = req.body;
    const userId = req.user.id;

    const connection = await pool.getConnection();
    const [result] = await connection.query(
      "UPDATE sessions SET title = ? WHERE id = ? AND user_id = ?",
      [title, chatId, userId]
    );
    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Chat not found or unauthorized' });
    }

    res.status(200).json({ message: 'Title updated successfully', title });
  } catch (err) {
    res.status(500).json({ error: 'Server Error updating title' });
  }
};

// 6. Delete Chat
exports.deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    const connection = await pool.getConnection();
    const [result] = await connection.query(
      "DELETE FROM sessions WHERE id = ? AND user_id = ?",
      [chatId, userId]
    );
    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Chat not found or unauthorized' });
    }

    // Delete associated messages in MongoDB
    await Message.deleteMany({ sessionId: chatId });

    res.status(200).json({ message: 'Chat deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server Error deleting chat' });
  }
};

// 7. Get Message by ID
exports.getMessageById = async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const message = await Message.findOne({ _id: messageId, sessionId: chatId });
    
    if (!message) return res.status(404).json({ error: 'Message not found' });
    res.status(200).json(message);
  } catch (err) {
    res.status(500).json({ error: 'Server Error fetching message' });
  }
};

// 8. Stream AI Response (SSE)
exports.streamMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { text } = req.body; // user's prompt

    // 1. Create the unified Block with User Prompt initially
    const blockMsg = new Message({ 
      sessionId: chatId, 
      userPrompt: text,
      systemResponse: "",
      confidence: { overall: 0, llm: 0, intent: 0, coverage: 0 },
      biasScore: 0
    });
    await blockMsg.save();

    // 2. Setup Server-Sent Events headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // 3. Simulate AI typing (replace with real LLM stream later)
    const fakeResponse = "This is a simulated streaming response from the AURA system! Your message has been analyzed.".split(" ");
    let partialText = "";

    for (let i = 0; i < fakeResponse.length; i++) {
        partialText += (i === 0 ? "" : " ") + fakeResponse[i];
        res.write(`data: ${JSON.stringify({ chunk: fakeResponse[i] + " " })}\n\n`);
        await new Promise(r => setTimeout(r, 100)); // artificially slow it down
    }

    // 4. Save Final AI Message into the same MongoDB Block Document!
    blockMsg.systemResponse = partialText;
    await blockMsg.save();

    // Tell client we are done
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    res.write('data: [ERROR]\n\n');
    res.end();
  }
};

// 9. Get Message Metrics
exports.getMessageMetrics = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId, 'confidence biasScore readability xai');
    
    if (!message) return res.status(404).json({ error: 'Metrics not found' });
    res.status(200).json(message);
  } catch (err) {
    res.status(500).json({ error: 'Server Error fetching metrics' });
  }
};
