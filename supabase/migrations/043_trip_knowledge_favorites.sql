-- Trip Ops knowledge favorites: user-selected merged places and activities.

CREATE TABLE trip_knowledge_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('place', 'activity')),
  name TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT 'Unknown area',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trip_id, item_type, name, area)
);

CREATE INDEX trip_knowledge_favorites_trip_idx
  ON trip_knowledge_favorites(trip_id, item_type, area, name);

ALTER TABLE trip_knowledge_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own trip knowledge favorites"
ON trip_knowledge_favorites
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = trip_knowledge_favorites.trip_id AND t.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = trip_knowledge_favorites.trip_id AND t.user_id = auth.uid()
  )
);
