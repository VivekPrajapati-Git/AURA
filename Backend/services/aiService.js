const axios = require('axios');

// Python FastAPI AI engine URL — set AI_ENGINE_URL in .env
const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';

/**
 * Call the Python AI engine with the user's message + conversation history.
 *
 * @param {object} params
 * @param {string} params.message       - The current user message
 * @param {string} params.sessionId     - The chat session ID (used as session_id in AI request)
 * @param {Array}  params.history       - Array of { role, content } history turns
 * @param {object} [params.userContext] - Optional user context (skills, goals, etc.)
 * @returns {Promise<object>}           - Full InferResponse from the AI engine
 */
const callAI = async ({ message, sessionId, history = [], userContext = {} }) => {
  const payload = {
    message,
    session_id: sessionId,
    history,           // [{ role: "user"|"assistant", content: "..." }, ...]
    user_context: {
      skills:      userContext.skills      || [],
      goals:       userContext.goals       || [],
      constraints: userContext.constraints || [],
      location:    userContext.location    || '',
      preferences: userContext.preferences || {},
    },
  };

  try {
    const response = await axios.post(`${AI_ENGINE_URL}/ai/infer`, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000, // 30s — enough for a real LLM call
    });
    return response.data; // InferResponse object
  } catch (err) {
    // Surface a clear error so chatController can handle it gracefully
    const detail = err.response?.data?.detail || err.message || 'AI engine unreachable';
    throw new Error(`AI Engine Error: ${detail}`);
  }
};

/**
 * Build conversation history from MongoDB message documents.
 * Each MongoDB doc is a unified block (userPrompt + systemResponse).
 * We unpack it into the [{role, content}] format the Python engine expects.
 *
 * @param {Array} messageDocs - Array of Mongoose Message documents
 * @param {number} [limit=10] - Max number of turns (pairs) to include
 * @returns {Array<{role: string, content: string}>}
 */
const buildHistory = (messageDocs = [], limit = 10) => {
  // Take the most recent `limit` docs (pairs), oldest first
  const recent = messageDocs.slice(-limit);
  const turns = [];
  for (const doc of recent) {
    if (doc.userPrompt)    turns.push({ role: 'user',      content: doc.userPrompt });
    if (doc.systemResponse) turns.push({ role: 'assistant', content: doc.systemResponse });
  }
  return turns;
};

module.exports = { callAI, buildHistory };
