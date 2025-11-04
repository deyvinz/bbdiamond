# VPS Deployment Guide - Multi-Tenant Setup

This guide covers the enhanced deployment configuration for running all subscription tiers (Basic, Premium, Enterprise) on a single VPS with system-level Nginx.

## Architecture Overview

- **VPS System Nginx**: Handles SSL certificates, reverse proxy (ports 80/443)
- **Docker Containers**: Next.js app (port 8080) + Redis (internal only)
- **SSL**: Managed by system Certbot (not in Docker)
- **Multi-Tenant**: All tiers run on same infrastructure with logical isolation

## Changes Made

### 1. Docker Compose (`docker-compose.yml`)

**Added:**
- Resource limits (2-core, 8GB VPS constraints)
- Health checks for app and Redis
- `DEPLOYMENT_MODE=saas` environment variable
- Tier-based rate limit configuration
- Redis memory limits and eviction policy
- Removed exposed Redis port (security - internal only)

**Resource Allocation:**
- App: 1.5 CPU cores, 3GB RAM (per instance)
- Redis: 0.3 CPU cores, 1.2GB RAM
- System/Nginx: ~1GB RAM, 0.2 CPU cores

### 2. Dockerfile

**Added:**
- `wget` package for health checks

### 3. Environment Variables

**New variables to add to `.env`:**
```env
DEPLOYMENT_MODE=saas
NEXT_PUBLIC_APP_URL=https://yourdomain.com
RATE_LIMIT_BASIC=50
RATE_LIMIT_PREMIUM=200
RATE_LIMIT_ENTERPRISE=1000
```

## Implementation Steps

### Step 1: Backup Current Setup

```bash
cd /path/to/bbdiamond
docker-compose down
cp docker-compose.yml docker-compose.yml.backup
```

### Step 2: Update Environment Variables

1. Copy `env.production.example` to `.env` if not exists:
   ```bash
   cp env.production.example .env
   ```

2. Edit `.env` and ensure these variables are set:
   ```env
   DEPLOYMENT_MODE=saas
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   RATE_LIMIT_BASIC=50
   RATE_LIMIT_PREMIUM=200
   RATE_LIMIT_ENTERPRISE=1000
   ```

### Step 3: Update VPS Nginx Configuration

1. Copy the example config:
   ```bash
   sudo cp nginx-vps.conf.example /etc/nginx/sites-available/bbdiamond
   ```

2. Edit the config:
   ```bash
   sudo nano /etc/nginx/sites-available/bbdiamond
   ```

3. Update the following:
   - Replace `yourdomain.com` with your actual domain
   - Update SSL certificate paths if different
   - Adjust upstream server if using different port

4. Enable the site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/bbdiamond /etc/nginx/sites-enabled/
   ```

5. Test and reload:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### Step 4: Rebuild and Deploy

1. Rebuild Docker images:
   ```bash
   docker-compose build --no-cache
   ```

2. Start with single instance (test first):
   ```bash
   docker-compose up -d
   ```

3. Verify services are healthy:
   ```bash
   docker-compose ps
   docker-compose logs -f app
   ```

4. Check health endpoint:
   ```bash
   curl http://localhost:8080/api/health
   ```

### Step 5: Scale to Multiple Instances (Optional)

For better performance and redundancy:

```bash
docker-compose up -d --scale app=2
```

**Note:** Update Nginx upstream to include multiple ports if scaling:
```nginx
upstream bbdiamond_backend {
    server 127.0.0.1:8080 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:8081 max_fails=3 fail_timeout=30s;
    keepalive 32;
}
```

Update `docker-compose.yml` to expose multiple ports:
```yaml
ports:
  - "8080:3000"
  - "8081:3000"
```

### Step 6: Cleanup Unused Containers

```bash
# Remove unused Docker containers
docker rm glumia-nginx glumia-certbot 2>/dev/null || true
```

## Testing

### Test Subdomain Routing (Basic Tier)

1. Ensure DNS is configured: `*.yourdomain.com` → VPS IP
2. Access: `https://couple.yourdomain.com`
3. Verify Next.js middleware resolves wedding_id from subdomain

### Test Custom Domain (Premium/Enterprise)

1. Customer adds custom domain in admin panel
2. System verifies domain ownership (DNS TXT record)
3. Issue SSL certificate:
   ```bash
   sudo certbot certonly --nginx -d customdomain.com -d www.customdomain.com
   ```
4. Add server block to Nginx (or use catch-all)
5. Test: `https://customdomain.com`

### Verify Tenant Isolation

1. Create test data for Wedding A
2. Access via subdomain/custom domain for Wedding A
3. Verify data is isolated (cannot access Wedding B data)

## Monitoring

### Check Container Health

```bash
docker-compose ps
docker inspect --format='{{.State.Health.Status}}' bbdiamond-app-1
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f redis
```

### Resource Usage

```bash
docker stats
```

### Application Health

```bash
curl http://localhost:8080/api/health
```

## Troubleshooting

### App Container Fails Health Check

1. Check logs: `docker-compose logs app`
2. Verify health endpoint: `curl http://localhost:8080/api/health`
3. Check Redis connection
4. Verify environment variables are set

### Redis Connection Issues

1. Verify Redis is healthy: `docker-compose ps redis`
2. Check Redis logs: `docker-compose logs redis`
3. Test connection: `docker-compose exec redis redis-cli ping`
4. Verify `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` in `.env`

### Nginx 502 Bad Gateway

1. Check if app container is running: `docker-compose ps`
2. Verify app is listening on port 8080: `netstat -tulpn | grep 8080`
3. Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`
4. Verify upstream in Nginx config points to `127.0.0.1:8080`

### High Memory Usage

1. Check resource limits: `docker stats`
2. Scale down if needed: `docker-compose up -d --scale app=1`
3. Adjust Redis memory limit in `docker-compose.yml`
4. Monitor with: `free -h` and `docker stats`

## Capacity Estimates

**With 2 App Instances:**
- Basic tier: ~200-500 active tenants
- Premium tier: ~50-150 active tenants
- Enterprise tier: ~10-30 active tenants
- **Total: ~300-700 weddings simultaneously**

**Resource Usage:**
- ~5.2GB RAM used, 2.0 CPU cores
- Fits comfortably in 8GB/2-core VPS

## Custom Domain SSL Automation (Future)

For automated SSL certificate provisioning when customers add custom domains:

1. Implement domain verification webhook
2. Trigger Certbot via API or script
3. Auto-generate Nginx config for new domain
4. Reload Nginx automatically

## Rollback

If issues occur:

```bash
# Stop new containers
docker-compose down

# Restore backup
cp docker-compose.yml.backup docker-compose.yml

# Restart with old config
docker-compose up -d
```

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Verify environment variables match `.env` file
- Test health endpoint: `curl http://localhost:8080/api/health`

