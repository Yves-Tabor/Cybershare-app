# Queue Documentation

## Overview

The Cybershare queue system uses BullMQ with Redis to manage scan job processing. This provides reliable job scheduling, retry logic, priority management, and distributed processing capabilities.

## Queue Architecture

### Components

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Express API   │         │   BullMQ Queue  │         │   Redis Server  │
│   (Producer)    │────────►│   (Queue)       │◄────────►│   (Backend)     │
└─────────────────┘         └────────┬────────┘         └─────────────────┘
                                     │
                                     │
                            ┌────────▼────────┐
                            │   BullMQ Worker │
                            │   (Consumer)    │
                            └─────────────────┘
```

### Key Concepts

**Queue**: A first-in-first-out (FIFO) data structure that holds jobs
**Job**: A unit of work to be processed (a scan request)
**Worker**: A process that consumes jobs from the queue
**Producer**: The API that adds jobs to the queue
**Consumer**: The worker that processes jobs

## BullMQ Configuration

### Queue Setup

**File**: `src/services/queue/queueService.js`

**Configuration**:
```javascript
const scanQueue = new Queue(SCAN_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,                    // Max retry attempts
    backoff: {
      type: 'exponential',
      delay: 5000,                  // Initial backoff delay
    },
    removeOnComplete: {
      count: 1000,                  // Keep last 1000 completed jobs
      age: 24 * 60 * 60,           // 24 hours
    },
    removeOnFail: {
      count: 5000,                  // Keep last 5000 failed jobs
      age: 7 * 24 * 60 * 60,        // 7 days
    },
  },
});
```

### Worker Setup

**File**: `worker/index.js`

**Configuration**:
```javascript
const scanWorker = new Worker(
  SCAN_QUEUE_NAME,
  async (job) => {
    await processScanJob(job);
  },
  {
    connection,
    concurrency: WORKER_CONCURRENCY,  // Number of concurrent jobs
    limiter: {
      max: MAX_CONCURRENT_SCANS,     // Max jobs per time window
      duration: 60000,              // Time window in ms
    },
  }
);
```

## Job Lifecycle

### Job States

```
┌─────────┐
│ waiting │
└────┬────┘
     │
     ▼
┌─────────┐
│ active  │
└────┬────┘
     │
     ├─────────────┐
     │             │
     ▼             ▼
┌─────────┐   ┌─────────┐
│completed│   │ failed  │
└─────────┘   └────┬────┘
                  │
                  ▼
             ┌─────────┐
             │ delayed │  (for retry)
             └────┬────┘
                  │
                  ▼
               ┌─────────┐
               │ waiting │
               └─────────┘
```

### State Descriptions

- **waiting**: Job is waiting to be processed
- **active**: Job is currently being processed
- **completed**: Job finished successfully
- **failed**: Job failed after all retries
- **delayed**: Job is delayed (waiting for retry)

## Job Data Structure

### Job Payload

```javascript
{
  userId: number,           // User ID who requested the scan
  targetUrl: string,        // Target URL to scan
  scanType: string,         // Type of scan (standard, deep, etc.)
  scanOptions: object,      // Additional scan options
  createdAt: string,        // ISO timestamp
}
```

### Job Options

```javascript
{
  priority: number,         // Job priority (1-20)
  jobId: string,            // Unique job identifier
  attempts: number,        // Number of retry attempts
  backoff: object,          // Backoff strategy
  delay: number,           // Delay before processing
}
```

### Job Result

```javascript
{
  success: boolean,         // Whether job succeeded
  scanJobId: number,       // Database scan job ID
  securityScore: number,    // Calculated security score
  totalFindings: number,    // Total findings count
}
```

## Priority System

### Priority Levels

```javascript
const JobPriority = {
  LOW: 1,
  NORMAL: 5,
  HIGH: 10,
  URGENT: 20,
};
```

### Priority Usage

```javascript
await addScanJob(jobData, {
  priority: JobPriority.HIGH,  // Process before normal jobs
});
```

### Priority Processing

Jobs with higher priority are processed first within the same queue. All jobs with the same priority are processed in FIFO order.

## Retry Logic

### Retry Configuration

```javascript
defaultJobOptions: {
  attempts: 3,                    // Max 3 attempts
  backoff: {
    type: 'exponential',
    delay: 5000,                  // 5s, 10s, 20s delays
  },
}
```

### Retry Behavior

1. **First Failure**: Job delayed for 5 seconds
2. **Second Failure**: Job delayed for 10 seconds
3. **Third Failure**: Job delayed for 20 seconds
4. **Final Failure**: Job marked as failed

### Custom Retry Logic

You can implement custom retry logic in the worker:

```javascript
async function processScanJob(job) {
  try {
    // Process job
  } catch (error) {
    if (error.code === 'NETWORK_ERROR') {
      // Retry network errors
      throw error;  // BullMQ will retry
    } else if (error.code === 'VALIDATION_ERROR') {
      // Don't retry validation errors
      throw new Error('Fatal: ' + error.message);
    }
  }
}
```

## Rate Limiting

### Queue-Level Rate Limiting

```javascript
limiter: {
  max: 5,              // Max 5 jobs
  duration: 60000,     // Per 60 seconds
}
```

### API-Level Rate Limiting

Express rate limiting is configured separately:

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 300,                  // 300 requests
});
```

### Combined Rate Limiting

The system uses both queue-level and API-level rate limiting:
- API rate limiting prevents abuse of the API
- Queue rate limiting prevents resource exhaustion

## Job Cancellation

### Cancel a Job

```javascript
await cancelJob(jobId);
```

### Cancel from API

Add an endpoint to cancel jobs:

```javascript
router.delete('/scans/:id/cancel', async (req, res) => {
  const { id } = req.params;
  await cancelJob(id);
  res.json({ message: 'Job cancelled' });
});
```

### Worker Handling

The worker should check for cancellation:

```javascript
async function processScanJob(job) {
  if (await job.getState() === 'cancelled') {
    throw new Error('Job cancelled');
  }
  // Process job
}
```

## Queue Monitoring

### Queue Statistics

```javascript
const stats = await getQueueStats();
// Returns:
{
  waiting: 5,
  active: 2,
  completed: 100,
  failed: 3,
  delayed: 0,
  total: 110
}
```

### Job State

```javascript
const state = await getJobState(jobId);
// Returns: 'waiting', 'active', 'completed', 'failed', 'delayed'
```

### Job Progress

Update job progress:

```javascript
await job.updateProgress(50);  // 50% complete
```

### Queue Events

Monitor queue events:

```javascript
scanQueue.on('waiting', (job) => {
  console.log(`Job ${job.id} is waiting`);
});

scanQueue.on('active', (job) => {
  console.log(`Job ${job.id} is now active`);
});

scanQueue.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

scanQueue.on('failed', (job, error) => {
  console.log(`Job ${job.id} failed: ${error.message}`);
});
```

## Queue Operations

### Add Job

```javascript
const job = await addScanJob({
  userId: 1,
  targetUrl: 'https://example.com',
  scanType: 'standard',
  scanOptions: {},
}, {
  priority: JobPriority.NORMAL,
});
```

### Get Job

```javascript
const job = await getJob(jobId);
```

### Remove Job

```javascript
await removeJob(jobId);
```

### Retry Job

```javascript
await retryJob(jobId);
```

### Clean Queue

```javascript
await cleanQueue();  // Remove old jobs
```

### Pause/Resume Queue

```javascript
await pauseQueue();
await resumeQueue();
```

## Redis Configuration

### Connection Options

```javascript
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB) || 0,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
};
```

### Redis Persistence

For production, enable Redis persistence:

```conf
# redis.conf
save 900 1
save 300 10
save 60 10000
appendonly yes
```

### Redis Cluster

For high availability, use Redis Cluster:

```javascript
const connection = new Redis.Cluster([
  { host: 'redis-1', port: 6379 },
  { host: 'redis-2', port: 6379 },
  { host: 'redis-3', port: 6379 },
]);
```

## Error Handling

### Queue Errors

```javascript
connection.on('error', (err) => {
  console.error('Redis connection error:', err);
});
```

### Worker Errors

```javascript
scanWorker.on('error', (error) => {
  console.error('Worker error:', error);
});
```

### Job Errors

```javascript
scanWorker.on('failed', (job, error) => {
  console.error(`Job ${job.id} failed:`, error);
  // Log to database
  // Notify user
});
```

## Best Practices

### Job Design

1. **Keep Jobs Small**: Break large tasks into smaller jobs
2. **Idempotent Jobs**: Jobs should be safe to retry
3. **Timeout Jobs**: Set reasonable timeouts
4. **Progress Updates**: Report progress for long-running jobs
5. **Error Handling**: Handle errors gracefully

### Queue Management

1. **Monitor Queue Depth**: Keep queue size manageable
2. **Clean Old Jobs**: Remove completed/failed jobs regularly
3. **Rate Limiting**: Prevent queue flooding
4. **Priority System**: Use priorities for important jobs
5. **Retry Strategy**: Configure appropriate retry logic

### Performance Optimization

1. **Connection Pooling**: Reuse Redis connections
2. **Batch Operations**: Process multiple jobs together
3. **Concurrency**: Adjust worker concurrency based on load
4. **Memory Management**: Monitor Redis memory usage
5. **Network Latency**: Minimize network round trips

## Scaling

### Horizontal Scaling

**Multiple Workers**:
```bash
# Start multiple worker instances
node worker/index.js &  # Worker 1
node worker/index.js &  # Worker 2
node worker/index.js &  # Worker 3
```

**Load Balancing**:
BullMQ automatically distributes jobs across workers using Redis.

### Vertical Scaling

**Increase Concurrency**:
```javascript
WORKER_CONCURRENCY=4 node worker/index.js
```

**Increase Rate Limit**:
```javascript
limiter: {
  max: 10,              // Increased from 5
  duration: 60000,
}
```

## Monitoring

### Key Metrics

- **Queue Depth**: Number of waiting jobs
- **Processing Rate**: Jobs processed per minute
- **Error Rate**: Percentage of failed jobs
- **Average Duration**: Average job processing time
- **Retry Rate**: Percentage of retried jobs

### Monitoring Tools

**Bull Board**: Web UI for monitoring BullMQ queues
```bash
npm install bull-board
```

**Prometheus**: Export metrics to Prometheus
```bash
npm install bullmq-prometheus
```

**Custom Monitoring**: Implement custom monitoring
```javascript
setInterval(async () => {
  const stats = await getQueueStats();
  console.log('Queue stats:', stats);
}, 60000);
```

## Troubleshooting

### Common Issues

**Jobs Not Processing**:
- Check Redis connection
- Verify worker is running
- Check worker logs for errors
- Verify queue name matches

**High Queue Depth**:
- Increase worker concurrency
- Add more worker instances
- Check job processing time
- Optimize job logic

**High Failure Rate**:
- Check error logs
- Verify tool availability
- Check network connectivity
- Review retry logic

**Memory Issues**:
- Monitor Redis memory usage
- Clean old jobs regularly
- Reduce job data size
- Increase Redis memory limit

### Debug Mode

Enable debug logging:
```bash
DEBUG=bullmq* node worker/index.js
```

### Queue Inspection

Inspect queue state:
```javascript
const waiting = await scanQueue.getWaiting();
const active = await scanQueue.getActive();
const completed = await scanQueue.getCompleted();
const failed = await scanQueue.getFailed();
```

## Security

### Access Control

**Redis Authentication**:
```javascript
const connection = new Redis({
  host: 'localhost',
  port: 6379,
  password: 'your-redis-password',
});
```

**Network Security**:
- Use Redis in a private network
- Enable TLS for Redis connections
- Use firewall rules to restrict access
- Use Redis ACLs for fine-grained control

### Data Security

**Sensitive Data**:
- Don't store sensitive data in job data
- Use environment variables for secrets
- Encrypt sensitive job data if needed
- Clean up completed jobs regularly

## Backup and Recovery

### Redis Backup

**RDB Snapshot**:
```bash
# Redis automatically saves to dump.rdb
cp /var/lib/redis/dump.rdb /backup/redis-backup.rdb
```

**AOF Backup**:
```bash
cp /var/lib/redis/appendonly.aof /backup/redis-aof.aof
```

### Queue Recovery

**After Redis Restart**:
- Jobs in waiting state are preserved
- Jobs in active state may be lost
- Implement job recovery logic if needed

**Job Recovery**:
```javascript
// Recover stuck jobs
const active = await scanQueue.getActive();
for (const job of active) {
  await job.moveToFailed(new Error('Recovery'), true);
  await job.retry();
}
```

## Performance Tuning

### Redis Optimization

**Memory Optimization**:
```conf
maxmemory 2gb
maxmemory-policy allkeys-lru
```

**Persistence Optimization**:
```conf
save 900 1
save 300 10
save 60 10000
```

### Queue Optimization

**Job Cleanup**:
```javascript
// Clean old jobs regularly
setInterval(async () => {
  await cleanQueue();
}, 24 * 60 * 60 * 1000);  // Every 24 hours
```

**Batch Operations**:
```javascript
// Process multiple jobs together
const jobs = await scanQueue.getBatch(10);
for (const job of jobs) {
  await processJob(job);
}
```

## Integration Examples

### Adding Jobs from API

```javascript
router.post('/scans', async (req, res) => {
  const { target_url } = req.body;
  const job = await addScanJob({
    userId: req.userId,
    targetUrl: target_url,
    scanType: 'standard',
  });
  res.json({ jobId: job.id });
});
```

### Monitoring Job Progress

```javascript
router.get('/scans/:id/progress', async (req, res) => {
  const job = await getJob(req.params.id);
  const progress = job.progress;
  res.json({ progress });
});
```

### Canceling Jobs

```javascript
router.delete('/scans/:id', async (req, res) => {
  await cancelJob(req.params.id);
  res.json({ message: 'Job cancelled' });
});
```

## Advanced Features

### Scheduled Jobs

```javascript
// Schedule a job for later
const job = await scanQueue.add('scan', jobData, {
  delay: 60000,  // 1 minute delay
});
```

### Repeated Jobs

```javascript
// Repeat job every hour
const job = await scanQueue.add('scan', jobData, {
  repeat: {
    every: 3600000,  // 1 hour
  },
});
```

### Job Dependencies

```javascript
// Wait for job A to complete before starting job B
const jobA = await scanQueue.add('scan', dataA);
const jobB = await scanQueue.add('scan', dataB, {
  parent: jobA,
});
```

### Job Groups

```javascript
// Group related jobs
const group = await scanQueue.addBulk([
  { name: 'scan', data: jobData1 },
  { name: 'scan', data: jobData2 },
  { name: 'scan', data: jobData3 },
]);
```

## Testing

### Unit Testing

```javascript
describe('Queue Service', () => {
  it('should add job to queue', async () => {
    const job = await addScanJob({
      userId: 1,
      targetUrl: 'https://example.com',
    });
    expect(job.id).toBeDefined();
  });
});
```

### Integration Testing

```javascript
describe('Queue Integration', () => {
  it('should process job end-to-end', async () => {
    const job = await addScanJob(jobData);
    await new Promise(resolve => setTimeout(resolve, 5000));
    const state = await getJobState(job.id);
    expect(state).toBe('completed');
  });
});
```

## Migration

### From Old Queue System

If migrating from a different queue system:

1. Export existing jobs
2. Transform to BullMQ format
3. Import to BullMQ
4. Test processing
5. Switch over

### Queue Schema Changes

When changing job data structure:

1. Update job creation logic
2. Update worker processing logic
3. Handle backward compatibility
4. Test with existing jobs
5. Deploy incrementally

## References

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Redis Documentation](https://redis.io/docs/)
- [Queue Patterns](https://www.enterpriseintegrationpatterns.com/patterns/messaging/MessageQueue.html)

## Support

For queue-related issues:
1. Check Redis connection
2. Review worker logs
3. Monitor queue statistics
4. Consult documentation
5. Contact development team
