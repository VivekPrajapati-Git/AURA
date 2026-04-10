/**
 * AURA Gamification — XP Calculation Service
 *
 * Awards XP after each AI interaction based on the quality of the question
 * and how the AI responded (bias, confidence, grounding, intent).
 *
 * ── Formula ──────────────────────────────────────────────────────────────────
 *   baseXP             = 5   (every question earns at least 5 XP)
 *   biasAwareness      = biasScore > 40 ? 10 : biasScore < 20 ? 5 : 2
 *   confidenceBonus    = Math.ceil(overallConfidence / 100 * 5)   → 0–5
 *   intentBonus        = intent ? 3 : 0
 *   groundingBonus     = factualGrounding > 50 ? 4 : 0
 *   ─────────────────────────────────────────────────────────
 *   totalXP            = baseXP + biasAwareness + confidenceBonus
 *                        + intentBonus + groundingBonus       → 5–27 per message
 *
 *   level              = floor(totalXP / 100) + 1
 * ──────────────────────────────────────────────────────────────────────────────
 */

const { pool } = require('../database/sql_connection');

/**
 * Calculate XP earned for a single AI interaction.
 * All inputs use the 0–100 scale (as stored in MongoDB).
 *
 * @param {object} metrics
 * @param {number} metrics.biasScore       – 0–100
 * @param {number} metrics.confidenceOverall – 0–100
 * @param {string} metrics.intent          – detected intent string
 * @param {number} metrics.factualGrounding – 0–100
 * @returns {{ total: number, breakdown: object }}
 */
function calculateXP({ biasScore = 0, confidenceOverall = 0, intent = '', factualGrounding = 0 }) {
  const baseXP = 5;

  // Bias awareness: high bias means the user discovered a bias — reward learning
  // Low bias means clean question — also good
  // Mid-range gets minimum
  let biasAwareness = 2;
  if (biasScore > 40) biasAwareness = 10;       // "Bias Hunter" territory
  else if (biasScore < 20) biasAwareness = 5;    // Clean, unbiased question

  // Confidence: better questions → higher AI confidence → more XP
  const confidenceBonus = Math.ceil((confidenceOverall / 100) * 5); // 0–5

  // Intent: recognized intent = meaningful query
  const intentBonus = intent && intent.length > 0 ? 3 : 0;

  // Factual grounding: well-grounded answers deserve reward
  const groundingBonus = factualGrounding > 50 ? 4 : 0;

  const total = baseXP + biasAwareness + confidenceBonus + intentBonus + groundingBonus;

  return {
    total,
    breakdown: {
      baseXP,
      biasAwareness,
      confidenceBonus,
      intentBonus,
      groundingBonus,
    },
  };
}

/**
 * Award XP to a user and update their level.
 * Level = floor(totalXP / 100) + 1
 *
 * @param {string} userId – SQL user ID
 * @param {number} xpEarned – XP to add
 * @returns {Promise<{ newXP: number, newLevel: number }>}
 */
async function awardXP(userId, xpEarned) {
  const connection = await pool.getConnection();
  try {
    // Atomically increment XP
    await connection.query(
      "UPDATE users SET xp_score = xp_score + ? WHERE id = ?",
      [xpEarned, userId]
    );

    // Fetch updated XP and compute new level
    const [rows] = await connection.query(
      "SELECT xp_score FROM users WHERE id = ?",
      [userId]
    );

    const newXP = rows[0]?.xp_score || 0;
    const newLevel = Math.floor(newXP / 100) + 1;

    // Update level
    await connection.query(
      "UPDATE users SET level = ? WHERE id = ?",
      [newLevel, userId]
    );

    return { newXP, newLevel };
  } finally {
    connection.release();
  }
}

/**
 * All-in-one: calculate + award XP for a message interaction.
 *
 * @param {string} userId
 * @param {object} aiMetrics – { biasScore, confidence: { overall }, intent, factualGrounding }
 * @returns {Promise<{ xpEarned: number, breakdown: object, newXP: number, newLevel: number }>}
 */
async function processXPForMessage(userId, aiMetrics) {
  const { total, breakdown } = calculateXP({
    biasScore: aiMetrics.biasScore || 0,
    confidenceOverall: aiMetrics.confidence?.overall || 0,
    intent: aiMetrics.intent || '',
    factualGrounding: aiMetrics.factualGrounding || 0,
  });

  const { newXP, newLevel } = await awardXP(userId, total);

  console.log(`[XP] User ${userId}: +${total} XP (total: ${newXP}, level: ${newLevel})`);

  return { xpEarned: total, breakdown, newXP, newLevel };
}

module.exports = { calculateXP, awardXP, processXPForMessage };
