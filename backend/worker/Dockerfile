# Scan Worker Docker Image
# Production-ready worker for running security scans

FROM node:20-alpine AS base

# Install build dependencies
RUN apk add --no-cache \
    git \
    curl \
    wget \
    python3 \
    py3-pip \
    build-base \
    nmap \
    nmap-scripts

# Install Go for building ProjectDiscovery tools
RUN apk add --no-cache go

# Install HTTPX
RUN go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest

# Install Nuclei
RUN go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest

# Update Nuclei templates
RUN nuclei -update-templates

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy worker source code
COPY worker ./worker
COPY src ./src

# Create logs directory
RUN mkdir -p /app/logs

# Set environment variables
ENV NODE_ENV=production
ENV WORKER_CONCURRENCY=2
ENV MAX_CONCURRENT_SCANS=5
ENV MAX_SCAN_TIME=300
ENV ENABLE_WORKER_HEALTH_CHECK=true
ENV WORKER_HEALTH_CHECK_PORT=3001

# Expose health check port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Run the worker
CMD ["node", "worker/index.js"]
