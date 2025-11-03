# Storefront & Multi-Tenant Architecture Guide

## Overview

This document explains how to serve the multi-tenant wedding platform to clients through a storefront and manage customer subscriptions.

## Architecture Components

### 1. Storefront (Marketing Site)

**Location:** `/store`

**Purpose:** Marketing site where potential customers can:
- Learn about the platform
- View pricing plans
- Sign up for accounts
- View demos

**Routes:**
- `/store` - Landing page with pricing
- `/store/signup` - Customer registration
- `/store/demo` - Live demo site
- `/store/contact` - Sales contact form

### 2. Customer Dashboard

**Location:** `/dashboard`

**Purpose:** Customer portal where account owners can:
- View all their weddings
- Manage subscriptions
- Access billing
- Create new weddings

**Key Features:**
- Multi-wedding management (Enterprise plan)
- Subscription status display
- Quick links to manage each wedding

### 3. Onboarding Flow

**Location:** `/onboarding`

**Purpose:** Guided setup for new wedding websites

**Steps:**
1. **Couple Information** - Names, contact email
2. **Dates & Location** - Wedding date, venue, city, country
3. **Theme Selection** - Choose from preset themes
4. **Domain Setup** - Subdomain or custom domain (based on plan)
5. **Completion** - Redirect to admin panel

**Flow:**
```
Sign Up → Create Account → Onboarding → Wedding Created → Admin Panel
```

### 4. Subscription & Billing

**Database Tables:**
- `subscription_plans` - Available plans (Basic, Premium, Enterprise)
- `customers` - Platform customers (account owners)
- `wedding_owners` - Links weddings to customers
- `subscription_usage` - Usage tracking for billing
- `payment_transactions` - Payment history

**Integration Points:**
- Stripe for payment processing
- Subscription webhooks for status updates
- Usage tracking for plan limits

## Deployment Modes

### SaaS Mode (Multi-Tenant)

**Environment:** `DEPLOYMENT_MODE=saas`

**How it Works:**
1. Customers sign up at `/store/signup`
2. Complete onboarding to create wedding
3. Wedding is accessible via:
   - Subdomain: `{slug}.weddingplatform.com`
   - Custom domain: `johnandsarah.com` (Premium/Enterprise)
   - Path: `weddingplatform.com/w/{slug}` (future option)

**Customer Journey:**
```
Visit Store → Sign Up → Onboarding → Wedding Created → Manage via Dashboard
```

### Self-Hosted Mode

**Environment:** `DEPLOYMENT_MODE=self-hosted`

**How it Works:**
1. Single wedding per deployment
2. Uses `DEFAULT_WEDDING_ID` from environment
3. No storefront needed (customer deploys their own instance)
4. Full white-label capabilities

**Customer Journey:**
```
Purchase License → Deploy Instance → Configure → Use
```

## Serving Clients

### For SaaS Customers

1. **Discovery**
   - Visit marketing site at main domain
   - Browse pricing and features
   - Sign up for account

2. **Account Creation**
   - Register at `/store/signup`
   - Choose subscription plan
   - 14-day free trial starts

3. **Wedding Setup**
   - Complete onboarding wizard
   - Wedding website automatically created
   - Access admin panel immediately

4. **Management**
   - Access dashboard at `/dashboard`
   - Manage multiple weddings (Enterprise)
   - View subscription status
   - Update billing information

5. **Website Access**
   - Guests visit wedding site at assigned subdomain/domain
   - Fully customized and branded
   - Admin manages content via `/admin`

### For Self-Hosted Customers

1. **Purchase**
   - Buy self-hosted license
   - Receive deployment package

2. **Deployment**
   - Deploy to their own server/VPS
   - Configure environment variables
   - Set `DEFAULT_WEDDING_ID`

3. **Configuration**
   - Access admin at `/admin`
   - Configure wedding details
   - Customize theme and branding

4. **Usage**
   - Guests access at their domain
   - Full control over deployment
   - White-label option

## Storefront Features

### Landing Page (`/store`)

**Sections:**
- Hero with value proposition
- Feature highlights
- Pricing table (3 tiers)
- Social proof/testimonials
- CTA sections

**Key Components:**
- Responsive pricing cards
- Feature comparison
- Trial signup CTA

### Signup Flow (`/store/signup`)

**Process:**
1. Customer enters email, password, name
2. Selects plan (Basic, Premium, Enterprise)
3. Account created with trial status
4. Redirect to onboarding

**Integration:**
- Creates Supabase Auth user
- Creates `customers` record
- Sets trial expiration (14 days)
- Links to selected plan

### Customer Dashboard (`/dashboard`)

**Features:**
- View all owned weddings
- Subscription status badge
- Quick actions (create, manage, view)
- Usage statistics
- Billing management link

**Multi-Wedding Support:**
- Enterprise customers can create multiple weddings
- Each wedding managed independently
- Shared subscription billing

## Subscription Plans

### Basic Plan
- **Price:** $29.99/month or $299.99/year
- **Features:**
  - Up to 100 guests
  - Multiple events
  - RSVP management
  - Seating charts
  - Basic templates
  - Email support
- **Limitations:**
  - No custom domain
  - Basic templates only

### Premium Plan
- **Price:** $79.99/month or $799.99/year
- **Features:**
  - Everything in Basic
  - Up to 500 guests
  - Custom domain support
  - Advanced templates
  - Priority support
  - Custom branding
  - Analytics & insights

### Enterprise Plan
- **Price:** $199.99/month or $1,999.99/year
- **Features:**
  - Everything in Premium
  - Unlimited guests
  - Multiple weddings (unlimited)
  - White-label option
  - API access
  - Dedicated support
  - Custom integrations

## Database Schema

### Key Tables

**`customers`**
- Links to `auth.users`
- Stores subscription info
- Tracks trial periods
- Stripe integration fields

**`wedding_owners`**
- Many-to-many: customers ↔ weddings
- Supports multiple owners per wedding
- Role-based access (owner, admin, collaborator)

**`subscription_plans`**
- Predefined plans
- Feature definitions
- Pricing information

**`subscription_usage`**
- Track usage for billing
- Monthly/periodic snapshots
- Usage-based limits

## Payment Integration (Stripe)

### Setup Required

1. **Stripe Account**
   - Create Stripe account
   - Get API keys
   - Set up webhooks

2. **Environment Variables**
   ```
   STRIPE_SECRET_KEY=sk_...
   STRIPE_PUBLISHABLE_KEY=pk_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

3. **Webhook Endpoints**
   - `/api/webhooks/stripe` - Handle subscription events
   - Update subscription status on payment success
   - Handle cancellations and renewals

### Payment Flow

1. Customer selects plan
2. Redirect to Stripe Checkout
3. Payment processed
4. Webhook updates `customers` table
5. Wedding access granted/upgraded

## Domain Routing

### Subdomain Routing

**Pattern:** `{slug}.weddingplatform.com`

**Middleware Logic:**
1. Extract subdomain from hostname
2. Look up wedding by `subdomain` field
3. Set `wedding_id` in context
4. Serve wedding-specific content

### Custom Domain Routing

**Pattern:** `johnandsarah.com`

**Setup:**
1. Customer provides domain in onboarding
2. DNS configured (CNAME to platform)
3. Domain verified and linked to wedding
4. Middleware resolves custom domain → wedding_id

**DNS Requirements:**
```
CNAME: johnandsarah.com → platform.weddingplatform.com
```

## Access Control

### Customer Access
- Own their weddings via `wedding_owners` table
- Access admin panel for their weddings
- View dashboard with all owned weddings

### Wedding Access
- Admin routes require authentication + wedding ownership
- Public routes (RSVP, schedule) accessible to guests
- RLS policies enforce data isolation

### API Security
- All admin APIs require authentication
- Wedding context validated on every request
- Cross-tenant access prevented

## Customer Support

### Self-Service
- Dashboard with FAQs
- Help center documentation
- Email support (Basic/Premium)
- Priority support (Premium/Enterprise)

### Admin Features
- Customer can manage their weddings independently
- Subscription upgrade/downgrade
- Domain management
- Theme customization

## Future Enhancements

### Planned Features
1. **Template Marketplace**
   - Browse and purchase premium templates
   - Community-submitted designs
   - Template preview system

2. **Affiliate Program**
   - Referral links for customers
   - Commission tracking
   - Payout management

3. **Agency/Reseller Mode**
   - White-label storefront
   - Bulk wedding creation
   - Reseller pricing tiers

4. **Analytics Dashboard**
   - Customer analytics
   - Revenue tracking
   - Usage insights

## Deployment Checklist

### For SaaS Deployment

1. **Database**
   - Run all migrations
   - Seed subscription plans
   - Set up RLS policies

2. **Environment**
   - Set `DEPLOYMENT_MODE=saas`
   - Configure Stripe keys
   - Set main platform domain

3. **DNS**
   - Configure wildcard subdomain: `*.weddingplatform.com`
   - Set up custom domain support

4. **Email**
   - Configure transactional emails
   - Set up email templates
   - Test email delivery

5. **Monitoring**
   - Set up error tracking
   - Configure usage alerts
   - Monitor subscription status

### For Self-Hosted Sales

1. **Package**
   - Include all source code
   - Provide deployment docs
   - Include migration scripts

2. **Documentation**
   - Installation guide
   - Configuration examples
   - Customization guide

3. **Support**
   - Provide support channel
   - License key system (optional)
   - Update mechanism

## Summary

The platform serves clients through:

1. **Storefront** - Marketing and signup
2. **Onboarding** - Guided wedding creation
3. **Dashboard** - Multi-wedding management
4. **Admin Panel** - Wedding content management
5. **Public Sites** - Guest-facing wedding websites

All tied together with:
- Subscription management
- Payment processing
- Multi-tenant isolation
- Domain routing
- Access control

This architecture supports both SaaS (recurring revenue) and self-hosted (one-time license) business models.

