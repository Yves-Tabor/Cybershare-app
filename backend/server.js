// Trigger comment for nodemon reload
const app = require('./src/app');
const http = require('http');
const { Server } = require('socket.io');
const { setIO } = require('./src/services/socket/socketService');
const pool = require('./src/config/database');
const { startWorker, stopWorker } = require('./src/services/workerService');
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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS scan_jobs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_url VARCHAR(500) NOT NULL,
        target_hostname VARCHAR(255),
        target_ip INET,
        status VARCHAR(50) DEFAULT 'queued',
        queue_job_id VARCHAR(255),
        priority INTEGER DEFAULT 0,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        failed_at TIMESTAMP,
        security_score INTEGER,
        total_findings INTEGER DEFAULT 0,
        critical_findings INTEGER DEFAULT 0,
        high_findings INTEGER DEFAULT 0,
        medium_findings INTEGER DEFAULT 0,
        low_findings INTEGER DEFAULT 0,
        info_findings INTEGER DEFAULT 0,
        error_message TEXT,
        error_code VARCHAR(50),
        scan_type VARCHAR(50) DEFAULT 'standard',
        scan_options JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Backfill missing columns in scan_jobs (pre-existing tables from older schemas)
    const scanJobsCols = [
      ['user_id', 'INTEGER'],
      ['target_hostname', 'VARCHAR(255)'],
      ['target_ip', 'INET'],
      ['queue_job_id', 'VARCHAR(255)'],
      ['priority', 'INTEGER DEFAULT 0'],
      ['retry_count', 'INTEGER DEFAULT 0'],
      ['max_retries', 'INTEGER DEFAULT 3'],
      ['queued_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'],
      ['started_at', 'TIMESTAMP'],
      ['completed_at', 'TIMESTAMP'],
      ['failed_at', 'TIMESTAMP'],
      ['security_score', 'INTEGER'],
      ['total_findings', 'INTEGER DEFAULT 0'],
      ['critical_findings', 'INTEGER DEFAULT 0'],
      ['high_findings', 'INTEGER DEFAULT 0'],
      ['medium_findings', 'INTEGER DEFAULT 0'],
      ['low_findings', 'INTEGER DEFAULT 0'],
      ['info_findings', 'INTEGER DEFAULT 0'],
      ['error_message', 'TEXT'],
      ['error_code', 'VARCHAR(50)'],
      ['scan_type', 'VARCHAR(50) DEFAULT \'standard\''],
      ['scan_options', 'JSONB DEFAULT \'{}\''],
      ['updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'],
    ];
    for (const [col, type] of scanJobsCols) {
      await pool.query(`ALTER TABLE scan_jobs ADD COLUMN IF NOT EXISTS ${col} ${type}`);
    }
    // Relax NOT NULL on user_id for rows created by older pipeline code
    await pool.query(`ALTER TABLE scan_jobs ALTER COLUMN user_id DROP NOT NULL`).catch(() => { });
    console.log('[migration] scan_jobs table ready');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS scan_targets (
        id SERIAL PRIMARY KEY,
        scan_job_id INTEGER NOT NULL REFERENCES scan_jobs(id) ON DELETE CASCADE,
        url VARCHAR(500) NOT NULL,
        hostname VARCHAR(255) NOT NULL,
        ip_address INET,
        port INTEGER,
        is_valid BOOLEAN DEFAULT false,
        validation_method VARCHAR(50),
        is_reachable BOOLEAN DEFAULT false,
        protocol VARCHAR(10),
        http_status INTEGER,
        http_server VARCHAR(255),
        content_type VARCHAR(255),
        content_length BIGINT,
        response_time_ms INTEGER,
        technologies JSONB DEFAULT '[]',
        is_localhost BOOLEAN DEFAULT false,
        is_private_ip BOOLEAN DEFAULT false,
        is_reserved_ip BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(scan_job_id, url)
      )
    `);
    console.log('[migration] scan_targets table ready');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS scan_results (
        id SERIAL PRIMARY KEY,
        scan_job_id INTEGER NOT NULL REFERENCES scan_jobs(id) ON DELETE CASCADE,
        scanner_name VARCHAR(50),
        scanner_stage VARCHAR(50),
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        duration_ms INTEGER,
        success BOOLEAN DEFAULT false,
        findings_count INTEGER DEFAULT 0,
        raw_output TEXT,
        raw_output_path VARCHAR(500),
        parsed_data JSONB DEFAULT '{}',
        error_message TEXT,
        exit_code INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Backfill any missing columns from older schema versions
    const scanResultsCols = [
      ['scanner_name', 'VARCHAR(50)'],
      ['scanner_stage', 'VARCHAR(50)'],
      ['started_at', 'TIMESTAMP'],
      ['completed_at', 'TIMESTAMP'],
      ['duration_ms', 'INTEGER'],
      ['success', 'BOOLEAN DEFAULT false'],
      ['findings_count', 'INTEGER DEFAULT 0'],
      ['raw_output', 'TEXT'],
      ['raw_output_path', 'VARCHAR(500)'],
      ['parsed_data', "JSONB DEFAULT '{}'"],
      ['error_message', 'TEXT'],
      ['exit_code', 'INTEGER'],
    ];
    for (const [col, type] of scanResultsCols) {
      await pool.query(`ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS ${col} ${type}`);
    }
    // Rename legacy scan_id → scan_job_id if needed
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='scan_results' AND column_name='scan_id'
        ) THEN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='scan_results' AND column_name='scan_job_id'
          ) THEN
            ALTER TABLE scan_results RENAME COLUMN scan_id TO scan_job_id;
          ELSE
            -- Both exist: copy scan_id values into scan_job_id where null, then drop scan_id
            UPDATE scan_results SET scan_job_id = scan_id WHERE scan_job_id IS NULL;
            ALTER TABLE scan_results DROP COLUMN scan_id;
          END IF;
        END IF;
      END $$;
    `);
    // Drop obsolete columns from scan_results if they exist
    const obsoleteResultsCols = ['category', 'severity', 'title', 'description', 'recommendation'];
    for (const col of obsoleteResultsCols) {
      await pool.query(`ALTER TABLE scan_results DROP COLUMN IF EXISTS ${col} CASCADE`).catch(() => { });
    }
    console.log('[migration] scan_results table ready');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS scan_findings (
        id SERIAL PRIMARY KEY,
        scan_job_id INTEGER NOT NULL REFERENCES scan_jobs(id) ON DELETE CASCADE,
        scan_result_id INTEGER REFERENCES scan_results(id) ON DELETE CASCADE,
        category VARCHAR(50),
        severity VARCHAR(20),
        title VARCHAR(255),
        description TEXT,
        recommendation TEXT,
        scanner_name VARCHAR(50),
        template_id VARCHAR(255),
        cve_id VARCHAR(50),
        cvss_score DECIMAL(3,1),
        target_url VARCHAR(500),
        port INTEGER,
        path VARCHAR(500),
        metadata JSONB DEFAULT '{}',
        finding_refs TEXT[],
        is_false_positive BOOLEAN DEFAULT false,
        is_resolved BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Backfill any missing columns in scan_findings
    const scanFindingsCols = [
      ['scan_job_id', 'INTEGER'],
      ['scan_result_id', 'INTEGER'],
      ['category', 'VARCHAR(50)'],
      ['severity', 'VARCHAR(20)'],
      ['title', 'VARCHAR(255)'],
      ['description', 'TEXT'],
      ['recommendation', 'TEXT'],
      ['scanner_name', 'VARCHAR(50)'],
      ['template_id', 'VARCHAR(255)'],
      ['cve_id', 'VARCHAR(50)'],
      ['cvss_score', 'DECIMAL(3,1)'],
      ['target_url', 'VARCHAR(500)'],
      ['port', 'INTEGER'],
      ['path', 'VARCHAR(500)'],
      ['metadata', "JSONB DEFAULT '{}'"],
      ['finding_refs', 'TEXT[]'],
      ['is_false_positive', 'BOOLEAN DEFAULT false'],
      ['is_resolved', 'BOOLEAN DEFAULT false'],
    ];
    for (const [col, type] of scanFindingsCols) {
      await pool.query(`ALTER TABLE scan_findings ADD COLUMN IF NOT EXISTS ${col} ${type}`);
    }
    // Rename legacy scan_id → scan_job_id if needed
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='scan_findings' AND column_name='scan_id'
        ) THEN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='scan_findings' AND column_name='scan_job_id'
          ) THEN
            ALTER TABLE scan_findings RENAME COLUMN scan_id TO scan_job_id;
          ELSE
            UPDATE scan_findings SET scan_job_id = scan_id WHERE scan_job_id IS NULL;
            ALTER TABLE scan_findings DROP COLUMN scan_id;
          END IF;
        END IF;
      END $$;
    `);
    console.log('[migration] scan_findings table ready');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS scan_progress (
        id SERIAL PRIMARY KEY,
        scan_job_id INTEGER NOT NULL REFERENCES scan_jobs(id) ON DELETE CASCADE,
        stage_name VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        progress_percentage INTEGER DEFAULT 0,
        current_step VARCHAR(255),
        total_steps INTEGER,
        completed_steps INTEGER DEFAULT 0,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        duration_ms INTEGER,
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(scan_job_id, stage_name)
      )
    `);
    console.log('[migration] scan_progress table ready');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS scan_logs (
        id SERIAL PRIMARY KEY,
        scan_job_id INTEGER NOT NULL REFERENCES scan_jobs(id) ON DELETE CASCADE,
        level VARCHAR(20) NOT NULL,
        stage VARCHAR(50),
        message TEXT NOT NULL,
        context JSONB DEFAULT '{}',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[migration] scan_logs table ready');

    // Allow NULL password_hash for Google users
    await pool.query(`
      ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
    `);
    console.log('[migration] password_hash dropped NOT NULL constraint');

    // Add deleted_at column for soft delete
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
    `);
    console.log('[migration] deleted_at column added to users table');

    // Add user profile columns if they don't exist
    const userProfileCols = [
      ['display_name', 'VARCHAR(50)'],
      ['avatar_color', 'VARCHAR(7)'],
      ['avatar', 'TEXT'],
      ['bio', 'TEXT'],
      ['password_changed_at', 'TIMESTAMP'],
    ];
    for (const [col, type] of userProfileCols) {
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col} ${type}`);
    }
    console.log('[migration] user profile columns added to users table');
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
  console.log(`Database: ${process.env.DATABASE_URL ? 'configured' : 'MISSING — set DATABASE_URL'}`);

  // Quick connectivity check before running migrations
  try {
    await pool.query('SELECT 1');
    console.log('[DB] Connection verified ✓');
    await runMigrations();
  } catch (err) {
    console.error('[DB] Cannot reach database:', err.message);
    console.error('[DB] Server will continue but DB-dependent routes will fail.');
    console.error('[DB] Check your Neon project at https://console.neon.tech — it may be suspended or the endpoint changed.');
  }

  // Start the BullMQ worker in-process
  console.log('[Worker] Starting scan worker in-process...');
  try {
    await startWorker();
    console.log('[Worker] Scan worker started successfully');
  } catch (err) {
    console.error('[Worker] Failed to start scan worker:', err.message);
    console.error('[Worker] Scan features will not be available');
  }
});

// Graceful shutdown handling
const shutdown = async (signal) => {
  console.log(`[Server] Received ${signal}, shutting down gracefully...`);

  // Set a timeout for graceful shutdown
  const shutdownTimeout = setTimeout(() => {
    console.error('[Server] Shutdown timeout, forcing exit');
    process.exit(1);
  }, 30000); // 30 second timeout

  try {
    // Stop the BullMQ worker
    await stopWorker();

    // Close database connections
    await pool.end();

    clearTimeout(shutdownTimeout);
    console.log('[Server] Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('[Server] Error during shutdown:', error);
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
