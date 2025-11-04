#!/bin/bash

# Enhanced Deployment Script for Multi-Tenant VPS Setup
# This script updates the deployment with resource limits and multi-tenant configuration

set -e

echo "🚀 Starting enhanced deployment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found."
    echo "📝 Creating .env from env.production.example..."
    if [ -f env.production.example ]; then
        cp env.production.example .env
        echo "⚠️  Please edit .env file with your actual values before continuing."
        echo "   Required: DEPLOYMENT_MODE=saas, NEXT_PUBLIC_APP_URL, and all Supabase/Redis variables"
        read -p "Press Enter to continue after editing .env, or Ctrl+C to exit..."
    else
        echo "❌ env.production.example not found. Cannot proceed."
        exit 1
    fi
fi

# Verify required environment variables
echo "🔍 Checking required environment variables..."
source .env

REQUIRED_VARS=("DEPLOYMENT_MODE" "NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "❌ Missing required environment variables:"
    printf '   - %s\n' "${MISSING_VARS[@]}"
    echo "   Please update your .env file and try again."
    exit 1
fi

# Backup current setup
echo "💾 Backing up current docker-compose.yml..."
if [ -f docker-compose.yml ]; then
    cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backup created"
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Build the application
echo "🔨 Building application with enhanced configuration..."
docker-compose build --no-cache

# Start services
echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 15

# Check service health
echo "🏥 Checking service health..."
docker-compose ps

# Test health endpoint
echo "🔍 Testing health endpoint..."
if curl -f http://localhost:8080/api/health > /dev/null 2>&1; then
    echo "✅ Application health check passed"
else
    echo "⚠️  Health check failed - check logs with: docker-compose logs app"
fi

# Show recent logs
echo "📋 Recent logs:"
docker-compose logs --tail=20

echo ""
echo "✅ Enhanced deployment complete!"
echo ""
echo "📊 Next steps:"
echo "   1. Scale to 2 instances (optional): docker-compose up -d --scale app=2"
echo "   2. Update VPS Nginx config: sudo cp nginx-vps.conf.example /etc/nginx/sites-available/bbdiamond"
echo "   3. Test configuration: sudo nginx -t"
echo "   4. Reload Nginx: sudo systemctl reload nginx"
echo ""
echo "📖 See docs/VPS-DEPLOYMENT-GUIDE.md for detailed instructions"
echo ""
echo "📊 View logs: docker-compose logs -f"
echo "🛑 Stop services: docker-compose down"

