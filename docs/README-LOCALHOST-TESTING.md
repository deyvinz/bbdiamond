# Localhost Multi-Tenant Testing Guide

This guide explains how to test subdomains and custom domains on localhost for the multi-tenant wedding website platform.

## Overview

The platform supports multiple methods for testing subdomain and custom domain routing during local development:

1. **subdomain.localhost** pattern (Recommended)
2. **lvh.me** subdomains (Better cross-browser support)
3. **Hosts file mapping** (For testing production-like domains)
4. **Query parameters** (Quick testing override)
5. **Path-based routing** (Fallback method)

## Prerequisites

- Development server running (`npm run dev`)
- At least one wedding created in your database with a `subdomain` set
- Supabase configured and connected

## Method 1: subdomain.localhost (Recommended)

The simplest method that works natively in most modern browsers.

### Usage

Access your wedding site using:
```
http://[subdomain].localhost:3000
```

### Example

If you have a wedding with subdomain `john-sarah`:
```
http://john-sarah.localhost:3000
```

### Browser Support

- ✅ Chrome/Edge (native support)
- ✅ Firefox (native support)
- ⚠️ Safari (may require configuration)
- ❌ Some older browsers

### Limitations

- Only works in development mode
- Some browsers may require additional configuration
- Cookies may behave differently than production

## Method 2: lvh.me Subdomains

Using `lvh.me` (which resolves to 127.0.0.1) provides better cross-browser compatibility.

### Usage

Access your wedding site using:
```
http://[subdomain].lvh.me:3000
```

### Example

If you have a wedding with subdomain `john-sarah`:
```
http://john-sarah.lvh.me:3000
```

### Browser Support

- ✅ All modern browsers (since it's a real domain)
- ✅ Better cookie handling than .localhost
- ✅ More production-like behavior

### Why lvh.me?

The domain `lvh.me` and all its subdomains resolve to `127.0.0.1`, making it perfect for local testing without modifying your hosts file.

## Method 3: Hosts File Mapping

Map production-like domains to localhost using your system's hosts file.

### Windows Setup

1. Open Notepad as Administrator
2. Open file: `C:\Windows\System32\drivers\etc\hosts`
3. Add lines like:
   ```
   127.0.0.1    john-sarah.weddingplatform.com
   127.0.0.1    couple.local
   ```
4. Save the file
5. Access: `http://john-sarah.weddingplatform.com:3000`

### macOS/Linux Setup

1. Open terminal
2. Edit hosts file: `sudo nano /etc/hosts`
3. Add lines like:
   ```
   127.0.0.1    john-sarah.weddingplatform.com
   127.0.0.1    couple.local
   ```
4. Save (Ctrl+O, Enter, Ctrl+X)
5. Access: `http://john-sarah.weddingplatform.com:3000`

### Advantages

- ✅ Works exactly like production domains
- ✅ Best for testing custom domains
- ✅ No browser compatibility issues

### Disadvantages

- ⚠️ Requires system file modification
- ⚠️ Need to add/remove entries manually
- ⚠️ Can conflict with actual domain resolution

### Clearing DNS Cache

After modifying hosts file, you may need to clear DNS cache:

**Windows:**
```powershell
ipconfig /flushdns
```

**macOS:**
```bash
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
```

**Linux:**
```bash
sudo systemd-resolve --flush-caches
# or for older systems:
sudo /etc/init.d/nscd restart
```

## Method 4: Query Parameters

Quick testing method using URL query parameters. Only works in development mode.

### Usage

Access with wedding ID:
```
http://localhost:3000?weddingId=[wedding-uuid]
```

Or with subdomain:
```
http://localhost:3000?subdomain=john-sarah
```

### Examples

```
# By wedding ID
http://localhost:3000?weddingId=123e4567-e89b-12d3-a456-426614174000

# By subdomain
http://localhost:3000?subdomain=john-sarah
```

### Advantages

- ✅ No domain configuration needed
- ✅ Quick and easy for testing
- ✅ Works with any subdomain/wedding

### Disadvantages

- ⚠️ Only works in development mode
- ⚠️ URL contains testing parameters
- ⚠️ Not production-like

## Method 5: Path-Based Routing

Fallback method using path-based routing (already implemented).

### Usage

Access using the wedding slug:
```
http://localhost:3000/w/[slug]
```

### Example

If wedding has slug `john-sarah-wedding`:
```
http://localhost:3000/w/john-sarah-wedding
```

### Advantages

- ✅ Always works, no configuration
- ✅ Good fallback option

### Disadvantages

- ⚠️ Not the production URL pattern
- ⚠️ Less intuitive than subdomain routing

## Environment Variables

### ENABLE_LOCALHOST_TESTING

Controls whether localhost testing features are enabled.

```bash
# Enable (default in development)
ENABLE_LOCALHOST_TESTING=true

# Disable (for production-like testing)
ENABLE_LOCALHOST_TESTING=false
```

**Default:** `true` (automatically enabled when `NODE_ENV=development`)

## Testing Custom Domains

To test custom domains on localhost:

1. **Add domain to hosts file:**
   ```
   127.0.0.1    customdomain.com
   ```

2. **Add domain to database:**
   ```sql
   INSERT INTO wedding_domains (wedding_id, domain, is_verified, is_primary)
   VALUES ('your-wedding-id', 'customdomain.com', true, true);
   ```

3. **Access:**
   ```
   http://customdomain.com:3000
   ```

**Note:** Set `is_verified=true` in development to skip DNS verification.

## Troubleshooting

### Subdomain Not Resolving

1. **Check subdomain exists in database:**
   ```sql
   SELECT id, subdomain FROM weddings WHERE subdomain = 'your-subdomain';
   ```

2. **Verify environment:**
   - Ensure `NODE_ENV=development` or `ENABLE_LOCALHOST_TESTING=true`
   - Check Supabase connection

3. **Try query parameter method:**
   ```
   http://localhost:3000?subdomain=your-subdomain
   ```

### Domain Not Working After Hosts File Change

1. Clear DNS cache (see above)
2. Restart browser
3. Ensure hosts file syntax is correct (no extra spaces)
4. Verify Next.js dev server is running

### Cookies Not Working

- Use `lvh.me` instead of `localhost` for better cookie support
- Check browser cookie settings
- Ensure no privacy extensions blocking cookies

### Middleware Not Running

1. Check middleware matcher excludes your route
2. Verify route doesn't match skip patterns (e.g., `/store`, `/dashboard`)
3. Check browser console for errors

## Best Practices

1. **Development:** Use `subdomain.localhost` or `subdomain.lvh.me` for quick testing
2. **Custom Domain Testing:** Use hosts file mapping for production-like testing
3. **Quick Checks:** Use query parameters for rapid iteration
4. **Production Preview:** Use hosts file mapping with production-like domains

## Security Notes

- Query parameter override only works in development mode
- Localhost testing features are automatically disabled in production
- Never commit actual production credentials to test configurations

## Additional Resources

- [Next.js Middleware Documentation](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Supabase Multi-Tenancy Guide](https://supabase.com/docs/guides/platform/multi-tenancy)
- [lvh.me Information](http://lvh.me)

