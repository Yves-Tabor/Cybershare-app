# Cybershare Architecture Documentation

## Overview

Cybershare is a production-ready vulnerability scanning platform built with a clean, scalable architecture. The system separates the API layer from the scanning infrastructure using a queue-based worker pattern, enabling horizontal scaling and improved reliability.

## System Architecture

### High-Level Components

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Frontend      │         │  Express API    │         │   PostgreSQL    │
│   (React)       │◄────────►│   (Backend)     │◄────────►│   Database      │
└─────────────────┘         └────────┬────────┘         └─────────────────┘
                                    │
                                    │ Socket.IO
                                    ▼
                            ┌─────────────────┐
                            │   BullMQ Queue  │
                            │   (Redis)       │
                            └────────┬────────┘
                                     │
                                     │
                            ┌────────▼────────┐
                            │  Scan Worker(s) │
                            │  (Node.js)      │
                            └────────┬────────┘
                                     │
                                     │
                            ┌────────▼────────┐
                            │  Security Tools │
                            │  (HTTPX, Nmap,  │
                            │   Nuclei, etc.) │
                            └─────────────────┘
```

### Component Responsibilities

#### Frontend (React)
- User interface for initiating and monitoring scans
- Real-time progress updates via Socket.IO
- Display of scan results and findings

#### Express API (Backend)
- RESTful API endpoints for scan management
- Authentication and authorization
- Request validation and security checks
- Queue job creation and management
- Socket.IO server for real-time events

#### BullMQ Queue (Redis)
- Job queuing and scheduling
- Retry logic and error handling
- Job priority management
- Distributed job processing

#### Scan Worker(s)
- Processes queued scan jobs
- Executes security tools (HTTPX, Nmap, Nuclei)
- Parses tool outputs
- Stores results in database
- Emits progress events via Socket.IO

#### PostgreSQL Database
- Persistent storage for scan jobs, targets, findings
- User authentication data
- Scan history and results
- Progress tracking and logs

## Database Schema

### Core Tables

#### scan_jobs
Main job tracking with queue integration
- Job lifecycle states: queued, validating, running_httpx, running_nmap, running_nuclei, parsing, completed, failed, cancelled
- Queue metadata (job ID, priority, retry count)
- Timing information (queued, started, completed, failed)
- Security score and finding counts
- Error handling (message, code)

#### scan_targets
Target validation and metadata
- URL, hostname, IP address, port
- Validation results (is_valid, is_reachable)
- HTTP metadata (status, server, content type)
- Technology detection
- Security flags (localhost, private IP, reserved IP)

#### scan_results
Aggregated results per scanner stage
- Scanner name and stage
- Execution timing and duration
- Success/failure status
- Raw output storage
- Parsed data (JSONB)

#### scan_findings
Individual security findings
- Category, severity, title, description, recommendation
- Tool-specific metadata (template ID, CVE ID, CVSS score)
- Location information (URL, port, path)
- Additional metadata (JSONB)
- Status tracking (false positive, resolved)

#### scan_progress
Stage-by-stage progress tracking
- Stage name and status
- Progress percentage
- Current step and total steps
- Timing information
- Progress messages

#### scan_logs
Execution logs for debugging and auditing
- Log level (debug, info, warn, error, fatal)
- Stage and message
- Context data (JSONB)
- Timestamp

## Scan Pipeline

### Pipeline Stages

```
Target Validation
       ↓
    HTTPX
       ↓
    Nmap
       ↓
   Nuclei
       ↓
  Parsing
       ↓
  Completion
```

### Stage Details

#### 1. Target Validation
- Validates URL format and protocol
- Resolves hostname to IP
- Checks for private/reserved IPs
- Prevents SSRF attacks
- Blocks localhost and internal networks

#### 2. HTTPX
- Verifies target reachability
- Detects HTTP/HTTPS
- Collects response metadata
- Identifies technologies
- Checks for missing security headers

#### 3. Nmap
- Detects open ports
- Identifies services
- Detects service versions
- Generates port/service findings

#### 4. Nuclei
- Executes vulnerability templates
- Categorizes findings by severity
- Records template IDs and references
- Generates vulnerability findings

#### 5. Parsing
- Normalizes all findings
- Calculates security score
- Stores results in database
- Updates progress tracking

## Security Architecture

### Input Validation
- URL format validation
- Protocol whitelisting (HTTP/HTTPS only)
- Private IP range blocking
- Command injection prevention
- Scan option validation

### Process Isolation
- Worker runs in separate process
- Uses `spawn()` instead of `exec()`
- Process timeout enforcement
- Orphaned process cleanup

### Rate Limiting
- API rate limiting (300 requests per 15 minutes)
- Concurrent scan limiting (5 per minute)
- Queue size management
- Job priority system

### Data Protection
- Password hashing with bcrypt
- JWT token authentication
- Session management
- SQL injection prevention (parameterized queries)

## Scalability

### Horizontal Scaling
- Multiple worker instances can run concurrently
- Redis provides distributed queue
- Workers can be deployed independently
- Load balancing via BullMQ

### Vertical Scaling
- Configurable worker concurrency
- Adjustable scan timeouts
- Memory-efficient parsing
- Connection pooling

### Performance Optimization
- Efficient database queries with indexes
- Batch insert operations
- Streaming output parsing
- Async/await throughout

## Monitoring & Observability

### Logging
- Structured logging with Winston
- Separate log files by service
- Log levels (debug, info, warn, error, fatal)
- Contextual metadata

### Health Checks
- Worker health check endpoint
- Queue statistics monitoring
- Database connection monitoring
- Redis connection monitoring

### Metrics
- Job processing time
- Queue depth
- Error rates
- Tool execution duration

## Extensibility

### Adding New Scanner Stages

To add a new scanner stage:

1. Create a new stage file in `worker/pipeline/stages/`
2. Implement the stage function following the pattern:
   ```javascript
   async function runNewStage(scanJobId, targetUrl, validation, job) {
     // Execute tool
     // Parse output
     // Generate findings
     // Return results
   }
   ```
3. Add the stage to the pipeline in `worker/pipeline/scanPipeline.js`
4. Update database schema if needed
5. Add Socket.IO events for progress updates

### Future Scanner Tools

The architecture supports adding:
- Katana (web crawling)
- Naabu (port discovery)
- DNSX (DNS enumeration)
- Subfinder (subdomain discovery)
- And any other ProjectDiscovery tools

## Deployment Architecture

### Development
- All services run locally
- SQLite or PostgreSQL for database
- Local Redis instance
- Single worker instance

### Production
- API server on cloud platform (Render, AWS, etc.)
- Managed PostgreSQL (Neon, AWS RDS)
- Managed Redis (Redis Cloud, AWS ElastiCache)
- Multiple worker instances (Docker, Kubernetes)
- Load balancer for API
- CDN for static assets

## Communication Patterns

### API → Worker (via BullMQ)
- Job creation with metadata
- Priority-based scheduling
- Retry logic with exponential backoff
- Job cancellation support

### Worker → Frontend (via Socket.IO)
- Real-time progress updates
- Stage completion events
- Error notifications
- Completion notifications

### Worker → Database
- Job status updates
- Finding storage
- Progress tracking
- Log storage

## Error Handling

### API Errors
- Validation errors return 400
- Authentication errors return 401
- Not found errors return 404
- Server errors return 500

### Worker Errors
- Job retries with exponential backoff
- Max 3 retries per job
- Error logging to database
- User notification on failure

### Tool Errors
- Timeout handling (30s per tool)
- Graceful degradation
- Error findings generation
- Partial result support

## Configuration Management

### Environment Variables
All configuration via environment variables:
- Database connection
- Redis connection
- Tool paths
- Timeouts and limits
- Security keys

### Configuration Files
- `.env.example` for reference
- Separate configs per environment
- No hardcoded secrets

## Backup & Recovery

### Database Backups
- Automated daily backups
- Point-in-time recovery
- Backup retention policy

### Queue Recovery
- Redis persistence
- Job replay capability
- Failed job retry

## Compliance & Auditing

### Audit Trail
- Scan job history
- User actions
- Security findings
- System logs

### Data Retention
- Configurable retention periods
- Automatic cleanup
- User-controlled deletion
