#!/bin/bash

# Wedding App Deployment Script
# Run this script on your VPS to deploy the application

set -e

echo "🚀 Starting deployment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local file not found. Please create it from env.production.example"
    echo "   cp env.production.example .env.local"
    echo "   Then edit .env.local with your actual values"
    exit 1
fi

# Create SSL directory if it doesn't exist
mkdir -p ssl

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Pull latest images
echo "📥 Pulling latest images..."
docker-compose pull

# Build the application
echo "🔨 Building application..."
docker-compose build --no-cache

# Start the services
echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
echo "🔍 Checking service status..."
docker-compose ps

# Show logs
echo "📋 Recent logs:"
docker-compose logs --tail=20

echo "✅ Deployment complete!"
echo "🌐 Your app should be available at: http://your-server-ip"
echo "📊 To view logs: docker-compose logs -f"
echo "🛑 To stop: docker-compose down"
