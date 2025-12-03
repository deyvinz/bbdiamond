# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-tenant wedding website platform (bbdiamond) built with Next.js 15, Supabase, and Tailwind CSS v4. Supports both SaaS multi-tenant mode and self-hosted single-wedding mode.

## Development Commands

```bash
npm run dev          # Start dev server on port 3006 with increased memory
npm run dev:clean    # Start dev server with Turbopack
npm run build        # Production build (8GB memory allocation)
npm run lint         # Run ESLint
npm run clean:win    # Clean .next and cache (Windows)
```

## Multi-Tenant Testing

Test subdomains locally using these patterns:
- `http://john-sarah.localhost:3006` - Subdomain pattern
- `http://john-sarah.lvh.me:3006` - lvh.me pattern (better browser support)
- `http://localhost:3006?subdomain=john-sarah` - Query parameter override

## Architecture

### Route Structure

- `/app` - Next.js App Router pages and API routes
  - `/admin/*` - Wedding admin panel (guests, invitations, seating, announcements)
  - `/api/admin/*` - Protected admin API endpoints
  - `/api/*` - Public API endpoints (RSVP, schedule, seating)
  - `/store/*` - SaaS storefront (marketing, signup, dashboard)
  - `/dashboard/*` - Customer portal for managing weddings
  - `/onboarding/*` - Guided wedding setup wizard
  - `/rsvp`, `/faq`, `/registry`, etc. - Guest-facing wedding pages

### Key Libraries & Services

- `/lib/wedding-context.ts` & `/lib/wedding-context-server.ts` - Multi-tenant context resolution
- `/lib/supabase-browser.ts` - Client-side Supabase client
- `/lib/supabase-server.ts` - Server-side Supabase client (uses Next.js cookies)
- `/lib/supabase-service.ts` - Service role Supabase client for admin operations
- `/lib/*-service.ts` - Domain services (guests, invitations, events, rsvp, seating, etc.)
- `/lib/cache.ts` & `/lib/kv.ts` - Redis/Upstash caching layer

### Component Organization

- `/components/ui/*` - Shadcn/Radix UI base components
- `/components/*.tsx` - Feature components (RSVPForm, SeatPlanner, CountdownTimer, etc.)
- `/components/providers/*` - React context providers

### Supabase Functions

Located in `/supabase/functions/`:
- `send-rsvp-confirmation` - RSVP confirmation emails
- `send-announcement-emails` - Broadcast announcements
- `send-rsvp-reminder` - RSVP reminder notifications
- `send-qr-email` - QR code check-in emails
- `send-whatsapp-invite` - WhatsApp invitations

## Code Conventions (from .cursor/rules)

- Use early returns for readability
- Prefer object destructuring
- Use `const` arrow functions with types: `const toggle = () =>`
- Event handlers prefixed with "handle": `handleClick`, `handleKeyDown`
- Always include accessibility attributes (tabindex, aria-label)
- Enclose if/else in curly braces
- Remove unused imports after code generation

## Environment Modes

- `DEPLOYMENT_MODE=saas` - Multi-tenant SaaS platform
- `DEPLOYMENT_MODE=self-hosted` - Single wedding deployment (uses `DEFAULT_WEDDING_ID`)

## Key Dependencies

- Next.js 15.5 with React 19
- Supabase SSR (`@supabase/ssr`) for auth
- Radix UI primitives + HeroUI components
- Tiptap for rich text editing (announcements)
- Framer Motion for animations
- Resend for transactional emails
- Redis/ioredis for caching
