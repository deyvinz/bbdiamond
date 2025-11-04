-- Update pricing plans for Luwāni branding
-- This migration updates existing plans and adds new ones to match the Luwāni storefront

-- First, deactivate old plans that don't match new structure
UPDATE subscription_plans 
SET is_active = false, updated_at = NOW()
WHERE name IN ('Basic', 'Enterprise');

-- Update Premium plan to match new pricing and features
UPDATE subscription_plans
SET 
  name = 'Premium',
  description = 'For a perfect celebration',
  price_monthly = 79.00,
  price_yearly = 799.00,
  features = '[
    "All templates",
    "Unlimited guests",
    "Custom domain + SSL",
    "Full customization",
    "Priority support",
    "Analytics dashboard",
    "Remove branding"
  ]'::jsonb,
  max_guests = NULL, -- NULL means unlimited
  max_events = NULL,
  custom_domain = true,
  white_label = true, -- Remove branding means white-label
  priority_support = true,
  updated_at = NOW()
WHERE name = 'Premium';

-- Insert new Freemium plan (if it doesn't exist)
INSERT INTO subscription_plans (
  name, 
  description, 
  price_monthly, 
  price_yearly, 
  features, 
  max_guests, 
  max_events, 
  custom_domain, 
  white_label, 
  priority_support,
  is_active
)
SELECT 
  'Freemium',
  'Perfect for trying out',
  0.00,
  0.00,
  '[
    "Basic templates",
    "Up to 50 guests",
    "RSVP management",
    "Basic support",
    "Luwāni branding"
  ]'::jsonb,
  50,
  5,
  false,
  false,
  false,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM subscription_plans WHERE name = 'Freemium'
);

-- Insert new Standard plan (if it doesn't exist)
INSERT INTO subscription_plans (
  name, 
  description, 
  price_monthly, 
  price_yearly, 
  features, 
  max_guests, 
  max_events, 
  custom_domain, 
  white_label, 
  priority_support,
  is_active
)
SELECT 
  'Standard',
  'For most couples',
  29.00,
  299.00,
  '[
    "All templates",
    "Up to 200 guests",
    "Custom domain",
    "Advanced RSVP tools",
    "Email support",
    "Priority updates"
  ]'::jsonb,
  200,
  10,
  true,
  false,
  false,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM subscription_plans WHERE name = 'Standard'
);

-- Insert One-Time plan (lifetime payment)
-- Note: This is a special plan that's not a recurring subscription
-- You may want to handle this differently in your billing logic
INSERT INTO subscription_plans (
  name, 
  description, 
  price_monthly, 
  price_yearly, 
  features, 
  max_guests, 
  max_events, 
  custom_domain, 
  white_label, 
  priority_support,
  is_active
)
SELECT 
  'One-Time',
  'Pay once, keep forever',
  299.00, -- Store one-time price in price_monthly field (price_yearly can be NULL)
  NULL, -- No yearly option for one-time
  '[
    "All Premium features",
    "Lifetime updates",
    "Lifetime support",
    "No monthly fees",
    "Transfer ownership"
  ]'::jsonb,
  NULL, -- Unlimited
  NULL, -- Unlimited
  true,
  true,
  true,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM subscription_plans WHERE name = 'One-Time'
);

-- If updating existing Standard plan instead of inserting
UPDATE subscription_plans
SET 
  description = 'For most couples',
  price_monthly = 29.00,
  price_yearly = 299.00,
  features = '[
    "All templates",
    "Up to 200 guests",
    "Custom domain",
    "Advanced RSVP tools",
    "Email support",
    "Priority updates"
  ]'::jsonb,
  max_guests = 200,
  max_events = 10,
  custom_domain = true,
  white_label = false,
  priority_support = false,
  is_active = true,
  updated_at = NOW()
WHERE name = 'Standard';

-- Add a metadata column to track plan type (subscription vs one-time)
-- This helps distinguish between recurring and one-time payments
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'subscription' 
CHECK (plan_type IN ('subscription', 'one-time'));

-- Update One-Time plan to have correct plan_type
UPDATE subscription_plans
SET plan_type = 'one-time'
WHERE name = 'One-Time';

-- Add a column to track if plan is recommended (for UI highlighting)
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN DEFAULT false;

-- Mark Standard as recommended plan
UPDATE subscription_plans
SET is_recommended = true
WHERE name = 'Standard';

-- Ensure proper ordering for display (you might want to add a sort_order column)
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Set sort order for display (lower number = appears first)
UPDATE subscription_plans
SET sort_order = 
  CASE name
    WHEN 'Freemium' THEN 1
    WHEN 'Standard' THEN 2
    WHEN 'Premium' THEN 3
    WHEN 'One-Time' THEN 4
    ELSE 99
  END,
  updated_at = NOW()
WHERE name IN ('Freemium', 'Standard', 'Premium', 'One-Time');

-- Create an index on is_active and sort_order for efficient queries
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active_sort 
ON subscription_plans(is_active, sort_order) 
WHERE is_active = true;

-- Add comment to document the pricing structure
COMMENT ON TABLE subscription_plans IS 'Luwāni subscription plans: Freemium (free), Standard ($29/$299), Premium ($79/$799), One-Time ($299 lifetime)';
COMMENT ON COLUMN subscription_plans.plan_type IS 'Type of plan: subscription (recurring) or one-time (lifetime payment)';
COMMENT ON COLUMN subscription_plans.is_recommended IS 'Whether this plan should be highlighted as recommended in the UI';

