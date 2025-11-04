# SSL Setup Script - Issues Fixed and Multi-Tenant Adaptations

## Issues Found in Original Script

### 1. **Duplicate Code Blocks**
- Lines 8-56 and 58-85 were nearly identical
- Hardcoded values (lines 58-60) overrode command-line arguments
- **Fixed:** Removed duplicates, kept only command-line argument parsing

### 2. **Invalid Comment Syntax**
- Used `//` instead of `#` for comments (lines 7, 44, 50, 73, 79)
- **Fixed:** Replaced all `//` with `#`

### 3. **Flawed Port Checking Logic**
- Port detection logic was incorrect (line 52)
- Port parameter not needed for multi-tenant (all use same upstream)
- **Fixed:** Removed port checking (uses upstream backend instead)

### 4. **Hardcoded Values**
- Domain and email hardcoded (lines 58-60)
- **Fixed:** Removed hardcoded values, uses command-line arguments only

### 5. **Wrong Proxy Configuration**
- Used `localhost:$PORT` instead of upstream backend
- Not suitable for multi-tenant architecture
- **Fixed:** Uses `luwani-weddings_backend` upstream

### 6. **Removed Default Site**
- Script removed default Nginx site (line 138)
- May break other services
- **Fixed:** Only removes if explicitly needed, safer approach

### 7. **Cron Job Overwrites**
- Cron job file overwritten instead of checked
- Could break existing renewal setup
- **Fixed:** Checks if cron job exists before creating

### 8. **No Update Mode**
- Couldn't update existing configuration
- **Fixed:** Added `--update` flag

### 9. **No Option to Skip WWW**
- Always included www subdomain
- **Fixed:** Added `--no-www` flag

### 10. **No Certificate Existence Check**
- Tried to get certificate even if it exists
- **Fixed:** Checks for existing certificate and offers to update

## Multi-Tenant Adaptations

### 1. **Upstream Backend Integration**
- **Before:** `proxy_pass http://localhost:$PORT`
- **After:** `proxy_pass http://luwani-weddings_backend`
- **Why:** All tenants share the same Docker backend, Nginx routes by domain

### 2. **Domain-Only Configuration**
- Removed port parameter (not needed)
- Each domain gets its own Nginx config file
- All domains proxy to the same backend
- Next.js middleware resolves domain → wedding_id

### 3. **Flexible Domain Handling**
- Supports both `domain.com` and `www.domain.com`
- Optional `--no-www` flag for domains without www
- Handles multiple domains per certificate

### 4. **Better Error Handling**
- Validates domain format
- Checks for existing configuration
- Provides clear error messages
- Confirms before overwriting

### 5. **Certificate Management**
- Checks if certificate already exists
- Update mode for existing certificates
- Better integration with Certbot renewal

## Usage Examples

### Basic Usage
```bash
sudo ./setup-ssl.sh johnandsarah.com admin@luwani.com
```
Sets up SSL for both `johnandsarah.com` and `www.johnandsarah.com`

### Domain Only (No WWW)
```bash
sudo ./setup-ssl.sh johnandsarah.com admin@luwani.com --no-www
```
Sets up SSL only for `johnandsarah.com` (no www subdomain)

### Update Existing Configuration
```bash
sudo ./setup-ssl.sh johnandsarah.com --update
```
Updates Nginx config for existing certificate (useful after certificate renewal)

## Architecture Integration

### Multi-Tenant Flow
1. Customer adds custom domain in admin panel
2. Domain added to `wedding_domains` table
3. Admin runs `setup-ssl.sh` to issue certificate
4. Nginx routes requests to `luwani-weddings_backend`
5. Next.js middleware resolves domain → wedding_id
6. Application serves tenant-specific content

### Nginx Configuration Structure
```
/etc/nginx/sites-available/
├── luwani-weddings          # Main platform (wildcard subdomain)
├── johnandsarah.com         # Custom domain 1
├── smithwedding.com         # Custom domain 2
└── ...
```

All configurations proxy to the same upstream:
```nginx
upstream luwani-weddings_backend {
    server 127.0.0.1:8080;
}
```

## Testing

### Verify Setup
```bash
# Check Nginx config
sudo nginx -t

# Test certificate
sudo certbot certificates

# Test domain resolution
curl -I https://domain.com
```

### Check Renewal
```bash
# Test renewal (dry run)
sudo certbot renew --dry-run

# Check renewal timer
sudo systemctl status certbot.timer
```

## Integration with Admin Panel

The script can be called from your admin panel when a customer adds a custom domain:

```typescript
// Example API endpoint
export async function POST(request: NextRequest) {
  const { domain, email, includeWww } = await request.json()
  
  // Verify admin permissions
  // ...
  
  // Execute SSL setup
  const command = includeWww
    ? `sudo /path/to/setup-ssl.sh ${domain} ${email}`
    : `sudo /path/to/setup-ssl.sh ${domain} ${email} --no-www`
  
  // Execute via SSH or local command
  // ...
  
  // Update database
  await updateWeddingDomain(domain, {
    ssl_certificate_path: `/etc/letsencrypt/live/${domain}/fullchain.pem`,
    ssl_issued_at: new Date(),
    ssl_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  })
}
```

## Security Considerations

1. **Certificate Storage**: Certificates stored in `/etc/letsencrypt/` (protected)
2. **Nginx Config**: Only root can modify (via sudo)
3. **Automatic Renewal**: Runs with root privileges (secure)
4. **Domain Validation**: Certbot validates domain ownership before issuing

## Best Practices

1. **Always use sudo** when running the script
2. **Verify DNS** before running (domain must point to server)
3. **Test configuration** before deploying (nginx -t)
4. **Monitor certificates** with monitoring script
5. **Backup certificates** regularly
6. **Update database** after SSL setup completes

## Troubleshooting

### Certificate Issuance Fails
- Check DNS: `dig +short domain.com`
- Verify port 80 is accessible
- Check domain ownership verification

### Nginx Reload Fails
- Test config: `sudo nginx -t`
- Check certificate paths exist
- Verify upstream backend is running

### Renewal Not Working
- Check Certbot timer: `sudo systemctl status certbot.timer`
- Test renewal: `sudo certbot renew --dry-run`
- Check cron job: `sudo cat /etc/cron.d/certbot-renewal`

