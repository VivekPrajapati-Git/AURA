const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true
  },

  sessionId: {
    type: String,
    required: true
  },

  userPrompt: {
    type: String,
    required: true
  },

  userPromptEmbedding: {
    type: [Number], // array of floats for vector search
    default: []
  },

  systemResponse: {
    type: String,
    default: ""
  },

  systemResponseEmbedding: {
    type: [Number], // array of floats for vector search
    default: []
  },

  timestamp: {
    type: Date,
    default: Date.now
  },

  // 🔥 Confidence Layer (VERY IMPORTANT)
  confidence: {
    overall: Number,        // final combined confidence %
    llm: Number,            // LLM confidence %
    intent: Number,         // intent classifier confidence %
    coverage: Number        // how much context was used %
  },

  // ⚖️ Bias
  biasScore: Number, // 0–100 %

  // 📖 Readability
  readability: {
    score: Number,          // 0–100
    level: String           // "Easy", "Medium", "Hard"
  },

  // 🎯 Intent & Reasoning (from AI engine)
  intent: {
    type: String,
    default: ''
  },

  reasoning: {
    type: String,
    default: ''
  },

  neutralizedResponse: {
    type: String,
    default: null
  },

  caveat: {
    type: String,
    default: null
  },

  // 🚦 Reliability
  reliabilityLabel: {
    type: String,
    enum: ['green', 'amber', 'red', ''],
    default: ''
  },

  factualGrounding: {
    type: Number,
    default: 0
  },

  // 🧠 XAI Breakdown — shap tokens from AI engine
  xai: [
    {
      word:   String,   // shap token
      impact: Number,   // 0–100 (shap score * 100)
      risk:   Number,   // placeholder, 0 by default
      label: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'low'
      }
    }
  ],

  // 🔍 Context contributions (what context influenced the response)
  contextContributions: [
    {
      label: String,
      score: Number   // 0.0 – 1.0
    }
  ],

  // 🔗 Sources
  sources: [
    {
      type: {
        type: String,
        enum: ["chat", "external"],
        required: true
      },
      chatId: String,
      messageId: String,
      url: String,
      text: String,
      score: Number // 0–100 %
    }
  ]
});

module.exports = mongoose.model('Message', messageSchema);
