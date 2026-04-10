const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true
  },

  role: {
    type: String,
    enum: ["user", "system"],
    required: true
  },

  text: {
    type: String,
    required: true
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

  // 🧠 XAI Breakdown (UPDATED)
  xai: [
    {
      word: String,
      impact: Number,       // 0–100 %
      risk: Number,         // 0–100 %
      label: {
        type: String,
        enum: ["low", "medium", "high"]
      }
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
