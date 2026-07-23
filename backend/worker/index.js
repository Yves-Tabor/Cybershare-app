const { Worker } = require('bullmq');
const Redis = require('ioredis');
const { processScanJob } = require('./pipeline/scanPipeline');
const { scanLogger } = require('../src/utils/logger');
require('dotenv').config();

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB) || 0,
  maxRetriesPerRequest: null,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
};

let connection = null;
let scanWorker = null;

// Worker configuration
const SCAN_QUEUE_NAME = 'scan-jobs';
const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY) || 2;

// Initialize Redis connection and worker
async function startWorker() {
  try {
    connection = new Redis(redisConfig);

    connection.on('connect', () => {
      scanLogger.info('[Worker] Redis connected');
    });

    connection.on('error', (err) => {
      scanLogger.error('[Worker] Redis connection error:', err);
    });

    // Wait for connection with timeout
    await Promise.race([
      new Promise((resolve) => {
        connection.on('ready', resolve);
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connection timeout')), 5000))
    ]);

    // Create the scan worker
    scanWorker = new Worker(
      SCAN_QUEUE_NAME,
      async (job) => {
        scanLogger.info(`[Worker] Processing job ${job.id}`, {
          jobId: job.id,
          data: job.data,
        });

        try {
          await processScanJob(job);
          scanLogger.info(`[Worker] Job ${job.id} completed successfully`);
        } catch (error) {
          scanLogger.error(`[Worker] Job ${job.id} failed:`, error);
          throw error; // Re-throw to let BullMQ handle retries
        }
      },
      {
        connection,
        concurrency: WORKER_CONCURRENCY,
        limiter: {
          max: parseInt(process.env.MAX_CONCURRENT_SCANS) || 5,
          duration: 60000, // 1 minute
        },
      }
    );

    // Worker event handlers
    scanWorker.on('completed', (job) => {
      scanLogger.info(`[Worker] Job ${job.id} completed`, {
        jobId: job.id,
        result: job.returnvalue,
      });
    });

    scanWorker.on('failed', (job, error) => {
      scanLogger.error(`[Worker] Job ${job.id} failed:`, error.message, {
        jobId: job?.id,
        error: error.message,
        stack: error.stack,
      });
    });

    scanWorker.on('error', (error) => {
      scanLogger.error('[Worker] Worker error:', error);
    });

    scanLogger.info('[Worker] Scan worker started', {
      queue: SCAN_QUEUE_NAME,
      concurrency: WORKER_CONCURRENCY,
    });
  } catch (error) {
    scanLogger.warn(`[Worker] Redis not available - worker will not start: ${error.message}`);
    if (connection) {
      connection.disconnect();
      connection = null;
    }
  }
}

// Start worker on module load
startWorker();

// Graceful shutdown
const shutdown = async () => {
  scanLogger.info('[Worker] Shutting down gracefully...');

  // Set a timeout for graceful shutdown
  const shutdownTimeout = setTimeout(() => {
    scanLogger.warn('[Worker] Shutdown timeout, forcing exit');
    process.exit(1);
  }, 30000); // 30 second timeout

  try {
    if (scanWorker) {
      await scanWorker.close();
    }
    if (connection) {
      await connection.quit();
    }
    clearTimeout(shutdownTimeout);
    scanLogger.info('[Worker] Shutdown complete');
    process.exit(0);
  } catch (error) {
    scanLogger.error('[Worker] Error during shutdown:', error);
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
};

if (require.main === module) {
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// Health check endpoint (simple HTTP server for monitoring)
if (process.env.ENABLE_WORKER_HEALTH_CHECK === 'true') {
  const http = require('http');
  const HEALTH_CHECK_PORT = parseInt(process.env.WORKER_HEALTH_CHECK_PORT) || 3001;

  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: scanWorker ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        queue: SCAN_QUEUE_NAME,
        concurrency: WORKER_CONCURRENCY,
        workerStarted: !!scanWorker,
      }));
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  server.listen(HEALTH_CHECK_PORT, () => {
    scanLogger.info(`[Worker] Health check server listening on port ${HEALTH_CHECK_PORT}`);
  });
}

module.exports = { scanWorker, connection, startWorker };
