require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  max: 20,
  min: 5,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 8000,
});

pool.on('error', (err) => {
  console.error('[PG] Unexpected idle client error:', err.message);
});

// Warm up connection pool
pool.connect().then(client => {
  client.release();
  console.log('[PG] Pool warmed up');
}).catch(err => {
  console.error('[PG] Error warming up pool:', err.message);
});

module.exports = pool;
