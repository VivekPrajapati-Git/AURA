const Redis = require('ioredis');

// Initialize Redis client for local instance 
const redis = new Redis({
    host: 'localhost',
    port: 6379,
});

/**
 * 1. Live Bias Meter Storage [cite: 187]
 * Updates the composite and 4 sub-scores after every AI inference.
 */
async function updateBiasScore(sessionId, scores) {
    const key = `bias:${sessionId}`;
    // Using a Hash to store sub-scores individually [cite: 187]
    await redis.hset(key, {
        composite: scores.composite,
        toxicity: scores.toxicity,
        gendered_language: scores.gendered_language,
        demographic_parity: scores.demographic_parity,
        privilege_assumption: scores.privilege_assumption
    });
}

/**
 * 2. Session & JWT Cache 
 * Caches session state with a 24-hour Time-to-Live (TTL).
 */
async function cacheSession(sessionId, sessionData) {
    const key = `session:${sessionId}`;
    const TTL = 24 * 60 * 60; // 24 hours in seconds 
    await redis.set(key, JSON.stringify(sessionData), 'EX', TTL);
}

/**
 * 3. Gamification XP Fast-Read [cite: 190]
 * Stores current XP for Dastagir's frontend to access instantly.
 */
async function setUserXP(userId, xpScore) {
    const key = `xp:${userId}`;
    await redis.set(key, xpScore);
}

// Utility to get scores for the live meter polling 
async function getBiasScore(sessionId) {
    return await redis.hgetall(`bias:${sessionId}`);
}

module.exports = {
    redis,
    updateBiasScore,
    cacheSession,
    setUserXP,
    getBiasScore
};