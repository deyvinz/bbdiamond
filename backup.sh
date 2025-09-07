#!/bin/bash

# Backup script for the wedding app
# This script creates backups of Redis data and application state

set -e

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="wedding_app_backup_${DATE}.tar.gz"

echo "💾 Starting backup process..."

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create Redis backup
echo "🔴 Backing up Redis data..."
docker-compose exec -T redis redis-cli --rdb /data/dump.rdb
docker cp $(docker-compose ps -q redis):/data/dump.rdb ./redis_dump.rdb

# Create application backup (excluding node_modules and .next)
echo "📦 Backing up application files..."
tar -czf $BACKUP_FILE \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=backups \
  --exclude=.git \
  --exclude=redis_dump.rdb \
  .

# Move backup to backup directory
mv $BACKUP_FILE $BACKUP_DIR/

# Clean up temporary files
rm -f redis_dump.rdb

echo "✅ Backup completed: $BACKUP_DIR/$BACKUP_FILE"

# Optional: Upload to cloud storage (uncomment and configure as needed)
# echo "☁️ Uploading to cloud storage..."
# aws s3 cp $BACKUP_DIR/$BACKUP_FILE s3://your-backup-bucket/
# echo "✅ Backup uploaded to cloud storage"
