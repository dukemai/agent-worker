ALTER TABLE public.activity_source_mappings
ADD COLUMN IF NOT EXISTS collection_focus TEXT,
ADD COLUMN IF NOT EXISTS collection_instructions TEXT,
ADD COLUMN IF NOT EXISTS check_frequency TEXT NOT NULL DEFAULT 'seasonal',
ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS season_target TEXT NOT NULL DEFAULT 'summer_2026',
ADD COLUMN IF NOT EXISTS is_core BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.activity_source_mappings
ADD CONSTRAINT activity_source_mappings_check_frequency_check
CHECK (check_frequency IN ('weekly', 'monthly', 'seasonal'));
