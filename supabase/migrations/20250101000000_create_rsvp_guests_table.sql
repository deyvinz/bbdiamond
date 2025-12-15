-- Create rsvp_guests table to store individual guest food choices
CREATE TABLE IF NOT EXISTS rsvp_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_event_id UUID NOT NULL REFERENCES invitation_events(id) ON DELETE CASCADE,
  guest_index INTEGER NOT NULL, -- 1 for primary guest, 2+ for plus-ones
  name VARCHAR(255), -- Name for plus-one guests (optional for primary)
  food_choice VARCHAR(100), -- Food choice for this guest
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(invitation_event_id, guest_index)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rsvp_guests_invitation_event_id ON rsvp_guests(invitation_event_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_guests_guest_index ON rsvp_guests(invitation_event_id, guest_index);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rsvp_guests_updated_at BEFORE UPDATE ON rsvp_guests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies if needed (adjust based on your RLS setup)
-- ALTER TABLE rsvp_guests ENABLE ROW LEVEL SECURITY;
