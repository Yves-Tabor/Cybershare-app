# Deployment Documentation

## Overview

This guide covers deploying the Cybershare vulnerability scanning platform to production. The system consists of multiple components that can be deployed independently or together depending on your infrastructure needs.

## System Components

### Components Overview

1. **Frontend** (React/Vite)
   - Static files served via CDN or web server
   - No server-side processing required

2. **Backend API** (Express.js)
   - RESTful API endpoints
   - Socket.IO server for real-time events
   - Queue job creation
   - Authentication and authorization

3. **Scan Worker** (Node.js)
   - Processes queued scan jobs
   - Executes security tools
   - Stores results in database
   - Can be scaled horizontally

4. **PostgreSQL Database**
   - Persistent data storage
   - User authentication data
   - Scan results and findings

5. **Redis**
   - BullMQ queue backend
   - Job scheduling and management
   - Distributed locking

## Prerequisites

### Required Services

- **Node.js**: 18.x or higher
- **PostgreSQL**: 13.x or higher
- **Redis**: 6.x or higher
- **Git**: For cloning repository

### Required Tools

- **Docker**: For containerized deployment (optional)
- **Docker Compose**: For local development (optional)
- **PM2**: For process management (optional)
- **Nginx**: For reverse proxy (recommended)

### Security Tools (for Worker)

- **Nmap**: Port scanning
- **HTTPX**: HTTP probing
- **Nuclei**: Vulnerability scanning
- **Go**: For installing ProjectDiscovery tools

## Local Development Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd Cybershare-app
```

### 2. Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Set Up Environment Variables

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your configuration

# Frontend
cd ../frontend
cp .env.example .env
# Edit .env with your configuration
```

### 4. Set Up Database

```bash
# Using PostgreSQL
createdb cybershare

# Run migrations
cd backend
psql -d cybershare -f sql/schema.sql
psql -d cybershare -f sql/scan_queue_schema.sql
```

### 5. Set Up Redis

#### Local Development (Windows with Memurai)

For Windows development, use Memurai (Redis-compatible):

1. Download and install Memurai from https://www.memurai.com/
2. Start Memurai on port 6380 (or your preferred port)
3. Configure environment variables in `backend/.env`:
   ```
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6380
   REDIS_PASSWORD=
   REDIS_DB=0
   ```

#### Local Development (macOS/Linux with Redis)

```bash
# Using Docker
docker run -d -p 6379:6379 --name redis redis:7-alpine

# Or install locally
# macOS: brew install redis && brew services start redis
# Ubuntu: sudo apt-get install redis-server && sudo systemctl start redis
```

Configure environment variables in `backend/.env`:
```
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### 6. Install Security Tools

```bash
# Install Nmap
# macOS: brew install nmap
# Ubuntu: sudo apt-get install nmap
# Windows: Download from https://nmap.org/download.html

# Install Go (required for HTTPX and Nuclei)
# macOS: brew install go
# Ubuntu: sudo apt-get install golang
# Windows: Download from https://go.dev/dl/

# Install HTTPX
go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest

# Install Nuclei
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest

# Update Nuclei templates
nuclei -update-templates
```

### 7. Start Services

```bash
# Start Redis (if not running)
redis-server

# Start Backend API
cd backend
npm run dev

# Start Worker (in separate terminal)
cd backend
node worker/index.js

# Start Frontend (in separate terminal)
cd frontend
npm run dev
```

## Production Deployment

### Option 1: Docker Deployment

#### Backend API Dockerfile

Create `backend/Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
```

#### Worker Dockerfile

Already provided in `worker/Dockerfile`

#### Frontend Dockerfile

Create `frontend/Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: cybershare
      POSTGRES_USER: cybershare
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://cybershare:${DB_PASSWORD}@postgres:5432/cybershare
      REDIS_HOST: redis
      REDIS_PORT: 6379
      NODE_ENV: production
    depends_on:
      - postgres
      - redis
    ports:
      - "5000:5000"

  worker:
    build: 
      context: ./backend
      dockerfile: worker/Dockerfile
    environment:
      DATABASE_URL: postgresql://cybershare:${DB_PASSWORD}@postgres:5432/cybershare
      REDIS_HOST: redis
      REDIS_PORT: 6379
      NODE_ENV: production
      WORKER_CONCURRENCY: 2
    depends_on:
      - postgres
      - redis
      - backend

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
```

#### Deploy with Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Option 2: Cloud Platform Deployment

#### Render Deployment

**Redis Configuration for Render:**

For production deployment on Render, use Render's Key Value store (Redis):

1. Create a new Redis instance on Render (Key Value store)
2. Render will provide a `REDIS_URL` environment variable automatically
3. The application will automatically use `REDIS_URL` when available
4. No need to configure `REDIS_HOST`, `REDIS_PORT`, etc. in production

**Backend API (Single Web Service):**

For small deployments and testing, the BullMQ worker runs in the same process as the Express API. This requires only one Render Web Service.

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set build command: `cd backend && npm install`
4. Set start command: `cd backend && node server.js`
5. Add environment variables:
   - `DATABASE_URL`: PostgreSQL connection string (from Render PostgreSQL)
   - `REDIS_URL`: (Auto-provided by Render Key Value store)
   - `JWT_SECRET`: Your JWT secret (generate a strong random string)
   - `GOOGLE_CLIENT_ID`: Google OAuth client ID
   - `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
   - `GOOGLE_CALLBACK_URL`: `https://your-backend-url.onrender.com/api/auth/google/callback`
   - `CLIENT_URL`: Frontend URL (e.g., `https://your-frontend-url.onrender.com`)
   - `NODE_ENV`: `production`
   - `WORKER_CONCURRENCY`: 2 (optional, defaults to 2)

**Important**: This single-service deployment runs both the Express API and the BullMQ worker in the same Node.js process. This is suitable for:
- Small deployments with low scan volume
- Testing and development environments
- Free tier deployments (requires only one Web Service)

For production deployments with higher scan volume, consider deploying the worker as a separate Background Worker (requires paid plan).

**PostgreSQL**:

1. Create a new PostgreSQL instance on Render
2. Copy the internal connection string to `DATABASE_URL` environment variable
3. Ensure SSL mode is enabled (Render provides this by default)

**Redis**:

1. Create a new Redis instance on Render (Key Value store)
2. Render automatically provides `REDIS_URL` to connected services
3. Connect the Redis instance to both Backend and Worker services
4. The application will automatically detect and use `REDIS_URL`

**Frontend**:

1. Create a new Static Site on Render
2. Connect your GitHub repository
3. Set build command: `cd frontend && npm run build`
4. Set publish directory: `frontend/dist`
5. Add environment variable:
   - `VITE_API_URL`: Backend API URL (e.g., `https://your-backend-url.onrender.com`)

#### AWS Deployment

**Using EC2**:

1. Launch EC2 instances for API and Worker
2. Install Node.js, PostgreSQL, Redis
3. Clone repository and install dependencies
4. Configure environment variables
5. Use PM2 for process management
6. Set up Nginx as reverse proxy
7. Configure SSL with Let's Encrypt

**Using ECS**:

1. Create Docker images for each service
2. Push to ECR (Elastic Container Registry)
3. Create ECS task definitions
4. Create ECS services
5. Configure load balancer
6. Set up auto-scaling

**Using RDS**:

1. Create PostgreSQL instance on RDS
2. Configure security groups
3. Copy connection string to environment variables

**Using ElastiCache**:

1. Create Redis instance on ElastiCache
2. Configure security groups
3. Copy endpoint to environment variables

### Option 3: Kubernetes Deployment

#### Namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cybershare
```

#### ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cybershare-config
  namespace: cybershare
data:
  NODE_ENV: "production"
  WORKER_CONCURRENCY: "2"
  MAX_CONCURRENT_SCANS: "5"
  MAX_SCAN_TIME: "300"
```

#### Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: cybershare-secrets
  namespace: cybershare
type: Opaque
stringData:
  DATABASE_URL: "postgresql://..."
  REDIS_PASSWORD: "..."
  JWT_SECRET: "..."
  GOOGLE_CLIENT_ID: "..."
  GOOGLE_CLIENT_SECRET: "..."
```

#### Backend Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: cybershare
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: cybershare-backend:latest
        ports:
        - containerPort: 5000
        envFrom:
        - configMapRef:
            name: cybershare-config
        - secretRef:
            name: cybershare-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: cybershare
spec:
  selector:
    app: backend
  ports:
  - port: 80
    targetPort: 5000
  type: LoadBalancer
```

#### Worker Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worker
  namespace: cybershare
spec:
  replicas: 3
  selector:
    matchLabels:
      app: worker
  template:
    metadata:
      labels:
        app: worker
    spec:
      containers:
      - name: worker
        image: cybershare-worker:latest
        ports:
        - containerPort: 3001
        envFrom:
        - configMapRef:
            name: cybershare-config
        - secretRef:
            name: cybershare-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
```

#### Frontend Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: cybershare
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: cybershare-frontend:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: cybershare
spec:
  selector:
    app: frontend
  ports:
  - port: 80
    targetPort: 80
  type: LoadBalancer
```

#### Deploy to Kubernetes

```bash
# Apply configurations
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/worker.yaml
kubectl apply -f k8s/frontend.yaml

# Check status
kubectl get pods -n cybershare
kubectl get services -n cybershare

# View logs
kubectl logs -f deployment/backend -n cybershare
kubectl logs -f deployment/worker -n cybershare
```

## Database Migration

### Running Migrations

```bash
# Apply new schema
psql -d cybershare -f sql/scan_queue_schema.sql

# Or using Node.js
node -e "
const pool = require('./src/config/database');
const fs = require('fs');
const sql = fs.readFileSync('./sql/scan_queue_schema.sql', 'utf8');
pool.query(sql).then(() => console.log('Migration complete'));
"
```

### Data Migration

If migrating from old schema:

```sql
-- Migrate existing scans to new schema
INSERT INTO scan_jobs (user_id, target_url, status, security_score, created_at, completed_at)
SELECT user_id, target_url, status, security_score, created_at, completed_at
FROM scans;

-- Migrate existing scan results
INSERT INTO scan_findings (scan_job_id, category, severity, title, description, recommendation, scanner_name)
SELECT sr.scan_id, sr.category, sr.severity, sr.title, sr.description, sr.recommendation, 'legacy'
FROM scan_results sr;
```

## Monitoring and Logging

### Application Monitoring

**PM2 Monitoring**:
```bash
pm2 monit
pm2 logs
```

**Docker Monitoring**:
```bash
docker stats
docker logs <container-id>
```

**Kubernetes Monitoring**:
```bash
kubectl top pods -n cybershare
kubectl logs -f deployment/backend -n cybershare
```

### Log Aggregation

**ELK Stack**:
- Elasticsearch for log storage
- Logstash for log processing
- Kibana for log visualization

**CloudWatch** (AWS):
- Install CloudWatch agent
- Configure log groups
- Set up metric filters

**Datadog**:
- Install Datadog agent
- Configure APM
- Set up dashboards

### Health Checks

**Backend API**:
```bash
curl http://localhost:5000/api/health
```

**Worker**:
```bash
curl http://localhost:3001/health
```

**Database**:
```bash
pg_isready -h localhost -p 5432
```

**Redis**:
```bash
redis-cli ping
```

## SSL/TLS Configuration

### Using Let's Encrypt

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        root /var/www/cybershare/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## Backup and Recovery

### Database Backup

**Automated Backup**:
```bash
# Daily backup
0 2 * * * pg_dump -U cybershare cybershare > /backups/cybershare-$(date +\%Y\%m\%d).sql
```

**Manual Backup**:
```bash
pg_dump -U cybershare cybershare > backup.sql
```

**Restore**:
```bash
psql -U cybershare cybershare < backup.sql
```

### Redis Backup

**RDB Snapshot**:
```bash
# Redis automatically saves to dump.rdb
# Copy to backup location
cp /var/lib/redis/dump.rdb /backups/redis-$(date +\%Y\%m\%d).rdb
```

### File Backup

**Application Files**:
```bash
# Backup source code
tar -czf /backups/cybershare-$(date +\%Y\%m\%d).tar.gz /path/to/cybershare
```

## Security Hardening

### Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### Application Security

- Use strong JWT secrets
- Enable HTTPS only in production
- Implement rate limiting
- Use environment variables for secrets
- Regular security updates
- Enable CORS only for trusted domains

### Database Security

- Use strong passwords
- Restrict network access
- Enable SSL connections
- Regular backups
- Monitor access logs

## Performance Optimization

### Database Optimization

**Indexing**:
- Ensure all foreign keys are indexed
- Add composite indexes for common queries
- Regular vacuum and analyze

**Connection Pooling**:
```javascript
const pool = new Pool({
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Caching

**Redis Caching**:
- Cache frequently accessed data
- Cache scan results
- Implement cache invalidation

**CDN**:
- Serve static files via CDN
- Cache API responses where appropriate

### Load Balancing

**Nginx Load Balancing**:
```nginx
upstream backend {
    least_conn;
    server backend1:5000;
    server backend2:5000;
    server backend3:5000;
}

server {
    location /api/ {
        proxy_pass http://backend;
    }
}
```

## Troubleshooting

### Common Issues

**Worker Not Processing Jobs**:
- Check Redis connection
- Verify worker is running
- Check worker logs
- Verify queue name matches

**Database Connection Errors**:
- Check DATABASE_URL
- Verify database is accessible
- Check database credentials
- Verify network connectivity

**Socket.IO Connection Issues**:
- Check CORS configuration
- Verify Socket.IO URL
- Check firewall rules
- Verify WebSocket support

**Memory Issues**:
- Reduce worker concurrency
- Increase available memory
- Check for memory leaks
- Monitor resource usage

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug node server.js
```

### Health Checks

Check all services:
```bash
# Backend
curl http://localhost:5000/api/health

# Worker
curl http://localhost:3001/health

# Database
pg_isready -h localhost -p 5432

# Redis
redis-cli ping
```

## Scaling Strategies

### Horizontal Scaling

**API Servers**:
- Deploy multiple API instances
- Use load balancer
- Enable sticky sessions for Socket.IO

**Workers**:
- Deploy multiple worker instances
- Use shared Redis queue
- Monitor queue depth

**Database**:
- Use read replicas
- Implement connection pooling
- Consider sharding for large datasets

### Vertical Scaling

**Increase Resources**:
- More CPU cores
- More RAM
- Faster storage (SSD)
- Better network bandwidth

## Cost Optimization

**Reserved Instances**: Use reserved instances for predictable workloads
**Spot Instances**: Use spot instances for workers (fault-tolerant)
**Auto-scaling**: Scale based on demand
**Right-sizing**: Monitor and adjust resource allocation

## Maintenance

### Regular Tasks

- **Daily**: Monitor logs and metrics
- **Weekly**: Review security updates
- **Monthly**: Database maintenance, backup verification
- **Quarterly**: Security audit, performance review

### Update Process

1. Test updates in staging
2. Create database backups
3. Deploy updates during low traffic
4. Monitor for issues
5. Roll back if necessary

## Support and Documentation

- **Architecture**: See `Architecture.md`
- **Scanner**: See `Scanner.md`
- **Worker**: See `Worker.md`
- **Queue**: See `Queue.md`

## Contact

For deployment issues or questions, refer to the project documentation or contact the development team.
