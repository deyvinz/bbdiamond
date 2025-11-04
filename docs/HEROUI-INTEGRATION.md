# HeroUI Integration for Storefront

This document outlines the HeroUI integration for the storefront and landing pages.

## Installation

HeroUI has been installed with the following packages:
- `@heroui/react` - Core HeroUI React components
- `@heroui/theme` - Theme customization plugin
- `framer-motion` - Required for animations (already installed)

## Configuration

### Tailwind Configuration

The `tailwind.config.ts` has been updated to include:
1. HeroUI plugin import and configuration
2. Theme customization with gold color palette mapped to primary colors
3. Content paths for HeroUI theme distribution

```typescript
import { heroui } from '@heroui/react'

plugins: [
  heroui({
    themes: {
      light: {
        colors: {
          primary: '#CDA349', // gold-500
          secondary: '#E1B858', // gold-400
          // ... other colors
        },
      },
      dark: {
        colors: {
          primary: '#E1B858', // gold-400
          secondary: '#CDA349', // gold-500
          // ... other colors
        },
      },
    },
  }),
]
```

### Layout Provider

The storefront layout (`app/store/layout.tsx`) now wraps all storefront pages with `HeroUIProvider`:

```tsx
import { HeroUIProvider } from '@heroui/react'

export default function StoreLayout({ children }) {
  return (
    <HeroUIProvider>
      {/* Storefront content */}
    </HeroUIProvider>
  )
}
```

## Updated Pages

### 1. Store Landing Page (`app/store/page.tsx`)

**Components Replaced:**
- `Button` from `@/components/ui/button` → `Button` from `@heroui/react`
- `Card` from `@/components/ui/card` → `Card`, `CardBody`, `CardHeader` from `@heroui/react`
- Added `Chip` component for "Most Popular" badge

**Design Updates:**
- Uses HeroUI semantic color tokens (`text-primary`, `text-default-500`, etc.)
- Cards now have `isPressable` prop for hover interactions
- Pricing cards use HeroUI `shadow` prop instead of CSS classes
- CTA section uses HeroUI color system

### 2. Demo Page (`app/store/demo/page.tsx`)

**Components Replaced:**
- All UI components migrated to HeroUI equivalents
- Updated color scheme to use HeroUI tokens

### 3. Signup Page (`app/store/signup/page.tsx`)

**Components Replaced:**
- `Button` → HeroUI `Button` with `isLoading` prop
- `Input` → HeroUI `Input` with built-in label support
- `Select` → HeroUI `Select` and `SelectItem`
- `Card` → HeroUI `Card`, `CardHeader`, `CardBody`

**Key Features:**
- Form inputs now use HeroUI's built-in label system
- Select dropdown uses HeroUI's `Select` component
- Loading states handled by HeroUI's `isLoading` prop

## Color System Migration

The storefront now uses HeroUI's semantic color system:

| Old (shadcn) | New (HeroUI) | Purpose |
|-------------|--------------|---------|
| `text-muted-foreground` | `text-default-500` | Secondary text |
| `text-gold-600` | `text-primary` | Primary brand color |
| `bg-white` | `bg-background` or `bg-content1` | Background colors |
| `bg-gold-600` | `bg-primary` | Primary background |
| Custom gold colors | `primary-*` variants | Gold color palette |

## HeroUI Component Benefits

1. **Accessibility**: Built on React Aria, ensuring WCAG compliance
2. **Dark Mode**: Automatic dark mode support via theme system
3. **Type Safety**: Full TypeScript support
4. **Animations**: Integrated Framer Motion animations
5. **Customization**: Easy theme customization via Tailwind config
6. **Performance**: No runtime styles, CSS-in-JS free

## Usage Guidelines

### Buttons
```tsx
import { Button } from '@heroui/react'

<Button color="primary" size="lg" isLoading={loading}>
  Click Me
</Button>
```

### Cards
```tsx
import { Card, CardBody, CardHeader } from '@heroui/react'

<Card>
  <CardHeader>Title</CardHeader>
  <CardBody>Content</CardBody>
</Card>
```

### Inputs
```tsx
import { Input } from '@heroui/react'

<Input
  label="Email"
  type="email"
  placeholder="Enter your email"
/>
```

### Select
```tsx
import { Select, SelectItem } from '@heroui/react'

<Select label="Choose option">
  <SelectItem key="option1">Option 1</SelectItem>
  <SelectItem key="option2">Option 2</SelectItem>
</Select>
```

## Next Steps

1. **Onboarding Page**: Consider migrating to HeroUI for consistency
2. **Dashboard**: Can gradually migrate dashboard components to HeroUI
3. **Admin Panel**: Can use HeroUI for admin interfaces
4. **Theme Customization**: Explore more advanced theme customization options
5. **Component Library**: Document custom HeroUI component patterns

## Resources

- [HeroUI Documentation](https://www.heroui.com/)
- [HeroUI Components](https://www.heroui.com/docs/components/button)
- [HeroUI Theme Guide](https://www.heroui.com/docs/customization/themes)

