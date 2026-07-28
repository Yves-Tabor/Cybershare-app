const { Queue, Worker, Job } = require('bullmq');
const Redis = require('ioredis');
require('dotenv').config();

// Redis connection configuration
// Support REDIS_URL for production (Render), fall back to individual REDIS_* variables for local development
// BullMQ requires maxRetriesPerRequest: null for proper operation
let redisConfig;
let redisConfigOptions;
let redisConnectionType;

if (process.env.REDIS_URL) {
  // Production: Use REDIS_URL (e.g., from Render Key Value store)
  redisConfig = process.env.REDIS_URL;
  redisConfigOptions = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
  redisConnectionType = 'REDIS_URL';
  console.log('[Queue] Using REDIS_URL for Redis connection');
} else {
  // Development: Use individual REDIS_* variables (local Memurai)
  redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB) || 0,
  };
  redisConfigOptions = {
    maxRetriesPerRequest: null,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
  };
  redisConnectionType = 'REDIS_HOST/PORT';
  console.log(`[Queue] Using REDIS_HOST=${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379} for Redis connection`);
}

// Queue configuration
const SCAN_QUEUE_NAME = 'scan-jobs';

// Job priorities
const JobPriority = {
  LOW: 1,
  NORMAL: 5,
  HIGH: 10,
  URGENT: 20,
};

let connection = null;
let scanQueue = null;
let isRedisAvailable = false;

// Initialize Redis connection and queue
async function initializeQueue() {
  try {
    console.log(`[Queue] Initializing Redis connection using: ${redisConnectionType}`);
    connection = new Redis(redisConfig, redisConfigOptions);

    connection.on('connect', () => {
      console.log('[Queue] Redis connected successfully');
      isRedisAvailable = true;
    });

    connection.on('error', (err) => {
      console.error('[Queue] Redis connection error:', err.message);
      isRedisAvailable = false;
    });

    connection.on('ready', () => {
      console.log('[Queue] Redis ready and accepting commands');
      isRedisAvailable = true;
    });

    connection.on('close', () => {
      console.log('[Queue] Redis connection closed');
      isRedisAvailable = false;
    });

    // Wait for connection with timeout
    await Promise.race([
      new Promise((resolve) => {
        connection.on('ready', resolve);
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connection timeout after 5s')), 5000))
    ]);

    // Create the scan queue
    scanQueue = new Queue(SCAN_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          count: 1000, // Keep last 1000 completed jobs
          age: 24 * 60 * 60, // 24 hours
        },
        removeOnFail: {
          count: 5000, // Keep last 5000 failed jobs
          age: 7 * 24 * 60 * 60, // 7 days
        },
      },
    });

    console.log('[Queue] Scan queue initialized successfully');
    console.log(`[Queue] Redis is available: ${isRedisAvailable}`);
  } catch (error) {
    console.warn('[Queue] Redis initialization failed - scan features will be disabled');
    console.warn('[Queue] Error:', error.message);
    isRedisAvailable = false;
    if (connection) {
      connection.disconnect();
      connection = null;
    }
  }
}

// Initialize queue on module load
initializeQueue().then(() => {
  console.log('[Queue] Initialization complete, isRedisAvailable:', isRedisAvailable);
}).catch((err) => {
  console.error('[Queue] Initialization failed:', err);
});

// Add a scan job to the queue
async function addScanJob(jobData, options = {}) {
  if (!isRedisAvailable || !scanQueue) {
    throw new Error('Redis is not available - scan features are disabled');
  }

  const {
    userId,
    targetUrl,
    scanType = 'standard',
    scanOptions = {},
    priority = JobPriority.NORMAL,
    dbScanId,
  } = jobData;

  const job = await scanQueue.add(
    'scan',
    {
      userId,
      targetUrl,
      scanType,
      scanOptions,
      dbScanId,
      createdAt: new Date().toISOString(),
    },
    {
      priority,
      jobId: `scan-${userId}-${Date.now()}`, // Unique job ID
      ...options,
    }
  );

  console.log(`[Queue] Added scan job: ${job.id} for user ${userId}, target: ${targetUrl}`);
  return job;
}

// Get job by ID
async function getJob(jobId) {
  if (!isRedisAvailable || !scanQueue) {
    throw new Error('Redis is not available - scan features are disabled');
  }
  const job = await scanQueue.getJob(jobId);
  return job;
}

// Get job state
async function getJobState(jobId) {
  if (!isRedisAvailable || !scanQueue) {
    throw new Error('Redis is not available - scan features are disabled');
  }
  const job = await scanQueue.getJob(jobId);
  if (!job) return null;
  return await job.getState();
}

// Remove a job
async function removeJob(jobId) {
  if (!isRedisAvailable || !scanQueue) {
    throw new Error('Redis is not available - scan features are disabled');
  }
  const job = await scanQueue.getJob(jobId);
  if (job) {
    await job.remove();
    console.log(`[Queue] Removed job: ${jobId}`);
  }
}

// Cancel a job
async function cancelJob(jobId) {
  if (!isRedisAvailable || !scanQueue) {
    throw new Error('Redis is not available - scan features are disabled');
  }
  const job = await scanQueue.getJob(jobId);
  if (job) {
    await job.discard();
    console.log(`[Queue] Cancelled job: ${jobId}`);
  }
}

// Retry a failed job
async function retryJob(jobId) {
  if (!isRedisAvailable || !scanQueue) {
    throw new Error('Redis is not available - scan features are disabled');
  }
  const job = await scanQueue.getJob(jobId);
  if (job) {
    await job.retry();
    console.log(`[Queue] Retried job: ${jobId}`);
  }
}

// Get queue statistics
async function getQueueStats() {
  if (!isRedisAvailable || !scanQueue) {
    throw new Error('Redis is not available - scan features are disabled');
  }
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    scanQueue.getWaitingCount(),
    scanQueue.getActiveCount(),
    scanQueue.getCompletedCount(),
    scanQueue.getFailedCount(),
    scanQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

// Clean up old jobs
async function cleanQueue() {
  if (!isRedisAvailable || !scanQueue) {
    throw new Error('Redis is not available - scan features are disabled');
  }
  await scanQueue.clean(24 * 60 * 60 * 1000, 1000); // Clean jobs older than 24h, keep 1000
  console.log('[Queue] Cleaned old jobs');
}

// Pause the queue
async function pauseQueue() {
  if (!isRedisAvailable || !scanQueue) {
    throw new Error('Redis is not available - scan features are disabled');
  }
  await scanQueue.pause();
  console.log('[Queue] Queue paused');
}

// Resume the queue
async function resumeQueue() {
  if (!isRedisAvailable || !scanQueue) {
    throw new Error('Redis is not available - scan features are disabled');
  }
  await scanQueue.resume();
  console.log('[Queue] Queue resumed');
}

// Close the queue connection
async function closeQueue() {
  if (scanQueue) {
    await scanQueue.close();
  }
  if (connection) {
    await connection.quit();
  }
  console.log('[Queue] Queue connection closed');
}

function checkRedisAvailable() {
  return isRedisAvailable;
}

module.exports = {
  connection,
  scanQueue,
  SCAN_QUEUE_NAME,
  JobPriority,
  isRedisAvailable,
  checkRedisAvailable,
  addScanJob,
  getJob,
  getJobState,
  removeJob,
  cancelJob,
  retryJob,
  getQueueStats,
  cleanQueue,
  pauseQueue,
  resumeQueue,
  closeQueue,
};
