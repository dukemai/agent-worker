-- Trip Ops household sharing: household members can collaborate on household trips.

ALTER TABLE trips
  ADD COLUMN household_id UUID REFERENCES households(id) ON DELETE SET NULL;

CREATE INDEX trips_household_status_idx ON trips(household_id, status)
  WHERE household_id IS NOT NULL;

UPDATE trips
SET household_id = first_membership.household_id
FROM (
  SELECT DISTINCT ON (user_id) user_id, household_id
  FROM household_members
  ORDER BY user_id, created_at ASC
) AS first_membership
WHERE trips.user_id = first_membership.user_id
  AND trips.household_id IS NULL;

DROP POLICY IF EXISTS "Users manage own trips" ON trips;
DROP POLICY IF EXISTS "Users manage own trip options" ON trip_options;
DROP POLICY IF EXISTS "Users manage own trip decisions" ON trip_decisions;
DROP POLICY IF EXISTS "Users manage own trip itinerary" ON trip_itinerary_items;
DROP POLICY IF EXISTS "Users manage own trip knowledge" ON trip_knowledge_items;
DROP POLICY IF EXISTS "Users manage own trip knowledge favorites" ON trip_knowledge_favorites;

CREATE POLICY "Users create own household trips"
ON trips
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    household_id IS NULL
    OR EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = trips.household_id
        AND hm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Household members read trips"
ON trips
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM household_members hm
    WHERE hm.household_id = trips.household_id
      AND hm.user_id = auth.uid()
  )
);

CREATE POLICY "Household members update trips"
ON trips
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM household_members hm
    WHERE hm.household_id = trips.household_id
      AND hm.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM household_members hm
    WHERE hm.household_id = trips.household_id
      AND hm.user_id = auth.uid()
  )
);

CREATE POLICY "Household members delete trips"
ON trips
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM household_members hm
    WHERE hm.household_id = trips.household_id
      AND hm.user_id = auth.uid()
  )
);

CREATE POLICY "Household members manage trip options"
ON trip_options
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = trip_options.trip_id
      AND (
        t.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM household_members hm
          WHERE hm.household_id = t.household_id
            AND hm.user_id = auth.uid()
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = trip_options.trip_id
      AND (
        t.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM household_members hm
          WHERE hm.household_id = t.household_id
            AND hm.user_id = auth.uid()
        )
      )
  )
);

CREATE POLICY "Household members manage trip decisions"
ON trip_decisions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = trip_decisions.trip_id
      AND (
        t.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM household_members hm
          WHERE hm.household_id = t.household_id
            AND hm.user_id = auth.uid()
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = trip_decisions.trip_id
      AND (
        t.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM household_members hm
          WHERE hm.household_id = t.household_id
            AND hm.user_id = auth.uid()
        )
      )
  )
);

CREATE POLICY "Household members manage trip itinerary"
ON trip_itinerary_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = trip_itinerary_items.trip_id
      AND (
        t.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM household_members hm
          WHERE hm.household_id = t.household_id
            AND hm.user_id = auth.uid()
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = trip_itinerary_items.trip_id
      AND (
        t.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM household_members hm
          WHERE hm.household_id = t.household_id
            AND hm.user_id = auth.uid()
        )
      )
  )
);

CREATE POLICY "Household members manage trip knowledge"
ON trip_knowledge_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = trip_knowledge_items.trip_id
      AND (
        t.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM household_members hm
          WHERE hm.household_id = t.household_id
            AND hm.user_id = auth.uid()
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = trip_knowledge_items.trip_id
      AND (
        t.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM household_members hm
          WHERE hm.household_id = t.household_id
            AND hm.user_id = auth.uid()
        )
      )
  )
);

CREATE POLICY "Household members manage trip knowledge favorites"
ON trip_knowledge_favorites
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = trip_knowledge_favorites.trip_id
      AND (
        t.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM household_members hm
          WHERE hm.household_id = t.household_id
            AND hm.user_id = auth.uid()
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = trip_knowledge_favorites.trip_id
      AND (
        t.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM household_members hm
          WHERE hm.household_id = t.household_id
            AND hm.user_id = auth.uid()
        )
      )
  )
);
