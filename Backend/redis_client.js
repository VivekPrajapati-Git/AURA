const Redis = require('ioredis'); // [cite: 165]

const redis = new Redis({
    host: 'localhost',
    port: 6379
});

/**
 * Strategy for Redis Keys in AURA:
 * 1. bias:{session_id} -> Hash for live meter [cite: 187]
 * 2. session:{session_id} -> Cache for JWT/state (TTL: 24h) [cite: 189]
 * 3. xp:{user_id} -> Fast read for XP animations [cite: 190]
 */

async function testRedis() {
    await redis.set('aura_status', 'ready');
    const status = await redis.get('aura_status');
    console.log(`Redis Connection: ${status} `);
}

testRedis();

module.exports = redis;