# Scanner Documentation

## Overview

The Cybershare scanner is a modular, production-ready vulnerability scanning system built on a queue-based architecture. It executes security tools in a dedicated worker process, ensuring the API remains responsive and scalable.

## Scanner Architecture

### Design Principles

1. **Separation of Concerns**: API handles requests, worker handles scanning
2. **Queue-Based Processing**: BullMQ + Redis for job management
3. **Modular Pipeline**: Each scanner is a separate stage
4. **Security First**: Input validation, process isolation, timeout enforcement
5. **Scalability**: Horizontal scaling via multiple workers
6. **Observability**: Structured logging, progress tracking, health checks

### Scanner Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    Scan Job Created                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Target Validation                           │
│  - URL format validation                                     │
│  - Protocol whitelisting (HTTP/HTTPS)                       │
│  - Hostname resolution                                      │
│  - Private IP blocking                                       │
│  - Command injection prevention                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      HTTPX Stage                            │
│  - Target reachability check                                │
│  - HTTP/HTTPS detection                                     │
│  - Response metadata collection                             │
│  - Technology detection                                     │
│  - Security header analysis                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      Nmap Stage                              │
│  - Port scanning                                            │
│  - Service identification                                    │
│  - Version detection                                        │
│  - Open port analysis                                       │
│  - Risky service detection                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     Nuclei Stage                             │
│  - Vulnerability template execution                         │
│  - CVE detection                                            │
│  - Severity categorization                                  │
│  - Template ID tracking                                     │
│  - Reference collection                                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      Parsing Stage                           │
│  - Finding normalization                                     │
│  - Security score calculation                                │
│  - Database storage                                         │
│  - Progress finalization                                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Scan Completion                            │
│  - User notification                                         │
│  - Socket.IO event emission                                 │
│  - Job cleanup                                              │
└─────────────────────────────────────────────────────────────┘
```

## Scanner Stages

### HTTPX Stage

**Purpose**: Validate target reachability and collect HTTP metadata

**Execution**:
```bash
httpx -u <target> -json -silent -no-color -tech-detect \
      -status-code -title -server -content-length -response-time
```

**Output Parsing**:
- JSON format parsing
- Technology extraction
- Header analysis
- Status code validation

**Findings Generated**:
- HTTP vs HTTPS usage
- Server header disclosure
- Missing security headers
- Technology detection
- Content type issues

**Timeout**: 30 seconds

**Error Handling**:
- Tool not installed → critical finding
- Target unreachable → high finding
- Parse error → error finding

### Nmap Stage

**Purpose**: Detect open ports and identify services

**Execution**:
```bash
nmap -Pn -T4 -F --host-timeout 25s -oX - <hostname>
```

**Output Parsing**:
- XML format parsing using xml2js
- Port extraction
- Service identification
- Version detection

**Findings Generated**:
- Open ports detected
- Potentially risky services
- Web services detection
- Outdated service versions
- No open ports (informational)

**Timeout**: 30 seconds

**Error Handling**:
- Tool not installed → critical finding
- Scan timeout → high finding
- Parse error → error finding

### Nuclei Stage

**Purpose**: Detect vulnerabilities using templates

**Execution**:
```bash
nuclei -u <target> -severity critical,high,medium \
       -rl 50 -timeout 5 -retries 0 -json -silent \
       -duc -ni -nh -no-stdin -t <template-paths>
```

**Template Selection**:
- Quick-scan template set for performance
- Categories: exposures, misconfigurations, vulnerabilities
- Severity filtering: critical, high, medium

**Output Parsing**:
- JSONL format parsing
- Severity mapping
- CVE extraction
- CVSS score extraction
- Reference collection

**Findings Generated**:
- Vulnerability findings with severity
- Template ID tracking
- CVE references
- CVSS scores
- Remediation recommendations

**Timeout**: 30 seconds

**Error Handling**:
- Tool not installed → critical finding
- Templates not found → critical finding
- Scan timeout → high finding
- Parse error → error finding

## Output Parsers

### Nmap XML Parser

**Location**: `worker/pipeline/parsers/nmapParser.js`

**Function**: `parseNmapXml(xmlString)`

**Output Structure**:
```javascript
{
  hostname: string,
  ip: string,
  ports: [
    {
      port: number,
      protocol: string,
      state: string,
      service: string,
      version: string,
      product: string,
      extrainfo: string
    }
  ],
  state: string,
  os: string,
  uptime: number
}
```

**Error Handling**:
- Invalid XML → returns null
- Missing data → returns empty structure
- Parse errors → logged and null returned

### Nuclei JSONL Parser

**Location**: `worker/pipeline/parsers/nucleiParser.js`

**Function**: `parseNucleiJsonl(jsonlString)`

**Output Structure**:
```javascript
[
  {
    templateId: string,
    templatePath: string,
    severity: string,
    name: string,
    description: string,
    remediation: string,
    cveId: string,
    cvssScore: number,
    references: string[],
    tags: string[],
    matchedAt: string,
    extractedResults: any,
    request: string,
    response: string,
    curlCommand: string,
    matcherStatus: string
  }
]
```

**Helper Functions**:
- `extractSeverity(finding)`: Maps nuclei severity to standard levels
- `extractCveId(finding)`: Extracts CVE ID from classification
- `extractCvssScore(finding)`: Extracts CVSS score
- `extractReferences(finding)`: Extracts reference URLs
- `extractTags(finding)`: Extracts technology tags
- `normalizeNucleiFinding(finding)`: Normalizes to standard format

## Security Measures

### Input Validation

**URL Validation**:
- Format validation using URL API
- Protocol whitelisting (HTTP/HTTPS only)
- Hostname resolution check
- Private IP range blocking
- Reserved IP range blocking
- Localhost blocking

**Command Injection Prevention**:
- Shell metacharacter filtering
- Command substitution detection
- Variable expansion detection
- Argument sanitization
- Use of `spawn()` instead of `exec()`

### Process Isolation

**Execution Safety**:
- Separate worker process
- No direct tool execution in API
- Process timeout enforcement
- Signal handling (SIGKILL on timeout)
- Orphaned process cleanup

**Resource Limits**:
- Max scan time: 300 seconds
- Max concurrent scans: 5 per minute
- Tool timeout: 30 seconds
- Memory limits per job

### Rate Limiting

**API Rate Limiting**:
- 300 requests per 15 minutes per IP
- Skip for scan status polling
- Configurable via environment

**Queue Rate Limiting**:
- 5 concurrent scans per minute
- Priority-based scheduling
- Queue size monitoring

## Finding Generation

### Finding Structure

```javascript
{
  category: string,        // 'Network', 'Vulnerability', 'HTTP Headers', etc.
  severity: string,        // 'critical', 'high', 'medium', 'low', 'informational'
  title: string,          // Human-readable title
  description: string,    // Detailed description
  recommendation: string, // Remediation advice
  scannerName: string,    // Tool that generated the finding
  templateId: string,     // Template ID (for Nuclei)
  metadata: object        // Additional context (JSONB)
}
```

### Severity Levels

- **Critical**: Immediate action required, high risk
- **High**: Important to fix, significant risk
- **Medium**: Should fix, moderate risk
- **Low**: Nice to fix, low risk
- **Informational**: Informational only, no risk

### Categories

- Network: Port scanning, service detection
- Vulnerability: CVEs, security issues
- HTTP Headers: Security headers, information disclosure
- SSL/TLS: Certificate issues, encryption
- DNS: DNS security configurations
- Technology Detection: Identified technologies
- Target Validation: Reachability, validation issues

## Progress Tracking

### Progress Events

**Socket.IO Events**:
- `scan:queued`: Job added to queue
- `scan:validating`: Target validation in progress
- `scan:running_httpx`: HTTPX scanning
- `scan:running_nmap`: Nmap scanning
- `scan:running_nuclei`: Nuclei scanning
- `scan:parsing`: Results parsing
- `scan:completed`: Scan finished
- `scan:failed`: Scan failed

**Database Tracking**:
- `scan_progress` table stores stage-by-stage progress
- Progress percentage (0-100)
- Current step and total steps
- Status messages
- Timing information

## Error Handling

### Tool Errors

**Tool Not Installed**:
- Generate critical finding
- Continue with other tools
- Log error to database

**Tool Timeout**:
- Kill process with SIGKILL
- Generate high finding
- Continue with other tools
- Log timeout event

**Parse Errors**:
- Log parse error
- Skip invalid output
- Continue with other tools
- Generate error finding

### Job Errors

**Validation Failure**:
- Return error to API
- Don't queue job
- User receives immediate feedback

**Execution Failure**:
- Update job status to failed
- Store error message
- Notify user via notification
- Emit Socket.IO event

**Partial Failure**:
- Store successful results
- Mark failed stages
- Continue with other stages
- User receives partial results

## Performance Optimization

### Parallel Execution

**Stage Parallelism**: Future enhancement - run independent stages in parallel
**Tool Parallelism**: Each tool runs in isolation
**Database Operations**: Batch inserts for efficiency

### Memory Management

**Streaming Parsing**: Parse output line-by-line
**Batch Storage**: Insert findings in batches
**Connection Pooling**: Reuse database connections
**Output Limits**: Limit raw output storage

### Caching

**DNS Resolution**: Cache DNS lookups
**Template Updates**: Cache Nuclei templates
**Tool Versions**: Cache tool version checks

## Extensibility

### Adding New Scanner Stages

**Step 1**: Create stage file
```javascript
// worker/pipeline/stages/newToolStage.js
async function runNewToolStage(scanJobId, targetUrl, validation, job) {
  // Execute tool
  // Parse output
  // Generate findings
  return { success, findings, data };
}
module.exports = { runNewToolStage };
```

**Step 2**: Add to pipeline
```javascript
// worker/pipeline/scanPipeline.js
const { runNewToolStage } = require('./stages/newToolStage');
// Add to executePipeline function
```

**Step 3**: Add parser (if needed)
```javascript
// worker/pipeline/parsers/newToolParser.js
function parseNewToolOutput(output) {
  // Parse tool output
  return parsedData;
}
module.exports = { parseNewToolOutput };
```

**Step 4**: Update Socket.IO events
```javascript
// worker/pipeline/scanPipeline.js
await updateJobStatus(scanJobId, 'running_newtool');
emitToUser(userId, 'scan:running_newtool', { scanId: scanJobId });
```

### Future Scanner Tools

**Katana** (Web Crawler):
- Crawl target website
- Discover endpoints
- Extract forms and inputs
- Generate sitemap

**Naabu** (Port Discovery):
- Fast port scanning
- Service detection
- Banner grabbing

**DNSX** (DNS Enumeration):
- DNS record enumeration
- Subdomain discovery
- DNS security checks

**Subfinder** (Subdomain Discovery):
- Passive subdomain discovery
- Certificate transparency
- Search engine queries

## Configuration

### Environment Variables

**Scanner Configuration**:
- `MAX_SCAN_TIME`: Maximum scan duration (default: 300s)
- `MAX_CONCURRENT_SCANS`: Max concurrent scans (default: 5)
- `NMAP_TIMEOUT_MS`: Nmap timeout (default: 30000ms)
- `NUCLEI_TIMEOUT_MS`: Nuclei timeout (default: 30000ms)

**Tool Paths**:
- `NMAP_PATH`: Path to Nmap executable
- `NUCLEI_PATH`: Path to Nuclei executable
- `HTTPX_PATH`: Path to HTTPX executable
- `NUCLEI_TEMPLATES_DIR`: Path to Nuclei templates

**Worker Configuration**:
- `WORKER_CONCURRENCY`: Number of concurrent jobs (default: 2)
- `ENABLE_WORKER_HEALTH_CHECK`: Enable health check server
- `WORKER_HEALTH_CHECK_PORT`: Health check port (default: 3001)

## Monitoring

### Health Checks

**Worker Health**:
```bash
GET http://worker:3001/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-07-20T00:00:00Z",
  "queue": "scan-jobs",
  "concurrency": 2
}
```

### Metrics

**Queue Statistics**:
- Waiting jobs count
- Active jobs count
- Completed jobs count
- Failed jobs count
- Delayed jobs count

**Performance Metrics**:
- Average job duration
- Tool execution time
- Parse time
- Database write time

### Logging

**Log Levels**:
- `debug`: Detailed debugging information
- `info`: General informational messages
- `warn`: Warning messages
- `error`: Error messages
- `fatal`: Critical errors

**Log Files**:
- `logs/scan-combined.log`: All scan logs
- `logs/scan-error.log`: Error logs only
- `logs/queue-combined.log`: Queue logs
- `logs/queue-error.log`: Queue error logs

## Troubleshooting

### Common Issues

**Tool Not Found**:
- Check tool installation
- Verify tool path in environment variables
- Check tool executable permissions

**Scan Timeout**:
- Increase timeout in environment variables
- Check network connectivity
- Verify target is accessible

**Queue Not Processing**:
- Check Redis connection
- Verify worker is running
- Check worker logs for errors

**Database Errors**:
- Check database connection
- Verify schema is applied
- Check database permissions

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug node worker/index.js
```

### Test Scans

Run a test scan:
```bash
curl -X POST http://localhost:5000/api/scans \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"target_url": "https://example.com"}'
```

## Best Practices

1. **Always validate input** before processing
2. **Use timeouts** for all tool executions
3. **Log errors** with context for debugging
4. **Handle partial failures** gracefully
5. **Monitor queue depth** and adjust concurrency
6. **Keep tools updated** for latest security checks
7. **Review findings** regularly for false positives
8. **Update templates** for Nuclei regularly
9. **Use rate limiting** to prevent abuse
10. **Monitor resource usage** and adjust limits
