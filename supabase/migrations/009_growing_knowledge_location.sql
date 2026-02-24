-- Add location data to growing_knowledge for location-specific tips
ALTER TABLE growing_knowledge
ADD COLUMN IF NOT EXISTS location_note TEXT;

COMMENT ON COLUMN growing_knowledge.location_note IS 'Which location or climate this applies to (e.g. Stockholm, Nordic, temperate, Mediterranean, general). Null = general/universal advice.';
