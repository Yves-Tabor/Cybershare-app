const { Queue, Worker, Job } = require('bullmq');
const Redis = require('ioredis');
require('dotenv').config();

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB) || 0,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
};

// Create Redis connection
const connection = new Redis(redisConfig);

connection.on('connect', () => {
  console.log('[Queue] Redis connected');
});

connection.on('error', (err) => {
  console.error('[Queue] Redis connection error:', err);
});

// Queue configuration
const SCAN_QUEUE_NAME = 'scan-jobs';

// Create the scan queue
const scanQueue = new Queue(SCAN_QUEUE_NAME, {
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

// Job priorities
const JobPriority = {
  LOW: 1,
  NORMAL: 5,
  HIGH: 10,
  URGENT: 20,
};

// Add a scan job to the queue
async function addScanJob(jobData, options = {}) {
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
  const job = await scanQueue.getJob(jobId);
  return job;
}

// Get job state
async function getJobState(jobId) {
  const job = await scanQueue.getJob(jobId);
  if (!job) return null;
  return await job.getState();
}

// Remove a job
async function removeJob(jobId) {
  const job = await scanQueue.getJob(jobId);
  if (job) {
    await job.remove();
    console.log(`[Queue] Removed job: ${jobId}`);
  }
}

// Cancel a job
async function cancelJob(jobId) {
  const job = await scanQueue.getJob(jobId);
  if (job) {
    await job.discard();
    console.log(`[Queue] Cancelled job: ${jobId}`);
  }
}

// Retry a failed job
async function retryJob(jobId) {
  const job = await scanQueue.getJob(jobId);
  if (job) {
    await job.retry();
    console.log(`[Queue] Retried job: ${jobId}`);
  }
}

// Get queue statistics
async function getQueueStats() {
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
  await scanQueue.clean(24 * 60 * 60 * 1000, 1000); // Clean jobs older than 24h, keep 1000
  console.log('[Queue] Cleaned old jobs');
}

// Pause the queue
async function pauseQueue() {
  await scanQueue.pause();
  console.log('[Queue] Queue paused');
}

// Resume the queue
async function resumeQueue() {
  await scanQueue.resume();
  console.log('[Queue] Queue resumed');
}

// Close the queue connection
async function closeQueue() {
  await scanQueue.close();
  await connection.quit();
  console.log('[Queue] Queue connection closed');
}

module.exports = {
  connection,
  scanQueue,
  SCAN_QUEUE_NAME,
  JobPriority,
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
