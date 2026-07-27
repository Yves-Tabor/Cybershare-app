const { Pool } = require('pg');
require('dotenv').config();

// Log which DB we're connecting to (hide credentials)
const dbUrl = process.env.DATABASE_URL || null;
if (dbUrl) {
  try {
    const u = new URL(dbUrl);
    console.log(`[DB] Connecting to: ${u.hostname} (pooler: ${u.hostname.includes('pooler')})`);
    // Warn if channel_binding is set — pg driver hangs on channel_binding=require
    if (u.searchParams.get('channel_binding') === 'require') {
      console.warn('[DB] WARNING: channel_binding=require detected — this causes pg driver to hang! Removing it.');
      u.searchParams.delete('channel_binding');
      process.env.DATABASE_URL = u.toString();
    }
  } catch (e) { /* ignore parse errors */ }
}

// Use DATABASE_URL if available (Neon), otherwise use individual parameters
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || null,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 60000,  // 60s for Neon free tier wake-up
  statement_timeout: 30000,        // kill any query that runs > 30s
  query_timeout: 30000,            // belt-and-suspenders
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Don't exit — let the app continue serving non-DB routes
});

module.exports = pool;

