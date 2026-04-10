const { pool } = require('../database/sql_connection');
const Message = require('../models/Message');
const { callAI, buildHistory } = require('../services/aiService');


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
    connection.release();

    // ── Build conversation history for AI context ──────────────────────────────
    const recentDocs = await Message.find({ sessionId: chatId }).sort({ timestamp: 1 }).limit(20);
    const history = buildHistory(recentDocs); // [{role, content}, ...]

    // ── Call Python AI Engine ──────────────────────────────────────────────────
    let aiResult;
    try {
      aiResult = await callAI({ message: text, sessionId: chatId, history });
    } catch (aiErr) {
      console.error('[AI Engine Error]', aiErr.message);
      return res.status(502).json({ error: aiErr.message });
    }

    // ── Map InferResponse → XAI array for MongoDB ──────────────────────────────
    const xaiMapped = (aiResult.xai_data?.shap_tokens || []).map(t => ({
      word:   t.token,
      impact: Math.round(Math.abs(t.score) * 100),
      risk:   0,
      label:  Math.abs(t.score) > 0.3 ? 'high' : Math.abs(t.score) > 0.1 ? 'medium' : 'low'
    }));

    const contextContribs = (aiResult.xai_data?.context_contributions || []).map(c => ({
      label: c.label,
      score: c.score
    }));

    // ── Save Unified Message Block to MongoDB ──────────────────────────────────
    const newMessageBlock = new Message({
      sessionId:    chatId,
      userPrompt:   text,
      systemResponse: aiResult.response,

      // Confidence  (AI returns 0–1 floats, we store 0–100)
      confidence: {
        overall:  Math.round((aiResult.reliability?.overall         || 0) * 100),
        llm:      Math.round((aiResult.reliability?.llm_confidence  || 0) * 100),
        intent:   Math.round((aiResult.reliability?.intent_confidence || 0) * 100),
        coverage: Math.round((aiResult.reliability?.factual_grounding || 0) * 100),
      },

      // Bias  (composite is 0–1 → store as 0–100)
      biasScore: Math.round((aiResult.bias_score?.composite || 0) * 100),

      // Intent & explanation
      intent:    aiResult.intent    || '',
      reasoning: aiResult.reasoning || '',
      neutralizedResponse: aiResult.neutralized_response || null,
      caveat:               aiResult.caveat              || null,

      // Reliability
      reliabilityLabel: aiResult.reliability?.label        || '',
      factualGrounding: Math.round((aiResult.reliability?.factual_grounding || 0) * 100),

      // XAI
      xai:                 xaiMapped,
      contextContributions: contextContribs,
    });
    
    await newMessageBlock.save();

    // ── Update SQL session stats ────────────────────────────────────────────────
    const conn2 = await pool.getConnection();
    await conn2.query(
      "UPDATE sessions SET message_count = message_count + 2, last_active = CURRENT_TIMESTAMP WHERE id = ?",
      [chatId]
    );
    conn2.release();

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

// 8. Stream AI Response (SSE) — real AI call, wrapped in SSE
exports.streamMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { text } = req.body;
    const userId = req.user?.id;

    // 1. Setup SSE headers immediately so client knows streaming has started
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // 2. Create a placeholder Message block (empty systemResponse while AI thinks)
    const blockMsg = new Message({ 
      sessionId: chatId, 
      userPrompt: text,
      systemResponse: '',
      confidence: { overall: 0, llm: 0, intent: 0, coverage: 0 },
      biasScore: 0
    });
    await blockMsg.save();

    // 3. Build history for context
    const recentDocs = await Message.find({ sessionId: chatId }).sort({ timestamp: 1 }).limit(20);
    const history = buildHistory(recentDocs);

    // 4. Call AI engine (non-streaming for now — simulate token stream from full response)
    let aiResult;
    try {
      aiResult = await callAI({ message: text, sessionId: chatId, history });
    } catch (aiErr) {
      res.write(`data: ${JSON.stringify({ error: aiErr.message })}\n\n`);
      res.write('data: [ERROR]\n\n');
      res.end();
      return;
    }

    // 5. Simulate token streaming from the real AI response
    const words = aiResult.response.split(' ');
    let partialText = '';
    for (let i = 0; i < words.length; i++) {
      const chunk = (i === 0 ? '' : ' ') + words[i];
      partialText += chunk;
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      await new Promise(r => setTimeout(r, 30)); // ~30ms per word
    }

    // 6. Map fields and persist the complete block
    const xaiMapped = (aiResult.xai_data?.shap_tokens || []).map(t => ({
      word:   t.token,
      impact: Math.round(Math.abs(t.score) * 100),
      risk:   0,
      label:  Math.abs(t.score) > 0.3 ? 'high' : Math.abs(t.score) > 0.1 ? 'medium' : 'low'
    }));

    blockMsg.systemResponse        = aiResult.response;
    blockMsg.reasoning             = aiResult.reasoning || '';
    blockMsg.intent                = aiResult.intent    || '';
    blockMsg.neutralizedResponse   = aiResult.neutralized_response || null;
    blockMsg.caveat                = aiResult.caveat    || null;
    blockMsg.reliabilityLabel      = aiResult.reliability?.label || '';
    blockMsg.factualGrounding      = Math.round((aiResult.reliability?.factual_grounding || 0) * 100);
    blockMsg.confidence = {
      overall:  Math.round((aiResult.reliability?.overall            || 0) * 100),
      llm:      Math.round((aiResult.reliability?.llm_confidence     || 0) * 100),
      intent:   Math.round((aiResult.reliability?.intent_confidence  || 0) * 100),
      coverage: Math.round((aiResult.reliability?.factual_grounding  || 0) * 100),
    };
    blockMsg.biasScore             = Math.round((aiResult.bias_score?.composite || 0) * 100);
    blockMsg.xai                   = xaiMapped;
    blockMsg.contextContributions  = (aiResult.xai_data?.context_contributions || []);
    await blockMsg.save();

    // 7. Send final metadata so client can update metrics without a refetch
    res.write(`data: ${JSON.stringify({ done: true, messageId: blockMsg._id, metrics: {
      confidence:           blockMsg.confidence,
      biasScore:            blockMsg.biasScore,
      intent:               blockMsg.intent,
      reasoning:            blockMsg.reasoning,
      reliabilityLabel:     blockMsg.reliabilityLabel,
      factualGrounding:     blockMsg.factualGrounding,
      neutralizedResponse:  blockMsg.neutralizedResponse,
      caveat:               blockMsg.caveat,
      xai:                  blockMsg.xai,
      contextContributions: blockMsg.contextContributions,
    }})}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('[streamMessage error]', err);
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
