const app = require('./src/app');
const http = require('http');
const { Server } = require('socket.io');
const { setIO } = require('./src/services/socket/socketService');
const pool = require('./src/config/database');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

// ─── Auto-migration: ensure all tables exist ──────────────────────────────────
async function runMigrations() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        email_marketing BOOLEAN DEFAULT true,
        email_activity BOOLEAN DEFAULT true,
        push_messages BOOLEAN DEFAULT true,
        push_mentions BOOLEAN DEFAULT true
      )
    `);
    console.log('[migration] notification_preferences table ready');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        refresh_token_hash TEXT NOT NULL,
        device_label TEXT,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[migration] sessions table ready');
  } catch (err) {
    console.error('[migration] Failed to run migrations:', err.message);
    // Non-fatal — server will still start
  }
}

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server
const clientOrigin = process.env.CLIENT_URL 
  ? process.env.CLIENT_URL.replace(/\/$/, "") 
  : "http://localhost:5173";

const io = new Server(server, {
  cors: {
    origin: clientOrigin,
    credentials: true,
  },
});

// io accessibility
app.set('io', io);
setIO(io);

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('register-user', (userId) => {
    if (!userId) return;
    const room = `user:${userId}`;
    socket.join(room);
    console.log(`[socket] register-user: userId=${userId} joined room=${room} socketId=${socket.id}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Database: ${process.env.DATABASE_URL ? "connected (hidden)" : "missing"}`);
  await runMigrations();
});
