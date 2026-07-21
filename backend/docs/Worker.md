# Worker Documentation

## Overview

The Scan Worker is a standalone Node.js service responsible for processing security scan jobs from the BullMQ queue. It executes security tools (HTTPX, Nmap, Nuclei) in a controlled, isolated environment and stores results in the database.

## Worker Architecture

### Design Principles

1. **Process Isolation**: Worker runs independently of the API
2. **Queue-Based Processing**: Pulls jobs from BullMQ queue
3. **Modular Pipeline**: Each scanner is a separate stage
4. **Security First**: Input validation, process isolation, timeout enforcement
5. **Observability**: Structured logging, health checks, progress tracking
6. **Graceful Shutdown**: Handles SIGTERM/SIGINT for clean shutdown

### Worker Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    Worker Startup                            │
│  - Load environment variables                                │
│  - Connect to Redis                                          │
│  - Initialize BullMQ Worker                                  │
│  - Set up event handlers                                     │
│  - Start health check server (optional)                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Job Processing Loop                       │
│  - Wait for job from queue                                   │
│  - Validate job data                                        │
│  - Execute scan pipeline                                     │
│  - Store results in database                                │
│  - Emit progress events                                      │
│  - Mark job as completed/failed                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Graceful Shutdown                           │
│  - Stop accepting new jobs                                  │
│  - Wait for active jobs to complete                         │
│  - Close Redis connection                                    │
│  - Close worker connection                                  │
│  - Exit process                                             │
└─────────────────────────────────────────────────────────────┘
```

## Worker Configuration

### Environment Variables

**Required Variables**:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_HOST`: Redis server host
- `REDIS_PORT`: Redis server port (default: 6379)

**Optional Variables**:
- `REDIS_PASSWORD`: Redis password (if required)
- `REDIS_DB`: Redis database number (default: 0)
- `WORKER_CONCURRENCY`: Number of concurrent jobs (default: 2)
- `MAX_CONCURRENT_SCANS`: Max scans per minute (default: 5)
- `MAX_SCAN_TIME`: Maximum scan duration in seconds (default: 300)
- `ENABLE_WORKER_HEALTH_CHECK`: Enable health check server (default: false)
- `WORKER_HEALTH_CHECK_PORT`: Health check port (default: 3001)
- `LOG_LEVEL`: Logging level (default: info)
- `NMAP_PATH`: Path to Nmap executable
- `NUCLEI_PATH`: Path to Nuclei executable
- `HTTPX_PATH`: Path to HTTPX executable
- `NUCLEI_TEMPLATES_DIR`: Path to Nuclei templates

### Worker Concurrency

The worker supports concurrent job processing:

```javascript
const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY) || 2;
```

**Recommended Settings**:
- **Development**: 1-2 workers
- **Production**: 2-4 workers per instance
- **High Load**: Scale horizontally with multiple instances

### Rate Limiting

Built-in rate limiting prevents resource exhaustion:

```javascript
limiter: {
  max: parseInt(process.env.MAX_CONCURRENT_SCANS) || 5,
  duration: 60000, // 1 minute
}
```

## Worker Entry Point

### File: `worker/index.js`

**Purpose**: Main worker entry point

**Responsibilities**:
- Initialize Redis connection
- Create BullMQ worker
- Set up event handlers
- Configure concurrency and rate limiting
- Start health check server (optional)
- Handle graceful shutdown

**Key Code Sections**:

```javascript
// Redis connection
const connection = new Redis(redisConfig);

// Worker creation
const scanWorker = new Worker(
  SCAN_QUEUE_NAME,
  async (job) => {
    await processScanJob(job);
  },
  {
    connection,
    concurrency: WORKER_CONCURRENCY,
    limiter: {
      max: MAX_CONCURRENT_SCANS,
      duration: 60000,
    },
  }
);

// Event handlers
scanWorker.on('completed', (job) => { /* ... */ });
scanWorker.on('failed', (job, error) => { /* ... */ });
scanWorker.on('error', (error) => { /* ... */ });

// Graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

## Scan Pipeline

### File: `worker/pipeline/scanPipeline.js`

**Purpose**: Orchestrates the scanning pipeline

**Responsibilities**:
- Validate target URL
- Create scan job record in database
- Execute pipeline stages
- Calculate security score
- Store findings in database
- Notify user of completion
- Handle errors and failures

**Pipeline Stages**:
1. Target Validation
2. HTTPX
3. Nmap
4. Nuclei
5. Parsing
6. Completion

**Key Functions**:

```javascript
async function processScanJob(job) {
  // Validate target
  // Create scan job record
  // Execute pipeline
  // Calculate score
  // Store results
  // Notify user
}

async function executePipeline(scanJobId, userId, targetUrl, validation, job) {
  // Run HTTPX
  // Run Nmap
  // Run Nuclei
  // Parse results
  // Store findings
}
```

## Scanner Stages

### HTTPX Stage

**File**: `worker/pipeline/stages/httpxStage.js`

**Purpose**: Validate target reachability and collect HTTP metadata

**Execution**:
```javascript
const httpxProcess = spawn(httpxExecutable, args);
```

**Timeout**: 30 seconds

**Output**: JSON format

**Findings**: HTTP security issues, technology detection

### Nmap Stage

**File**: `worker/pipeline/stages/nmapStage.js`

**Purpose**: Detect open ports and identify services

**Execution**:
```javascript
const nmapProcess = spawn(nmapExecutable, args);
```

**Timeout**: 30 seconds

**Output**: XML format

**Findings**: Open ports, service detection, risky services

### Nuclei Stage

**File**: `worker/pipeline/stages/nucleiStage.js`

**Purpose**: Detect vulnerabilities using templates

**Execution**:
```javascript
const nucleiProcess = spawn(nucleiExecutable, args);
```

**Timeout**: 30 seconds

**Output**: JSONL format

**Findings**: Vulnerabilities, CVEs, security issues

## Output Parsers

### Nmap Parser

**File**: `worker/pipeline/parsers/nmapParser.js`

**Purpose**: Parse Nmap XML output

**Function**: `parseNmapXml(xmlString)`

**Library**: xml2js

**Output**: Structured JSON with ports, services, versions

### Nuclei Parser

**File**: `worker/pipeline/parsers/nucleiParser.js`

**Purpose**: Parse Nuclei JSONL output

**Function**: `parseNucleiJsonl(jsonlString)`

**Output**: Array of vulnerability findings

**Helper Functions**:
- `extractSeverity()`: Map nuclei severity to standard levels
- `extractCveId()`: Extract CVE ID
- `extractCvssScore()`: Extract CVSS score
- `normalizeNucleiFinding()`: Normalize to standard format

## Security Measures

### Process Isolation

**Spawn vs Exec**:
- Uses `spawn()` instead of `exec()` for security
- Separate process for each tool execution
- Process timeout enforcement
- Signal handling for cleanup

**Timeout Handling**:
```javascript
const timeout = setTimeout(() => {
  process.kill('SIGKILL');
}, 30000);
```

### Input Validation

**URL Validation**:
- Format validation
- Protocol whitelisting
- Private IP blocking
- Command injection prevention

**Sanitization**:
```javascript
function sanitizeCommandArg(arg) {
  return arg.replace(/[;&|`$()]/g, '');
}
```

### Resource Limits

**Memory**: Node.js default limits
**CPU**: Worker concurrency limits
**Time**: Per-tool timeout (30s)
**Network**: Rate limiting (5 scans/min)

## Health Checks

### Health Check Server

**Endpoint**: `GET /health`

**Port**: Configurable (default: 3001)

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2026-07-20T00:00:00Z",
  "queue": "scan-jobs",
  "concurrency": 2
}
```

**Docker Health Check**:
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1
```

## Logging

### Log Levels

- **debug**: Detailed debugging information
- **info**: General informational messages
- **warn**: Warning messages
- **error**: Error messages
- **fatal**: Critical errors

### Log Files

**Production**:
- `logs/scan-combined.log`: All scan logs
- `logs/scan-error.log`: Error logs only

**Development**: Console output with color formatting

### Structured Logging

```javascript
scanLogger.info('[HTTPX] Starting HTTPX scan for job ${scanJobId}', {
  jobId: scanJobId,
  targetUrl: targetUrl,
});
```

## Error Handling

### Job Errors

**Retry Logic**:
- Max 3 retries per job
- Exponential backoff (5s, 10s, 20s)
- Error logging to database

**Job Failure**:
- Update job status to failed
- Store error message
- Notify user via notification
- Emit Socket.IO event

### Tool Errors

**Tool Not Installed**:
- Generate critical finding
- Continue with other tools
- Log error to database

**Tool Timeout**:
- Kill process with SIGKILL
- Generate high finding
- Continue with other tools

**Parse Errors**:
- Log parse error
- Skip invalid output
- Continue with other tools

## Graceful Shutdown

### Shutdown Process

1. Stop accepting new jobs
2. Wait for active jobs to complete
3. Close Redis connection
4. Close worker connection
5. Exit process

### Implementation

```javascript
const shutdown = async () => {
  scanLogger.info('[Worker] Shutting down gracefully...');
  await scanWorker.close();
  await connection.quit();
  scanLogger.info('[Worker] Shutdown complete');
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

## Deployment

### Docker Deployment

**Build Image**:
```bash
docker build -t cybershare-worker ./backend/worker
```

**Run Container**:
```bash
docker run -d \
  --name cybershare-worker \
  -e DATABASE_URL=$DATABASE_URL \
  -e REDIS_HOST=$REDIS_HOST \
  -e REDIS_PORT=$REDIS_PORT \
  -e WORKER_CONCURRENCY=2 \
  -p 3001:3001 \
  cybershare-worker
```

### Direct Node.js Deployment

**Install Dependencies**:
```bash
cd backend
npm install
```

**Run Worker**:
```bash
NODE_ENV=production \
DATABASE_URL=$DATABASE_URL \
REDIS_HOST=$REDIS_HOST \
REDIS_PORT=$REDIS_PORT \
node worker/index.js
```

### Process Manager (PM2)

**Install PM2**:
```bash
npm install -g pm2
```

**Start Worker**:
```bash
pm2 start worker/index.js --name cybershare-worker
```

**Monitor**:
```bash
pm2 monit
pm2 logs cybershare-worker
```

## Scaling

### Horizontal Scaling

**Multiple Worker Instances**:
```bash
# Start 3 worker instances
docker run -d --name worker-1 cybershare-worker
docker run -d --name worker-2 cybershare-worker
docker run -d --name worker-3 cybershare-worker
```

**Kubernetes Deployment**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scan-worker
spec:
  replicas: 3
  selector:
    matchLabels:
      app: scan-worker
  template:
    metadata:
      labels:
        app: scan-worker
    spec:
      containers:
      - name: worker
        image: cybershare-worker
        env:
        - name: WORKER_CONCURRENCY
          value: "2"
```

### Vertical Scaling

**Increase Concurrency**:
```bash
WORKER_CONCURRENCY=4 node worker/index.js
```

**Increase Rate Limit**:
```bash
MAX_CONCURRENT_SCANS=10 node worker/index.js
```

## Monitoring

### Queue Statistics

**Check Queue Depth**:
```javascript
const stats = await getQueueStats();
console.log(stats);
// { waiting: 5, active: 2, completed: 100, failed: 3, delayed: 0 }
```

### Worker Metrics

**Active Jobs**: Check worker concurrency
**Job Duration**: Monitor job processing time
**Error Rate**: Track failed jobs
**Tool Performance**: Monitor tool execution time

### Alerts

**High Queue Depth**: Alert if queue > 100 jobs
**High Error Rate**: Alert if error rate > 10%
**Worker Down**: Alert if health check fails
**Tool Timeout**: Alert if tool timeouts increase

## Troubleshooting

### Common Issues

**Worker Not Processing Jobs**:
- Check Redis connection
- Verify worker is running
- Check worker logs for errors
- Verify queue name matches

**Tool Execution Failures**:
- Check tool installation
- Verify tool paths in environment
- Check tool permissions
- Verify tool version compatibility

**Database Connection Errors**:
- Check DATABASE_URL
- Verify database is accessible
- Check database credentials
- Verify network connectivity

**Memory Issues**:
- Reduce worker concurrency
- Increase available memory
- Check for memory leaks
- Monitor resource usage

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug node worker/index.js
```

### Test Job

Create a test job:
```javascript
const { addScanJob } = require('./src/services/queue/queueService');
await addScanJob({
  userId: 1,
  targetUrl: 'https://example.com',
  scanType: 'standard',
});
```

## Best Practices

1. **Always use timeouts** for tool execution
2. **Handle signals** for graceful shutdown
3. **Log errors** with context
4. **Monitor queue depth** and adjust concurrency
5. **Keep tools updated** for latest security checks
6. **Use structured logging** for better observability
7. **Implement health checks** for monitoring
8. **Scale horizontally** for better performance
9. **Clean up resources** after job completion
10. **Test in development** before production deployment

## Performance Tuning

### Concurrency Tuning

**Low Load** (1-10 scans/hour):
- 1 worker with concurrency 1-2

**Medium Load** (10-100 scans/hour):
- 2-3 workers with concurrency 2-3

**High Load** (100+ scans/hour):
- 4+ workers with concurrency 3-4

### Memory Optimization

**Reduce Concurrency**: Lower concurrency reduces memory usage
**Stream Parsing**: Parse output line-by-line
**Batch Operations**: Batch database writes
**Connection Pooling**: Reuse database connections

### CPU Optimization

**Tool Timeouts**: Set appropriate timeouts
**Rate Limiting**: Prevent CPU exhaustion
**Job Prioritization**: Use queue priorities
**Load Balancing**: Distribute jobs across workers

## Security Best Practices

### Process Security

- Never use `exec()` - always use `spawn()`
- Sanitize all command arguments
- Set process timeouts
- Handle process signals
- Clean up child processes

### Network Security

- Validate all URLs before scanning
- Block private IP ranges
- Use rate limiting
- Implement authentication
- Encrypt sensitive data

### Data Security

- Never log sensitive data
- Use parameterized queries
- Encrypt secrets at rest
- Implement access controls
- Regular security audits
