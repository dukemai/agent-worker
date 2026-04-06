-- Weekly promo match imports: Playwright output watchlist-matches-only.json → normalized rows for dashboard.

CREATE TABLE promo_match_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  store_key TEXT NOT NULL,
  interests JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_json JSONB NOT NULL
);

CREATE TABLE promo_match_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES promo_match_runs(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  interest TEXT NOT NULL,
  score INT NOT NULL,
  promotion_index INT,
  title TEXT NOT NULL,
  card_text TEXT,
  price_hint TEXT,
  image_url TEXT,
  source_url TEXT NOT NULL,
  store_key TEXT NOT NULL
);

CREATE INDEX promo_match_items_run_id_idx ON promo_match_items(run_id);
CREATE INDEX promo_match_runs_created_at_idx ON promo_match_runs(created_at DESC);

ALTER TABLE promo_match_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_match_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated full access" ON promo_match_runs;
CREATE POLICY "Authenticated full access"
ON promo_match_runs
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access" ON promo_match_items;
CREATE POLICY "Authenticated full access"
ON promo_match_items
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
