-- Preserve explicit provenance when a research lead is sent to the knowledge queue.

ALTER TABLE public.trip_knowledge_items
ADD COLUMN IF NOT EXISTS source_research_leads JSONB NOT NULL DEFAULT '[]'::jsonb;
