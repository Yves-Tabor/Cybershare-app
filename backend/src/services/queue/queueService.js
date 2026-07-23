const { Queue, Worker, Job } = require('bullmq');
const Redis = require('ioredis');
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
    connection = new Redis(redisConfig);

    connection.on('connect', () => {
      console.log('[Queue] Redis connected');
      isRedisAvailable = true;
    });

    connection.on('error', (err) => {
      console.error('[Queue] Redis connection error:', err);
      isRedisAvailable = false;
    });

    connection.on('ready', () => {
      console.log('[Queue] Redis ready');
      isRedisAvailable = true;
    });

    // Wait for connection with timeout
    await Promise.race([
      new Promise((resolve) => {
        connection.on('ready', resolve);
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connection timeout')), 5000))
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

    console.log('[Queue] Scan queue initialized');
    isRedisAvailable = true;
  } catch (error) {
    console.warn('[Queue] Redis not available - scan features will be disabled:', error.message);
    isRedisAvailable = false;
    if (connection) {
      connection.disconnect();
      connection = null;
    }
  }
}

// Initialize queue on module load
initializeQueue();

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
  } = jobData;

  const job = await scanQueue.add(
    'scan',
    {
      userId,
      targetUrl,
      scanType,
      scanOptions,
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
  isRedisAvailable: checkRedisAvailable,
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
