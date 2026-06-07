-- Separate trip knowledge extraction intent so destination stories can evolve
-- independently from practical trip-planning knowledge.

ALTER TABLE public.trip_knowledge_items
  ADD COLUMN IF NOT EXISTS extraction_focus TEXT NOT NULL DEFAULT 'both'
  CHECK (extraction_focus IN ('planning', 'stories', 'both'));

CREATE INDEX IF NOT EXISTS trip_knowledge_items_focus_idx
  ON public.trip_knowledge_items(trip_id, extraction_focus, status);
