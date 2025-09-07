#!/bin/bash

# SSL Setup and Renewal Script for Brenda & Diamond Wedding App
# This script sets up SSL certificates and configures automatic renewal

set -e

DOMAIN="brendabagsherdiamond.com"
EMAIL="your-email@example.com"  # Change this to your actual email

echo "🔐 Setting up SSL certificates for $DOMAIN..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (use sudo)"
    exit 1
fi

# Install Nginx if not already installed
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing Nginx..."
    apt update
    apt install -y nginx
fi

# Install Certbot if not already installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing Certbot..."
    apt install -y certbot python3-certbot-nginx
fi

# Create webroot directory for Certbot
mkdir -p /var/www/certbot

# Create initial Nginx configuration (without SSL)
cat > /etc/nginx/sites-available/$DOMAIN << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Certbot webroot
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Reload Nginx
systemctl reload nginx

# Get SSL certificate
echo "🔒 Obtaining SSL certificate..."
certbot certonly --webroot --webroot-path=/var/www/certbot --email $EMAIL --agree-tos --no-eff-email -d $DOMAIN -d www.$DOMAIN

# Update Nginx configuration with SSL
cat > /etc/nginx/sites-available/$DOMAIN << EOF
# HTTP server - redirect to HTTPS
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Certbot webroot
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL configuration
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
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: https://*.supabase.co; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co;" always;
    
    # Proxy to Docker container
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Test and reload Nginx
nginx -t
systemctl reload nginx

# Set up automatic renewal
echo "⏰ Setting up automatic renewal..."
cat > /etc/cron.d/certbot-renewal << EOF
# Renew SSL certificates twice daily
0 12 * * * root certbot renew --quiet --webroot --webroot-path=/var/www/certbot && systemctl reload nginx
0 0 * * * root certbot renew --quiet --webroot --webroot-path=/var/www/certbot && systemctl reload nginx
EOF

# Make the script executable
chmod +x /etc/cron.d/certbot-renewal

echo "✅ SSL setup complete!"
echo "🌐 Your site is now available at: https://$DOMAIN"
echo "🔄 Automatic renewal is configured to run twice daily"
echo "📧 Certificates will expire in 90 days and will be automatically renewed"

# Test renewal
echo "🧪 Testing certificate renewal..."
certbot renew --dry-run

echo "🎉 Setup complete! Your wedding website is ready with SSL!"
