# Wedding App - Docker Deployment Guide

This guide will help you deploy the Brenda & Diamond wedding app to your VPS using Docker.

## Prerequisites

- VPS with Docker and Docker Compose installed
- Domain name (optional, for SSL)
- Supabase project configured

## Quick Start

1. **Clone the repository to your VPS:**
   ```bash
   git clone <your-repo-url>
   cd bbdiamond
   ```

2. **Configure environment variables:**
   ```bash
   cp env.production.example .env.local
   nano .env.local  # Edit with your actual values
   ```

3. **Deploy the application:**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

4. **Check if everything is running:**
   ```bash
   chmod +x health-check.sh
   ./health-check.sh
   ```

## Environment Variables

Copy `env.production.example` to `.env.local` and configure:

### Required Variables
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE` - Your Supabase service role key
- `REDIS_PASSWORD` - Secure password for Redis

### Optional Variables
- `CACHE_PROVIDER` - Set to `redis` (default) or `upstash`
- `CACHE_NAMESPACE` - Cache namespace (default: `wg`)
- `CACHE_GUESTS_TTL_SECONDS` - Cache TTL (default: 120)

## Services

The deployment includes:

- **App**: Next.js application (port 3000)
- **Redis**: Caching service (port 6379)
- **Nginx**: Reverse proxy (ports 80, 443)

## SSL Configuration

To enable HTTPS:

1. Obtain SSL certificates (Let's Encrypt recommended)
2. Place certificates in `./ssl/` directory:
   - `cert.pem` - Certificate file
   - `key.pem` - Private key file
3. Uncomment HTTPS configuration in `nginx.conf`
4. Update domain name in nginx configuration

## Management Commands

### Start services
```bash
docker-compose up -d
```

### Stop services
```bash
docker-compose down
```

### View logs
```bash
docker-compose logs -f
```

### Restart services
```bash
docker-compose restart
```

### Update application
```bash
git pull
docker-compose build --no-cache
docker-compose up -d
```

## Backup

Create backups of your data:

```bash
chmod +x backup.sh
./backup.sh
```

This creates a backup in `./backups/` directory.

## Monitoring

### Health Check
```bash
./health-check.sh
```

### Check service status
```bash
docker-compose ps
```

### View resource usage
```bash
docker stats
```

## Troubleshooting

### Application not starting
1. Check logs: `docker-compose logs app`
2. Verify environment variables in `.env.local`
3. Ensure all required services are running

### Redis connection issues
1. Check Redis logs: `docker-compose logs redis`
2. Verify Redis password in `.env.local`
3. Test Redis connection: `docker-compose exec redis redis-cli ping`

### Nginx issues
1. Check Nginx logs: `docker-compose logs nginx`
2. Verify nginx.conf syntax
3. Check if ports 80/443 are available

### Performance issues
1. Monitor resource usage: `docker stats`
2. Check Redis memory usage
3. Review application logs for errors

## Security Considerations

- Change default Redis password
- Use strong passwords for all services
- Enable firewall rules for your VPS
- Keep Docker and system packages updated
- Regularly backup your data
- Monitor logs for suspicious activity

## Scaling

To scale the application:

1. **Horizontal scaling**: Add more app instances in docker-compose.yml
2. **Redis clustering**: Configure Redis cluster for high availability
3. **Load balancing**: Use multiple Nginx instances with a load balancer

## Support

For issues or questions:
1. Check the logs first
2. Review this documentation
3. Check GitHub issues
4. Contact the development team
