# HeroUI Migration Strategy

## Recommendation: Hybrid Approach for Maximum Marketability

### ✅ **Use HeroUI For:**
- **Storefront pages** (`/store/*`) - Already done ✅
- **Guest-facing wedding pages** - **RECOMMENDED** 
  - Home page (`/`)
  - RSVP page (`/rsvp`)
  - Schedule page (`/schedule`)
  - Seating page (`/seating`)
  - Travel page (`/travel`)
  - Gallery page (`/gallery`)
  - Wedding Party page (`/wedding-party`)
  - FAQ page (`/faq`)
  - Registry page (`/registry`)
  - Contact page (`/contact`)

### ⚠️ **Keep shadcn/ui For:**
- **Admin pages** (`/admin/*`) - Functionality-focused, less design-critical
- **Dashboard** (`/dashboard/*`) - Internal tool, can migrate later
- **Onboarding** (`/onboarding`) - Can migrate but lower priority

## Why This Approach?

### 🎯 **Quality & Marketability**
1. **Consistent Guest Experience**: Guests see a unified, polished design from storefront → wedding site
2. **Professional Appearance**: Modern HeroUI components make the platform look premium
3. **Better Demos**: Easier to showcase to potential customers with consistent design
4. **Theming Alignment**: HeroUI's theming system perfectly supports multi-tenant customization

### 🚀 **Technical Benefits**
1. **Unified Design System**: One component library reduces inconsistencies
2. **Theming Integration**: HeroUI themes work seamlessly with your `wedding_themes` table
3. **Accessibility**: HeroUI built on React Aria (WCAG compliant)
4. **Performance**: No runtime styles, CSS-in-JS free

### 💼 **Business Impact**
- **Higher Perceived Value**: Consistent, modern design = premium product
- **Easier Sales**: Professional appearance = easier to close deals
- **Better Retention**: Polished UX = happier customers
- **Competitive Advantage**: Most wedding platforms have inconsistent designs

## Implementation Status

### ✅ Completed
- [x] HeroUI installed and configured
- [x] Tailwind config updated with HeroUI plugin
- [x] Storefront pages using HeroUI
- [x] Main layout wrapped with `HeroUIProvider`
- [x] Home page buttons migrated to HeroUI

### 🔄 In Progress / To Do
- [ ] Update RSVP form components to HeroUI
- [ ] Update Schedule page to HeroUI
- [ ] Update Seating page to HeroUI
- [ ] Update Travel page to HeroUI
- [ ] Update Gallery page to HeroUI
- [ ] Update Wedding Party page to HeroUI
- [ ] Update FAQ page to HeroUI
- [ ] Update Nav component to use HeroUI where applicable
- [ ] Update Footer component styling (can keep simple)

## Migration Priority

### High Priority (Guest-Facing)
1. **Home Page** (`/`) - ✅ Started
2. **RSVP Page** (`/rsvp`) - Core functionality
3. **Schedule Page** (`/schedule`) - High visibility
4. **Nav Component** - Visible on every page

### Medium Priority
5. Seating page
6. Gallery page
7. Wedding Party page
8. Travel page
9. FAQ page

### Low Priority (Can Stay with shadcn/ui)
- Admin pages (functionality over form)
- Dashboard (internal tool)
- Complex data tables (shadcn/ui tables work well)

## Component Mapping Guide

### Buttons
```tsx
// Old (shadcn/ui)
<Button variant="gold" size="lg">Click</Button>

// New (HeroUI)
<Button 
  color="primary" 
  size="lg" 
  className="rounded-2xl font-semibold"
  radius="lg"
>
  Click
</Button>
```

### Cards
```tsx
// Old (shadcn/ui)
<Card className="p-6">Content</Card>

// New (HeroUI)
<Card className="rounded-3xl shadow-lg" radius="lg">
  <CardBody className="p-6">Content</CardBody>
</Card>
```

### Inputs
```tsx
// Old (shadcn/ui)
<Input label="Name" placeholder="Enter name" />

// New (HeroUI) - Built-in labels
<Input 
  label="Name" 
  placeholder="Enter name"
  radius="lg"
/>
```

## Theme Integration

HeroUI's theming system integrates perfectly with your `wedding_themes` table:

- HeroUI `primary` color → Maps to `wedding_themes.primary_color`
- HeroUI `secondary` color → Maps to `wedding_themes.secondary_color`
- HeroUI fonts → Uses `wedding_themes.primary_font` and `secondary_font`
- Custom CSS variables → Can inject via `ThemeProvider`

## Next Steps

1. ✅ Wrap main layout with `HeroUIProvider` - **DONE**
2. Update home page buttons - **DONE**
3. Update RSVP form to HeroUI components
4. Update other guest-facing pages incrementally
5. Test theme customization with HeroUI components
6. Keep admin pages with shadcn/ui for now (migrate later if needed)

## Notes

- HeroUI and shadcn/ui can coexist (different component names)
- Gradual migration minimizes risk
- Test thoroughly after each page migration
- HeroUI components work seamlessly with your existing Tailwind utilities

