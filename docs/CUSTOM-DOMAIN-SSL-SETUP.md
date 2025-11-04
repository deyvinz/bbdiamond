# Custom Domain SSL Certificate Setup Guide

This guide covers setting up SSL certificates for Premium/Enterprise tier customers who use custom domains on your VPS.

## Quick Reference

### Quick Setup (Manual)
```bash
# 1. Issue certificate
sudo certbot certonly --nginx -d domain.com -d www.domain.com

# 2. Create Nginx config (see Method 1 below)

# 3. Enable and reload
sudo ln -s /etc/nginx/sites-available/domain.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Automated Setup
```bash
# Use the setup script
sudo /usr/local/bin/setup-custom-domain-ssl.sh domain.com www.domain.com
```

### Check Certificate Status
```bash
# List all certificates
sudo certbot certificates

# Test renewal
sudo certbot renew --dry-run

# Check expiry
sudo /usr/local/bin/check-ssl-certificates.sh
```

### Automatic Renewal
```bash
# Certbot timer is enabled by default
sudo systemctl status certbot.timer

# Manual renewal (if needed)
sudo certbot renew
sudo systemctl reload nginx
```

## Overview

When a Premium/Enterprise customer adds a custom domain:
1. Customer adds domain in admin panel
2. System verifies domain ownership (DNS TXT record)
3. SSL certificate needs to be issued via Certbot
4. Nginx configuration needs to be updated
5. Certificate needs automatic renewal

## Prerequisites

- VPS with root/sudo access
- Certbot installed: `sudo apt install certbot python3-certbot-nginx`
- Nginx installed and configured
- Domain DNS pointing to your VPS IP
- Ports 80 and 443 open in firewall

## Method 1: Manual SSL Certificate Setup (Individual Domains)

### Step 1: Customer Adds Domain in Admin Panel

1. Customer navigates to admin panel
2. Adds custom domain (e.g., `johnandsarah.com`)
3. System provides DNS TXT record for verification
4. Customer adds TXT record to their DNS
5. System verifies domain ownership

### Step 2: Issue SSL Certificate

Once domain is verified, issue the certificate:

```bash
# For single domain
sudo certbot certonly --nginx -d johnandsarah.com -d www.johnandsarah.com

# For domain without www
sudo certbot certonly --nginx -d johnandsarah.com

# Using standalone mode (if Nginx plugin doesn't work)
sudo certbot certonly --standalone -d johnandsarah.com -d www.johnandsarah.com
```

**What happens:**
- Certbot creates certificate files in `/etc/letsencrypt/live/johnandsarah.com/`
- Certificate files:
  - `fullchain.pem` - Certificate + chain
  - `privkey.pem` - Private key
  - `cert.pem` - Certificate only
  - `chain.pem` - Certificate chain

### Step 3: Add Nginx Configuration

Create a new server block for the custom domain:

```bash
sudo nano /etc/nginx/sites-available/johnandsarah.com
```

**Configuration:**
```nginx
# HTTPS server for custom domain
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name johnandsarah.com www.johnandsarah.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/johnandsarah.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/johnandsarah.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://luwani-weddings_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# HTTP → HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name johnandsarah.com www.johnandsarah.com;
    return 301 https://$host$request_uri;
}
```

### Step 4: Enable and Reload Nginx

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/johnandsarah.com /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Method 2: Automated SSL Certificate Setup (Recommended)

For production, automate the SSL certificate provisioning process.

### Step 1: Create SSL Setup Script

Create a script to automate certificate issuance and Nginx configuration:

```bash
sudo nano /usr/local/bin/setup-custom-domain-ssl.sh
```

**Script:**
```bash
#!/bin/bash

# Custom Domain SSL Setup Script
# Usage: sudo ./setup-custom-domain-ssl.sh domain.com [www.domain.com]

set -e

DOMAIN=$1
WWW_DOMAIN=$2

if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 <domain> [www.domain]"
    echo "Example: $0 johnandsarah.com www.johnandsarah.com"
    exit 1
fi

# Configuration
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
UPSTREAM_BACKEND="luwani-weddings_backend"

echo "🔐 Setting up SSL certificate for $DOMAIN..."

# Issue SSL certificate
if [ -z "$WWW_DOMAIN" ]; then
    echo "📜 Issuing certificate for $DOMAIN..."
    sudo certbot certonly --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@luwani.com
else
    echo "📜 Issuing certificate for $DOMAIN and $WWW_DOMAIN..."
    sudo certbot certonly --nginx -d "$DOMAIN" -d "$WWW_DOMAIN" --non-interactive --agree-tos --email admin@luwani.com
fi

# Create Nginx configuration
echo "📝 Creating Nginx configuration..."
sudo tee "$NGINX_SITES_AVAILABLE/$DOMAIN" > /dev/null <<EOF
# HTTPS server for custom domain: $DOMAIN
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN${WWW_DOMAIN:+ $WWW_DOMAIN};

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://$UPSTREAM_BACKEND;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# HTTP → HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN${WWW_DOMAIN:+ $WWW_DOMAIN};
    return 301 https://\$host\$request_uri;
}
EOF

# Enable site
echo "🔗 Enabling site..."
sudo ln -sf "$NGINX_SITES_AVAILABLE/$DOMAIN" "$NGINX_SITES_ENABLED/$DOMAIN"

# Test and reload Nginx
echo "🧪 Testing Nginx configuration..."
sudo nginx -t

echo "🔄 Reloading Nginx..."
sudo systemctl reload nginx

echo "✅ SSL certificate setup complete for $DOMAIN"
echo "🌐 Domain should be accessible at: https://$DOMAIN"
```

Make it executable:
```bash
sudo chmod +x /usr/local/bin/setup-custom-domain-ssl.sh
```

### Step 2: Integration with Admin Panel

Create an API endpoint or script that triggers SSL setup when a customer adds a custom domain:

**Example API endpoint** (`app/api/admin/domains/ssl/setup/route.ts`):
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  // Verify admin authentication
  // ... auth check ...

  const { domain, wwwDomain } = await request.json()

  try {
    // Execute SSL setup script
    const command = wwwDomain 
      ? `sudo /usr/local/bin/setup-custom-domain-ssl.sh ${domain} ${wwwDomain}`
      : `sudo /usr/local/bin/setup-custom-domain-ssl.sh ${domain}`
    
    const { stdout, stderr } = await execAsync(command)
    
    return NextResponse.json({ 
      success: true, 
      message: `SSL certificate issued for ${domain}`,
      output: stdout 
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
```

**Note:** This requires SSH access or sudo permissions. Consider using a background job queue or webhook system.

## Automatic Certificate Renewal

Let's Encrypt certificates expire after 90 days. Set up automatic renewal.

### Step 1: Test Certificate Renewal

```bash
# Test renewal (dry run)
sudo certbot renew --dry-run
```

### Step 2: Set Up Automatic Renewal

Certbot creates a systemd timer for automatic renewal. Verify it's active:

```bash
# Check timer status
sudo systemctl status certbot.timer

# Enable timer (if not already enabled)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Check when next renewal will run
sudo systemctl list-timers certbot.timer
```

### Step 3: Configure Renewal Hook for Nginx Reload

Create a renewal hook to reload Nginx after certificate renewal:

```bash
sudo nano /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

**Script:**
```bash
#!/bin/bash
# Reload Nginx after certificate renewal

systemctl reload nginx
echo "$(date): Nginx reloaded after certificate renewal" >> /var/log/certbot-renewal.log
```

Make it executable:
```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

### Step 4: Verify Renewal Configuration

Check renewal configuration for each domain:

```bash
# List all certificates
sudo certbot certificates

# Check renewal configuration for a specific domain
sudo cat /etc/letsencrypt/renewal/johnandsarah.com.conf
```

**Example renewal config:**
```ini
# /etc/letsencrypt/renewal/johnandsarah.com.conf
[renewalparams]
account = abc123...
server = https://acme-v02.api.letsencrypt.org/directory
authenticator = nginx
installer = nginx
```

### Step 5: Set Up Cron Job (Alternative to systemd timer)

If systemd timer isn't working, use cron:

```bash
# Edit crontab
sudo crontab -e

# Add this line (runs twice daily at 3 AM and 3 PM)
0 3,15 * * * certbot renew --quiet --deploy-hook "systemctl reload nginx"
```

## Renewal Verification Script

Create a script to verify all certificates are valid and upcoming renewals:

```bash
sudo nano /usr/local/bin/check-ssl-certificates.sh
```

**Script:**
```bash
#!/bin/bash

# Check SSL Certificate Expiry Script

echo "🔐 Checking SSL Certificate Status..."
echo ""

# List all certificates
sudo certbot certificates

echo ""
echo "📅 Upcoming Renewals:"
sudo certbot renew --dry-run 2>&1 | grep -E "(certificate expires|Renewing|would not be renewed)"

echo ""
echo "⏰ Next renewal check:"
sudo systemctl list-timers certbot.timer --no-pager
```

Make it executable:
```bash
sudo chmod +x /usr/local/bin/check-ssl-certificates.sh
```

Run it:
```bash
sudo /usr/local/bin/check-ssl-certificates.sh
```

## Troubleshooting

### Certificate Renewal Fails

**Issue:** Renewal fails with "Domain not found" or "Challenge failed"

**Solution:**
1. Verify DNS is still pointing to your VPS:
   ```bash
   dig +short domain.com
   ```
2. Check if domain is accessible:
   ```bash
   curl -I http://domain.com/.well-known/acme-challenge/test
   ```
3. Manually renew:
   ```bash
   sudo certbot renew --force-renewal -d domain.com
   ```

### Nginx Configuration Errors After Renewal

**Issue:** Nginx fails to reload after certificate renewal

**Solution:**
1. Test Nginx config:
   ```bash
   sudo nginx -t
   ```
2. Check certificate files exist:
   ```bash
   ls -la /etc/letsencrypt/live/domain.com/
   ```
3. Verify certificate paths in Nginx config match actual paths

### Certificate Expired

**Issue:** Certificate has expired

**Solution:**
1. Force renewal:
   ```bash
   sudo certbot renew --force-renewal -d domain.com
   ```
2. Reload Nginx:
   ```bash
   sudo systemctl reload nginx
   ```

### Multiple Domains on Same Certificate

**Issue:** Want to add www subdomain to existing certificate

**Solution:**
1. Expand certificate:
   ```bash
   sudo certbot certonly --nginx -d domain.com -d www.domain.com --expand
   ```
2. Update Nginx config to include www subdomain
3. Reload Nginx

## Best Practices

### 1. Use Wildcard Certificates (Optional)

For many subdomains, consider wildcard certificates:

```bash
# Issue wildcard certificate (requires DNS challenge)
sudo certbot certonly --manual --preferred-challenges dns -d "*.luwani.com" -d luwani.com
```

**Note:** Wildcard certificates require DNS challenge, not HTTP challenge.

### 2. Monitor Certificate Expiry

Set up monitoring to alert when certificates are expiring soon:

```bash
# Add to monitoring script
sudo nano /usr/local/bin/monitor-ssl-expiry.sh
```

**Script:**
```bash
#!/bin/bash

# Check certificates expiring in next 30 days
for cert in /etc/letsencrypt/live/*/cert.pem; do
    domain=$(echo $cert | cut -d'/' -f5)
    expiry=$(openssl x509 -enddate -noout -in "$cert" | cut -d'=' -f2)
    expiry_epoch=$(date -d "$expiry" +%s)
    now_epoch=$(date +%s)
    days_until_expiry=$(( ($expiry_epoch - $now_epoch) / 86400 ))
    
    if [ $days_until_expiry -lt 30 ]; then
        echo "⚠️  WARNING: $domain expires in $days_until_expiry days"
    fi
done
```

### 3. Backup Certificates

Backup certificates regularly:

```bash
# Backup script
sudo nano /usr/local/bin/backup-ssl-certificates.sh
```

**Script:**
```bash
#!/bin/bash

BACKUP_DIR="/backup/letsencrypt"
DATE=$(date +%Y%m%d)

mkdir -p "$BACKUP_DIR/$DATE"
cp -r /etc/letsencrypt/live "$BACKUP_DIR/$DATE/"
cp -r /etc/letsencrypt/archive "$BACKUP_DIR/$DATE/"
tar -czf "$BACKUP_DIR/letsencrypt-backup-$DATE.tar.gz" "$BACKUP_DIR/$DATE"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -type d -mtime +7 -exec rm -rf {} \;
```

### 4. Rate Limits

Let's Encrypt has rate limits:
- 50 certificates per registered domain per week
- 5 duplicate certificates per week

**Monitor usage:**
```bash
# Check certificate count
sudo certbot certificates | grep -c "Certificate Name"
```

## Integration with Database

When a customer adds a custom domain, update the database and trigger SSL setup:

1. **Customer adds domain** → `wedding_domains` table updated
2. **Domain verified** → `is_verified = true`
3. **Trigger SSL setup** → Call setup script or API endpoint
4. **Update database** → Store certificate path or status

**Example database update:**
```sql
UPDATE wedding_domains 
SET 
    ssl_certificate_path = '/etc/letsencrypt/live/domain.com/fullchain.pem',
    ssl_issued_at = NOW(),
    ssl_expires_at = NOW() + INTERVAL '90 days'
WHERE domain = 'domain.com';
```

## Summary

1. **Manual Setup:** Use Certbot to issue certificates for individual domains
2. **Automated Setup:** Create script to automate certificate issuance and Nginx configuration
3. **Auto-Renewal:** Certbot timer handles automatic renewal (runs twice daily)
4. **Monitoring:** Set up scripts to monitor certificate expiry
5. **Backup:** Regularly backup certificates
6. **Integration:** Connect SSL setup with your admin panel workflow

For production, automate as much as possible and set up monitoring to catch issues early.

