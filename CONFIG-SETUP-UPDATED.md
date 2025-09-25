# Plus-One Configuration System Setup

This document explains how to set up the plus-one configuration system for the wedding website.

## 🚀 Quick Setup

### 1. Database Setup

Since you already have RLS policies set up, simply run the simplified setup script:

```sql
-- Copy and paste the contents of setup-config-simple.sql
-- This will create the app_config table and insert default values
```

**Your Existing RLS Policies** (Perfect! ✅):
```sql
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Admin and staff can read app configs
CREATE POLICY "Admin and staff can read app configs" ON public.app_config
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'staff')
        )
    );

-- Service role can manage app configs
CREATE POLICY "Service role can insert app configs" ON public.app_config
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update app configs" ON public.app_config
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete app configs" ON public.app_config
  FOR DELETE USING (auth.role() = 'service_role');
```

## 🔧 Configuration Options

The system provides three main configuration options:

| Option | Description | Default | Range |
|--------|-------------|---------|-------|
| `plus_ones_enabled` | Master toggle for plus-one functionality | `false` | `true`/`false` |
| `max_party_size` | Maximum people per invitation (including main guest) | `1` | `1-20` |
| `allow_guest_plus_ones` | Let guests specify their own plus-ones | `false` | `true`/`false` |

## 🎯 How It Works

### Direct Table Access
The system uses direct table access with your existing RLS policies:
- **Read operations**: Available to admin/staff users
- **Write operations**: Available to service role (handled by Supabase client)
- **Caching**: Redis caching for 5 minutes with automatic invalidation

### Security
- Uses your existing RLS policies for security
- Admin/staff users can read configurations
- Service role handles all write operations
- All operations are logged for audit purposes

## 🖥️ Admin Interface

Access the configuration page at `/admin/config`:

- **Toggle switches** for boolean options
- **Number inputs** for numeric values
- **Real-time preview** of current settings
- **Reset to defaults** functionality
- **Error handling** with user-friendly messages

## 🔄 Frontend Integration

The configuration automatically controls:

### RSVP Form (`/rsvp`)
- Shows/hides party size field based on `plus_ones_enabled`
- Respects `max_party_size` limit
- Disables input when `allow_guest_plus_ones` is false

### FAQ Page (`/faq`)
- Dynamic plus-one answer based on configuration
- Shows correct party size limits

### Admin Invitation Forms
- Headcount field appears when plus-ones enabled
- Respects max party size configuration
- Default headcount set based on configuration

## 🛠️ Troubleshooting

### RLS Policy Errors

Your existing RLS policies should work perfectly! If you see any issues:

1. **Verify your user role**: Make sure your user has admin/staff role in the `profiles` table
2. **Check service role**: Ensure your Supabase client is using the service role for write operations
3. **Test permissions**: Try reading configs first, then updating

### Configuration Not Updating

1. Check if the `app_config` table has data:
   ```sql
   SELECT * FROM app_config ORDER BY key;
   ```

2. Verify your user has the correct role:
   ```sql
   SELECT role FROM profiles WHERE id = auth.uid();
   ```

3. Check cache invalidation:
   - Configuration changes should invalidate Redis cache
   - Wait 5 minutes for cache to expire, or restart the application

### Default Values Not Loading

If configuration returns default values:

1. Check if `app_config` table has data:
   ```sql
   SELECT * FROM app_config ORDER BY key;
   ```

2. Verify RLS policies allow your user to read:
   ```sql
   -- Test as your current user
   SELECT * FROM app_config;
   ```

## 📝 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/config` | Get current configuration |
| `PUT` | `/api/config` | Update configuration values |
| `POST` | `/api/config` | Reset to defaults (with `{"action": "reset"}`) |

## 🔍 Monitoring

Configuration changes are logged in the audit system:
- `config_update` - When configuration values are changed
- `config_reset` - When configuration is reset to defaults

Check the audit logs to track configuration changes over time.

## 🚀 Production Deployment

1. Run the `setup-config-simple.sql` script on your production database
2. Ensure Redis is available for caching
3. Verify the configuration page works at `/admin/config`
4. Test the plus-one functionality with different settings

## ✅ Your Setup is Ready!

Your existing RLS policies are perfectly designed for this configuration system. The system will work seamlessly with your current security setup, providing:

- **Secure access** through your existing RLS policies
- **Admin control** through the web interface
- **Automatic caching** for performance
- **Audit logging** for compliance
- **Type-safe** configuration management

The configuration system is now ready to use! 🎉
