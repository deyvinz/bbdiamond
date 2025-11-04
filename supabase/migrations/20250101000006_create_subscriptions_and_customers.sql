-- Create subscriptions and customers tables for SaaS billing

-- Subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- e.g., "Basic", "Premium", "Enterprise"
  description TEXT,
  price_monthly DECIMAL(10, 2) NOT NULL,
  price_yearly DECIMAL(10, 2),
  features JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of feature strings
  max_guests INTEGER,
  max_events INTEGER,
  custom_domain BOOLEAN DEFAULT false,
  white_label BOOLEAN DEFAULT false,
  priority_support BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Customers/Accounts table (platform users who own weddings)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  company_name TEXT, -- For agencies/resellers
  phone TEXT,
  billing_address JSONB, -- Address for invoices
  tax_id TEXT, -- For business customers
  status TEXT NOT NULL DEFAULT 'active', -- active, suspended, cancelled
  subscription_status TEXT NOT NULL DEFAULT 'trial', -- trial, active, past_due, cancelled
  current_plan_id UUID REFERENCES subscription_plans(id),
  trial_ends_at TIMESTAMPTZ,
  subscription_starts_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  stripe_customer_id TEXT, -- Stripe customer ID
  stripe_subscription_id TEXT, -- Stripe subscription ID
  payment_method_id TEXT, -- Saved payment method
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Link weddings to customers (one customer can own multiple weddings)
CREATE TABLE IF NOT EXISTS wedding_owners (
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner', -- owner, admin, collaborator
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (wedding_id, customer_id)
);

-- Subscription usage tracking
CREATE TABLE IF NOT EXISTS subscription_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  wedding_id UUID REFERENCES weddings(id) ON DELETE SET NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  guests_count INTEGER DEFAULT 0,
  events_count INTEGER DEFAULT 0,
  invitations_sent INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  storage_used_mb INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Payment transactions log
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  wedding_id UUID REFERENCES weddings(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL, -- pending, succeeded, failed, refunded
  payment_method TEXT, -- card, bank_transfer, etc.
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_customers_stripe_customer_id ON customers(stripe_customer_id);
CREATE INDEX idx_customers_subscription_status ON customers(subscription_status);
CREATE INDEX idx_wedding_owners_customer_id ON wedding_owners(customer_id);
CREATE INDEX idx_wedding_owners_wedding_id ON wedding_owners(wedding_id);
CREATE INDEX idx_subscription_usage_customer_id ON subscription_usage(customer_id);
CREATE INDEX idx_subscription_usage_period ON subscription_usage(period_start, period_end);
CREATE INDEX idx_payment_transactions_customer_id ON payment_transactions(customer_id);

-- RLS Policies
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Customers can view active plans
CREATE POLICY "Active plans are viewable by everyone"
  ON subscription_plans FOR SELECT
  USING (is_active = true);

-- Customers can only view their own data
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own customer data"
  ON customers FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own customer data"
  ON customers FOR UPDATE
  USING (auth.uid() = id);

-- Wedding owners
ALTER TABLE wedding_owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view wedding owners for their weddings"
  ON wedding_owners FOR SELECT
  USING (
    auth.uid() IN (
      SELECT customer_id FROM wedding_owners WHERE wedding_id = wedding_owners.wedding_id
    )
  );

-- Subscription usage
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription usage"
  ON subscription_usage FOR SELECT
  USING (auth.uid() = customer_id);

-- Payment transactions
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment transactions"
  ON payment_transactions FOR SELECT
  USING (auth.uid() = customer_id);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, features, max_guests, max_events, custom_domain, white_label)
VALUES
  (
    'Basic',
    'Perfect for intimate weddings',
    29.99,
    299.99,
    '["Unlimited guests", "Multiple events", "RSVP management", "Seating charts", "Basic templates", "Email support"]'::jsonb,
    100,
    5,
    false,
    false
  ),
  (
    'Premium',
    'For couples who want everything',
    79.99,
    799.99,
    '["Everything in Basic", "Custom domain", "Advanced templates", "Priority support", "Custom branding", "Analytics"]'::jsonb,
    500,
    10,
    true,
    false
  ),
  (
    'Enterprise',
    'For agencies and professionals',
    199.99,
    1999.99,
    '["Everything in Premium", "White-label", "Multiple weddings", "API access", "Dedicated support", "Custom integrations"]'::jsonb,
    9999,
    999,
    true,
    true
  );

-- Functions
CREATE OR REPLACE FUNCTION get_customer_weddings(customer_uuid UUID)
RETURNS TABLE (
  wedding_id UUID,
  wedding_name TEXT,
  wedding_slug TEXT,
  role TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.couple_display_name,
    w.slug,
    wo.role,
    wo.created_at
  FROM wedding_owners wo
  JOIN weddings w ON w.id = wo.wedding_id
  WHERE wo.customer_id = customer_uuid
  ORDER BY wo.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

