const { createClient } = require('redis');

const pub = createClient({ url: process.env.REDIS_URL });
const sub = pub.duplicate(); 

async function connectRedis() {
  await pub.connect();
  await sub.connect();
  console.log('✅ Redis connected (pub + sub)');
}

// Handle errors without crashing
pub.on('error', (err) => console.error('❌ Redis pub error:', err.message));
sub.on('error', (err) => console.error('❌ Redis sub error:', err.message));

module.exports = { pub, sub, connectRedis };