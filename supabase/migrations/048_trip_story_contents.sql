-- Generated content scaffolds built from selected destination story materials.

CREATE TABLE IF NOT EXISTS public.trip_story_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  area TEXT,
  content_style TEXT NOT NULL,
  selected_materials JSONB NOT NULL DEFAULT '[]'::jsonb,
  scaffold JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trip_story_contents_trip_idx
  ON public.trip_story_contents(trip_id, updated_at DESC);

CREATE TRIGGER trigger_trip_story_contents_updated_at
  BEFORE UPDATE ON public.trip_story_contents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_trip_ops_updated_at();

ALTER TABLE public.trip_story_contents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members manage trip story contents"
ON public.trip_story_contents
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_story_contents.trip_id
      AND (
        t.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.household_members hm
          WHERE hm.household_id = t.household_id
            AND hm.user_id = auth.uid()
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_story_contents.trip_id
      AND (
        t.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.household_members hm
          WHERE hm.household_id = t.household_id
            AND hm.user_id = auth.uid()
        )
      )
  )
);
