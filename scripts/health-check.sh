#!/bin/bash

# Health check script for the wedding app
# This script checks if all services are running properly

set -e

echo "🏥 Running health checks..."

# Check if Docker containers are running
echo "📦 Checking Docker containers..."
if ! docker-compose ps | grep -q "Up"; then
    echo "❌ Some containers are not running"
    docker-compose ps
    exit 1
fi

# Check if the app is responding
echo "🌐 Checking application health..."
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Application is responding"
else
    echo "❌ Application is not responding on port 3000"
    exit 1
fi

# Check Redis connection
echo "🔴 Checking Redis connection..."
if docker-compose exec -T redis redis-cli ping | grep -q "PONG"; then
    echo "✅ Redis is responding"
else
    echo "❌ Redis is not responding"
    exit 1
fi

# Check Nginx
echo "🌐 Checking Nginx..."
if curl -f http://localhost > /dev/null 2>&1; then
    echo "✅ Nginx is responding"
else
    echo "❌ Nginx is not responding on port 80"
    exit 1
fi

echo "✅ All health checks passed!"
