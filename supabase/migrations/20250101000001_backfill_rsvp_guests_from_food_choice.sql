-- Backfill rsvp_guests table from existing food_choice data in invitation_events
-- This migration ensures backward compatibility by populating rsvp_guests for existing RSVPs

INSERT INTO rsvp_guests (invitation_event_id, guest_index, name, food_choice, created_at, updated_at)
SELECT 
  ie.id AS invitation_event_id,
  1 AS guest_index, -- Primary guest
  NULL AS name, -- Primary guest name is in guests table
  ie.food_choice,
  ie.updated_at AS created_at,
  ie.updated_at AS updated_at
FROM invitation_events ie
WHERE 
  ie.food_choice IS NOT NULL 
  AND ie.food_choice != ''
  AND ie.status = 'accepted'
  AND NOT EXISTS (
    SELECT 1 
    FROM rsvp_guests rg 
    WHERE rg.invitation_event_id = ie.id AND rg.guest_index = 1
  )
ON CONFLICT (invitation_event_id, guest_index) DO NOTHING;
