CREATE TABLE IF NOT EXISTS growing_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  channel TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  error_message TEXT,
  tips_extracted INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  CONSTRAINT growing_sources_status_check CHECK (status IN ('queued', 'processing', 'done', 'failed'))
);

CREATE TABLE IF NOT EXISTS growing_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES growing_sources(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT[] NOT NULL DEFAULT '{}',
  season_relevance TEXT[] NOT NULL DEFAULT '{}',
  stockholm_relevant BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT growing_knowledge_category_check CHECK (
    category IN (
      'technique',
      'plant-profile',
      'soil',
      'pest-control',
      'companion-planting',
      'preservation',
      'general'
    )
  )
);

ALTER TABLE growing_windows
ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES growing_sources(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS growing_sources_status_created_idx
ON growing_sources (status, created_at);

CREATE INDEX IF NOT EXISTS growing_knowledge_category_created_idx
ON growing_knowledge (category, created_at DESC);

CREATE INDEX IF NOT EXISTS growing_knowledge_source_idx
ON growing_knowledge (source_id);

CREATE INDEX IF NOT EXISTS growing_windows_source_idx
ON growing_windows (source_id);

ALTER TABLE growing_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE growing_knowledge ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated full access" ON growing_sources;
CREATE POLICY "Authenticated full access"
ON growing_sources
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access" ON growing_knowledge;
CREATE POLICY "Authenticated full access"
ON growing_knowledge
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
