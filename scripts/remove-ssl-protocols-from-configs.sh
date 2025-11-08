#!/bin/bash

# Remove SSL protocol settings from individual Nginx site configs
# This should be run AFTER adding SSL protocols globally to /etc/nginx/nginx.conf
# Usage: sudo ./remove-ssl-protocols-from-configs.sh

set -e

if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
BACKUP_DIR="/etc/nginx/config-backups-$(date +%Y%m%d_%H%M%S)"

echo "🔍 Removing SSL protocol settings from individual site configs..."
echo "📁 Backup directory: $BACKUP_DIR"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Find all enabled site configs
CONFIGS=$(find "$NGINX_SITES_ENABLED" -type f -name "*.conf" -o -type l -exec readlink -f {} \; 2>/dev/null | sort -u)

if [ -z "$CONFIGS" ]; then
    echo "⚠️  No site configs found in $NGINX_SITES_ENABLED"
    exit 0
fi

UPDATED_COUNT=0
SKIPPED_COUNT=0

for config in $CONFIGS; do
    # Skip if file doesn't exist (broken symlink)
    if [ ! -f "$config" ]; then
        continue
    fi
    
    # Check if config contains ssl_protocols
    if grep -q "ssl_protocols" "$config"; then
        echo "📝 Processing: $(basename $config)"
        
        # Backup original
        cp "$config" "$BACKUP_DIR/$(basename $config).backup"
        
        # Remove SSL protocol lines (keep ssl_certificate and ssl_certificate_key)
        # Remove lines: ssl_protocols, ssl_ciphers, ssl_prefer_server_ciphers
        sed -i '/^\s*ssl_protocols\s/d' "$config"
        sed -i '/^\s*ssl_ciphers\s/d' "$config"
        sed -i '/^\s*ssl_prefer_server_ciphers\s/d' "$config"
        
        # Remove empty lines that might be left
        sed -i '/^$/N;/^\n$/d' "$config"
        
        echo "  ✅ Removed SSL protocol settings"
        UPDATED_COUNT=$((UPDATED_COUNT + 1))
    else
        echo "⏭️  Skipping: $(basename $config) (no SSL protocols found)"
        SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
    fi
done

echo ""
echo "📊 Summary:"
echo "   Updated: $UPDATED_COUNT config(s)"
echo "   Skipped: $SKIPPED_COUNT config(s)"
echo "   Backups: $BACKUP_DIR"
echo ""

if [ $UPDATED_COUNT -gt 0 ]; then
    echo "🧪 Testing Nginx configuration..."
    if nginx -t; then
        echo "✅ Nginx configuration test passed"
        echo ""
        echo "⚠️  IMPORTANT: Review the changes before reloading:"
        echo "   sudo nginx -t"
        echo "   sudo diff $BACKUP_DIR/ <config-file>"
        echo ""
        read -p "Reload Nginx now? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            systemctl reload nginx
            echo "✅ Nginx reloaded"
        else
            echo "ℹ️  Nginx not reloaded. Run 'sudo systemctl reload nginx' when ready."
        fi
    else
        echo "❌ Nginx configuration test failed!"
        echo "   Restore backups from: $BACKUP_DIR"
        exit 1
    fi
else
    echo "ℹ️  No changes needed"
fi

echo ""
echo "💡 Note: SSL certificates and keys are still configured in each site."
echo "   Only the protocol/cipher settings were removed (they're now global)."

