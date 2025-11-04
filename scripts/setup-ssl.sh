#!/bin/bash

# SSL Setup Script for Multi-Tenant Wedding App
# Sets up SSL certificates for custom domains (Premium/Enterprise tier)
# Usage: sudo ./setup-ssl.sh <domain> <email> [--no-www] [--update]

set -e

# Configuration
UPSTREAM_BACKEND="luwani-weddings_backend"
DEFAULT_EMAIL="admin@luwani.com"
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
CERTBOT_WEBROOT="/var/www/certbot"

# Parse arguments
DOMAIN=""
EMAIL=""
NO_WWW=false
UPDATE_MODE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --no-www)
            NO_WWW=true
            shift
            ;;
        --update)
            UPDATE_MODE=true
            shift
            ;;
        -*)
            echo "Unknown option: $1"
            exit 1
            ;;
        *)
            if [ -z "$DOMAIN" ]; then
                DOMAIN="$1"
            elif [ -z "$EMAIL" ]; then
                EMAIL="$1"
            else
                echo "Too many arguments"
                exit 1
            fi
            shift
            ;;
    esac
done

# Validate required arguments
if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 <domain> [email] [--no-www] [--update]"
    echo ""
    echo "Examples:"
    echo "  $0 johnandsarah.com admin@luwani.com"
    echo "  $0 johnandsarah.com admin@luwani.com --no-www"
    echo "  $0 johnandsarah.com --update"
    echo ""
    echo "Options:"
    echo "  --no-www    Skip www subdomain (only issue certificate for domain.com)"
    echo "  --update    Update existing Nginx configuration (keep existing certificate)"
    exit 1
fi

# Use default email if not provided
if [ -z "$EMAIL" ]; then
    EMAIL="$DEFAULT_EMAIL"
    echo "⚠️  No email provided, using default: $EMAIL"
fi

# Validate domain format
if ! [[ "$DOMAIN" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$ ]]; then
    echo "❌ Invalid domain format: $DOMAIN"
    exit 1
fi

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

echo "🔐 Setting up SSL certificate for: $DOMAIN"
echo "📧 Email: $EMAIL"
if [ "$NO_WWW" = true ]; then
    echo "🌐 Mode: Domain only (no www)"
else
    echo "🌐 Mode: Domain + www"
fi
if [ "$UPDATE_MODE" = true ]; then
    echo "🔄 Mode: Update existing configuration"
fi
echo ""

# Check if domain is already configured
CONFIG_FILE="$NGINX_SITES_AVAILABLE/$DOMAIN"
if [ -f "$CONFIG_FILE" ] && [ "$UPDATE_MODE" = false ]; then
    echo "⚠️  Domain $DOMAIN is already configured in $CONFIG_FILE"
    echo "   Use --update flag to update existing configuration, or"
    echo "   Remove the existing config first: sudo rm $CONFIG_FILE"
    exit 1
fi

# Check if certificate already exists
CERT_PATH="/etc/letsencrypt/live/$DOMAIN"
if [ -d "$CERT_PATH" ] && [ "$UPDATE_MODE" = false ]; then
    echo "⚠️  SSL certificate already exists for $DOMAIN"
    echo "   Certificate path: $CERT_PATH"
    echo "   Use --update flag to update Nginx configuration only"
    read -p "   Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Install required packages
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing Nginx..."
    apt-get update
    apt-get install -y nginx
fi

if ! command -v certbot &> /dev/null; then
    echo "📦 Installing Certbot..."
    apt-get install -y certbot python3-certbot-nginx
fi

# Create webroot directory for Certbot
if [ ! -d "$CERTBOT_WEBROOT" ]; then
    echo "📁 Creating Certbot webroot directory..."
    mkdir -p "$CERTBOT_WEBROOT"
    chown -R www-data:www-data "$CERTBOT_WEBROOT"
fi

# Prepare domain list for certificate
DOMAIN_LIST="-d $DOMAIN"
if [ "$NO_WWW" = false ]; then
    DOMAIN_LIST="$DOMAIN_LIST -d www.$DOMAIN"
fi

# Get SSL certificate (if not updating or certificate doesn't exist)
if [ "$UPDATE_MODE" = false ] || [ ! -d "$CERT_PATH" ]; then
    echo "🔒 Obtaining SSL certificate..."
    
    # Create temporary HTTP-only Nginx config for certificate issuance
    if [ ! -f "$CONFIG_FILE" ] || [ "$UPDATE_MODE" = true ]; then
        cat > "$CONFIG_FILE" << EOF
# Temporary configuration for SSL certificate issuance
server {
    listen 80;
    server_name $DOMAIN${NO_WWW:+}${NO_WWW:- www.$DOMAIN};
    
    location /.well-known/acme-challenge/ {
        root $CERTBOT_WEBROOT;
    }
    
    location / {
        proxy_pass http://$UPSTREAM_BACKEND;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
        
        # Enable site temporarily
        ln -sf "$CONFIG_FILE" "$NGINX_SITES_ENABLED/$DOMAIN"
        nginx -t && systemctl reload nginx
    fi
    
    # Issue certificate
    if certbot certonly --webroot \
        --webroot-path="$CERTBOT_WEBROOT" \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --non-interactive \
        $DOMAIN_LIST; then
        echo "✅ SSL certificate obtained successfully"
    else
        echo "❌ Failed to obtain SSL certificate"
        echo "   Make sure:"
        echo "   1. Domain DNS points to this server"
        echo "   2. Port 80 is accessible from the internet"
        echo "   3. Domain is not already in use by another certificate"
        exit 1
    fi
else
    echo "ℹ️  Using existing SSL certificate at $CERT_PATH"
fi

# Create final Nginx configuration with SSL
echo "📝 Creating Nginx configuration..."

SERVER_NAMES="$DOMAIN"
if [ "$NO_WWW" = false ]; then
    SERVER_NAMES="$SERVER_NAMES www.$DOMAIN"
fi

cat > "$CONFIG_FILE" << EOF
# HTTP server - redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_NAMES;
    
    # Certbot webroot for renewal
    location /.well-known/acme-challenge/ {
        root $CERTBOT_WEBROOT;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $SERVER_NAMES;
    
    # SSL configuration
    ssl_certificate $CERT_PATH/fullchain.pem;
    ssl_certificate_key $CERT_PATH/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Proxy to application backend (multi-tenant)
    # Next.js middleware will resolve domain → wedding_id
    location / {
        proxy_pass http://$UPSTREAM_BACKEND;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # API rate limiting (handled by application for tier-based limits)
    location /api/ {
        proxy_pass http://$UPSTREAM_BACKEND;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable site
echo "🔗 Enabling site..."
ln -sf "$CONFIG_FILE" "$NGINX_SITES_ENABLED/$DOMAIN"

# Test Nginx configuration
echo "🧪 Testing Nginx configuration..."
if ! nginx -t; then
    echo "❌ Nginx configuration test failed"
    exit 1
fi

# Reload Nginx
echo "🔄 Reloading Nginx..."
systemctl reload nginx

# Set up automatic renewal (if not already configured)
echo "⏰ Configuring automatic renewal..."
if [ ! -f /etc/cron.d/certbot-renewal ]; then
    cat > /etc/cron.d/certbot-renewal << EOF
# Renew SSL certificates twice daily
# Certbot will only renew certificates that are within 30 days of expiration
0 3 * * * root certbot renew --quiet --webroot --webroot-path=$CERTBOT_WEBROOT --deploy-hook "systemctl reload nginx"
EOF
    chmod 644 /etc/cron.d/certbot-renewal
    echo "✅ Automatic renewal cron job created"
else
    echo "ℹ️  Automatic renewal cron job already exists"
fi

# Enable and start Certbot timer (preferred method for systemd)
if systemctl is-active --quiet certbot.timer 2>/dev/null; then
    echo "ℹ️  Certbot timer is already active"
else
    systemctl enable certbot.timer
    systemctl start certbot.timer
    echo "✅ Certbot timer enabled and started"
fi

# Test renewal (dry run)
echo "🧪 Testing certificate renewal (dry run)..."
if certbot renew --dry-run > /dev/null 2>&1; then
    echo "✅ Certificate renewal test passed"
else
    echo "⚠️  Certificate renewal test had warnings (check manually)"
fi

echo ""
echo "✅ SSL setup complete!"
echo ""
echo "📋 Summary:"
echo "   Domain: $DOMAIN"
if [ "$NO_WWW" = false ]; then
    echo "   Also configured: www.$DOMAIN"
fi
echo "   SSL Certificate: $CERT_PATH"
echo "   Nginx Config: $CONFIG_FILE"
echo ""
echo "🌐 Your site is now available at:"
if [ "$NO_WWW" = false ]; then
    echo "   https://$DOMAIN"
    echo "   https://www.$DOMAIN"
else
    echo "   https://$DOMAIN"
fi
echo ""
echo "🔄 Automatic renewal is configured"
echo "📅 Certificates expire in 90 days and will be automatically renewed"
echo ""
echo "💡 Next steps:"
echo "   1. Verify domain resolves correctly: dig +short $DOMAIN"
echo "   2. Test HTTPS: curl -I https://$DOMAIN"
echo "   3. Update wedding_domains table in database with domain info"
echo "   4. Customer should add domain verification TXT record in DNS"
