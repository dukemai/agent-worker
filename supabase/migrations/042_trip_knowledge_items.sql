-- Trip Ops knowledge base: raw trip inspiration plus extracted structured context.

CREATE TABLE trip_knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_url TEXT,
  raw_markdown TEXT NOT NULL DEFAULT '',
  extraction JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processed', 'failed')),
  error_message TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  extracted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX trip_knowledge_items_trip_idx
  ON trip_knowledge_items(trip_id, status, updated_at DESC);

CREATE TRIGGER trigger_trip_knowledge_items_updated_at
  BEFORE UPDATE ON public.trip_knowledge_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_trip_ops_updated_at();

ALTER TABLE trip_knowledge_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own trip knowledge"
ON trip_knowledge_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = trip_knowledge_items.trip_id AND t.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = trip_knowledge_items.trip_id AND t.user_id = auth.uid()
  )
);
