#!/bin/bash

# Complete Deployment Script with SSL for Brenda & Diamond Wedding App
# This script deploys the app and sets up SSL automatically

set -e

echo "🚀 Starting deployment of Brenda & Diamond Wedding App..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (use sudo)"
    exit 1
fi

# Update system packages
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Docker if not installed
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    usermod -aG docker $USER
fi

# Install Docker Compose if not installed
if ! command -v docker-compose &> /dev/null; then
    echo "🐳 Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Install Nginx if not installed
if ! command -v nginx &> /dev/null; then
    echo "🌐 Installing Nginx..."
    apt install -y nginx
fi

# Install Certbot if not installed
if ! command -v certbot &> /dev/null; then
    echo "🔐 Installing Certbot..."
    apt install -y certbot python3-certbot-nginx
fi

# Configure firewall
echo "🔥 Configuring firewall..."
ufw --force enable
ufw allow 22
ufw allow 80
ufw allow 443

# Create webroot directory
mkdir -p /var/www/certbot

# Deploy Docker containers
echo "🐳 Deploying Docker containers..."
docker-compose down || true
docker-compose build --no-cache
docker-compose up -d

# Wait for app to be ready
echo "⏳ Waiting for application to start..."
sleep 30

# Test if app is running
if curl -f http://localhost:8080 > /dev/null 2>&1; then
    echo "✅ Application is running on port 8080"
else
    echo "❌ Application failed to start. Check logs with: docker-compose logs"
    exit 1
fi

# Set up SSL
echo "🔐 Setting up SSL certificates..."
chmod +x setup-ssl.sh
./setup-ssl.sh

echo "🎉 Deployment complete!"
echo "🌐 Your wedding website is now available at: https://brendabagsherdiamond.com"
echo "📧 Don't forget to update your email in setup-ssl.sh for certificate notifications"
echo "🔄 SSL certificates will be automatically renewed"

# Show running containers
echo "📊 Running containers:"
docker-compose ps

echo "🎊 Congratulations! Your wedding website is live and secure!"
