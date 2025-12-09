# Complete VPS Setup Instructions for bbdiamond

This guide provides step-by-step instructions to set up a fresh Ubuntu/Debian VPS for deploying the **bbdiamond** multi-tenant wedding platform.

## Prerequisites

- **VPS Requirements:**
  - Ubuntu 22.04 LTS / 24.04 LTS or Debian 11/12
  - Minimum 2 CPU cores
  - Minimum 4GB RAM (8GB recommended)
  - Minimum 40GB SSD storage
  - Root/sudo access
  - Public IPv4 address

- **External Services:**
  - Supabase project (database + auth)
  - Domain name with DNS access
  - Resend API key (for emails)
  - Optional: Upstash Redis (alternative to self-hosted Redis)

---

## Method 1: Automated Setup Script (Recommended)

### Step 1: SSH into your VPS

```bash
ssh root@YOUR_VPS_IP
```

### Step 2: Download and Run Setup Script

```bash
# Create temporary directory
mkdir -p /tmp/bbdiamond-setup
cd /tmp/bbdiamond-setup

# Download the setup script (or copy from your local machine)
# Option A: Using curl from a URL
curl -O https://raw.githubusercontent.com/YOUR_REPO/bbdiamond/main/scripts/vps-setup.sh

# Option B: Create the script manually
nano vps-setup.sh
# Paste the contents of scripts/vps-setup.sh

# Make executable and run
chmod +x vps-setup.sh
sudo ./vps-setup.sh
```

### Step 3: Upload Your Application

```bash
# Option A: From your local machine (run this locally)
scp -r ./bbdiamond root@YOUR_VPS_IP:/var/www/

# Option B: Clone from git repository
cd /var/www/bbdiamond
git clone https://github.com/YOUR_USERNAME/bbdiamond.git .
```

### Step 4: Configure Environment

```bash
cd /var/www/bbdiamond

# Copy example env file
cp env.production.example .env

# Edit with your actual values
nano .env
```

**Required Environment Variables:**
```env
# Deployment Mode
DEPLOYMENT_MODE=saas

# Application URL (your domain)
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Supabase (from your Supabase project settings)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE=your_service_role_key

# Redis (using Docker Redis)
CACHE_PROVIDER=redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_password_here

# Email Service
RESEND_API_KEY=re_xxxxxxxxxxxx
SUPPORT_EMAIL=support@yourdomain.com
CONTACT_EMAIL=hello@yourdomain.com
```

### Step 5: Deploy Application

```bash
cd /var/www/bbdiamond
chmod +x scripts/*.sh

# Run deployment
./scripts/deploy.sh
```

### Step 6: Set Up SSL Certificate

```bash
# For your main domain
sudo ./scripts/setup-ssl.sh yourdomain.com your@email.com

# For additional custom domains (Premium/Enterprise customers)
sudo ./scripts/setup-ssl.sh customdomain.com your@email.com
```

### Step 7: Verify Deployment

```bash
# Check Docker containers
docker compose ps

# Check application health
curl http://localhost:8080/api/health

# Check via domain (after DNS propagation)
curl https://yourdomain.com/api/health
```

---

## Method 2: Manual Setup (Step-by-Step)

If you prefer manual control or the automated script doesn't work for your environment:

### 1. Update System

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    software-properties-common \
    wget \
    git \
    unzip \
    htop \
    ufw \
    fail2ban
```

### 2. Install Node.js (Latest LTS - v22)

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg

echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list

sudo apt update
sudo apt install -y nodejs

# Verify
node --version  # Should show v22.x.x
npm --version   # Should show 10.x.x

# Update npm to latest
sudo npm install -g npm@latest
```

### 3. Install Docker (Latest)

```bash
# Remove old versions
sudo apt remove docker docker-engine docker.io containerd runc 2>/dev/null || true

# Add Docker's GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Verify
docker --version
docker compose version

# Add your user to docker group (optional, to run without sudo)
sudo usermod -aG docker $USER
```

### 4. Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
nginx -v
```

### 5. Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
certbot --version
```

### 6. Configure Firewall

```bash
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw --force enable
sudo ufw status
```

### 7. Configure Fail2Ban

```bash
sudo nano /etc/fail2ban/jail.local
```

Add:
```ini
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port = ssh
maxretry = 3
```

```bash
sudo systemctl restart fail2ban
```

### 8. Set Up Swap Space (if not present)

```bash
# Check if swap exists
free -h

# Create 4GB swap if needed
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 9. Create Application Directory

```bash
sudo mkdir -p /var/www/bbdiamond
sudo chown -R $USER:$USER /var/www/bbdiamond
cd /var/www/bbdiamond
```

### 10. Upload and Deploy Application

Follow Steps 3-7 from Method 1 above.

---

## Post-Deployment Tasks

### DNS Configuration

Set up the following DNS records for your domain:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | YOUR_VPS_IP | 3600 |
| A | www | YOUR_VPS_IP | 3600 |
| A | * | YOUR_VPS_IP | 3600 |

**Note:** The wildcard `*` record enables subdomain-based multi-tenancy (e.g., `john-sarah.yourdomain.com`).

### Verify DNS Propagation

```bash
dig yourdomain.com +short
dig www.yourdomain.com +short
dig test.yourdomain.com +short  # Should all return your VPS IP
```

### Monitor Your Application

```bash
# View all logs
docker compose logs -f

# View app logs only
docker compose logs -f app

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Check resource usage
docker stats
htop
free -h
```

### Set Up Monitoring (Optional)

```bash
# Install monitoring tools
sudo apt install -y prometheus-node-exporter

# Or use a cloud monitoring service like:
# - UptimeRobot (free tier available)
# - Better Uptime
# - Datadog
```

---

## Common Issues & Troubleshooting

### Docker Container Won't Start

```bash
# Check logs
docker compose logs app

# Rebuild containers
docker compose down
docker compose build --no-cache
docker compose up -d
```

### 502 Bad Gateway

```bash
# Check if app container is running
docker compose ps

# Check if port 8080 is accessible
curl http://localhost:8080/api/health

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### SSL Certificate Issues

```bash
# Test certificate renewal
sudo certbot renew --dry-run

# Check certificate status
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal
```

### Redis Connection Failed

```bash
# Check Redis container
docker compose logs redis

# Test Redis connection
docker compose exec redis redis-cli ping
```

### Out of Memory

```bash
# Check memory usage
free -h
docker stats

# Add more swap
sudo fallocate -l 8G /swapfile2
sudo chmod 600 /swapfile2
sudo mkswap /swapfile2
sudo swapon /swapfile2
```

---

## Maintenance Tasks

### Update Application

```bash
cd /var/www/bbdiamond

# Pull latest code (if using git)
git pull origin main

# Rebuild and deploy
./scripts/deploy.sh
```

### Backup Database

Your database is hosted on Supabase, which handles backups automatically. However, you can export data manually:

```bash
# Export via Supabase CLI
npx supabase db dump -f backup.sql

# Or use pg_dump directly
pg_dump -h db.xxxxx.supabase.co -U postgres -d postgres > backup.sql
```

### Clean Up Docker

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Full cleanup (be careful!)
docker system prune -a --volumes
```

### Renew SSL Certificates

Certbot handles this automatically, but you can force renewal:

```bash
sudo certbot renew
sudo systemctl reload nginx
```

---

## Security Best Practices

1. **Keep System Updated:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Disable Root SSH Login:**
   ```bash
   sudo nano /etc/ssh/sshd_config
   # Set: PermitRootLogin no
   sudo systemctl restart sshd
   ```

3. **Use SSH Keys Only:**
   ```bash
   # On your local machine
   ssh-keygen -t ed25519
   ssh-copy-id user@YOUR_VPS_IP
   
   # On VPS
   sudo nano /etc/ssh/sshd_config
   # Set: PasswordAuthentication no
   sudo systemctl restart sshd
   ```

4. **Regular Security Audits:**
   ```bash
   # Check failed login attempts
   sudo grep "Failed password" /var/log/auth.log | tail -20
   
   # Check Fail2Ban status
   sudo fail2ban-client status sshd
   ```

5. **Enable Automatic Security Updates:**
   ```bash
   sudo apt install unattended-upgrades
   sudo dpkg-reconfigure -plow unattended-upgrades
   ```

---

## Version Information (as of December 2024)

| Software | Version | Notes |
|----------|---------|-------|
| Node.js | 22.x LTS | Latest LTS via NodeSource |
| npm | 10.x | Bundled with Node.js |
| Docker CE | 27.x | Latest stable |
| Docker Compose | 2.x | Plugin version |
| Nginx | 1.24+ | From Ubuntu/Debian repos |
| Certbot | 2.x | From Ubuntu/Debian repos |

---

## Support

If you encounter issues:

1. Check the logs: `docker compose logs -f`
2. Review the VPS deployment guide: `docs/VPS-DEPLOYMENT-GUIDE.md`
3. Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`
4. Verify environment variables match `.env` file

For application-specific issues, check the main `README.md` and `CLAUDE.md` files.

