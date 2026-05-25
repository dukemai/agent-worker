-- Read-only public Trip Ops share links.

CREATE TABLE public.trip_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  public_slug TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  title TEXT NOT NULL DEFAULT '',
  disabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX trip_share_links_user_idx
  ON public.trip_share_links(user_id, updated_at DESC);

CREATE INDEX trip_share_links_trip_idx
  ON public.trip_share_links(trip_id, updated_at DESC);

CREATE UNIQUE INDEX trip_share_links_active_trip_idx
  ON public.trip_share_links(user_id, trip_id)
  WHERE disabled_at IS NULL;

CREATE TRIGGER trigger_trip_share_links_updated_at
  BEFORE UPDATE ON public.trip_share_links
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_trip_ops_updated_at();

ALTER TABLE public.trip_share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own trip share links"
ON public.trip_share_links
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.trips t
    WHERE t.id = trip_share_links.trip_id
      AND (
        t.user_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.household_members hm
          WHERE hm.household_id = t.household_id
            AND hm.user_id = auth.uid()
        )
      )
  )
);

CREATE OR REPLACE FUNCTION public.get_trip_share_by_slug(p_slug text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT CASE
    WHEN l.id IS NULL THEN NULL
    ELSE jsonb_build_object(
      'share', jsonb_build_object(
        'id', l.id,
        'slug', l.public_slug,
        'trip_id', l.trip_id,
        'title', l.title,
        'created_at', l.created_at
      ),
      'trip', jsonb_build_object(
        'id', t.id,
        'title', t.title,
        'destination', t.destination,
        'status', t.status,
        'start_date', t.start_date,
        'end_date', t.end_date,
        'adult_count', t.adult_count,
        'kid_count', t.kid_count,
        'kid_ages', t.kid_ages,
        'already_done', t.already_done,
        'preferences', t.preferences,
        'selected_preferences', t.selected_preferences,
        'logistics_details', t.logistics_details,
        'created_at', t.created_at,
        'updated_at', t.updated_at
      ),
      'options', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', o.id,
              'trip_id', o.trip_id,
              'title', o.title,
              'option_type', o.option_type,
              'status', o.status,
              'location', o.location,
              'best_for', o.best_for,
              'effort', o.effort,
              'weather_fit', o.weather_fit,
              'kid_fit', o.kid_fit,
              'booking_needed', o.booking_needed,
              'why', o.why,
              'notes', o.notes,
              'sort_order', o.sort_order,
              'created_at', o.created_at,
              'updated_at', o.updated_at
            )
            ORDER BY o.sort_order, o.created_at
          )
          FROM public.trip_options o
          WHERE o.trip_id = t.id
            AND o.status <> 'rejected'
        ),
        '[]'::jsonb
      ),
      'decisions', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', d.id,
              'trip_id', d.trip_id,
              'title', d.title,
              'status', d.status,
              'owner', d.owner,
              'due_date', d.due_date,
              'outcome', d.outcome,
              'notes', d.notes,
              'created_at', d.created_at,
              'updated_at', d.updated_at
            )
            ORDER BY d.due_date NULLS LAST, d.created_at
          )
          FROM public.trip_decisions d
          WHERE d.trip_id = t.id
        ),
        '[]'::jsonb
      ),
      'itinerary', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', i.id,
              'trip_id', i.trip_id,
              'day_number', i.day_number,
              'block', i.block,
              'title', i.title,
              'option_id', i.option_id,
              'notes', i.notes,
              'sort_order', i.sort_order,
              'created_at', i.created_at,
              'updated_at', i.updated_at
            )
            ORDER BY i.day_number, i.sort_order, i.created_at
          )
          FROM public.trip_itinerary_items i
          WHERE i.trip_id = t.id
        ),
        '[]'::jsonb
      ),
      'knowledge_favorites', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', f.id,
              'trip_id', f.trip_id,
              'item_type', f.item_type,
              'name', f.name,
              'area', f.area,
              'created_at', f.created_at
            )
            ORDER BY f.created_at DESC
          )
          FROM public.trip_knowledge_favorites f
          WHERE f.trip_id = t.id
        ),
        '[]'::jsonb
      )
    )
  END
  FROM public.trip_share_links l
  JOIN public.trips t ON t.id = l.trip_id
  WHERE l.public_slug = p_slug
    AND l.disabled_at IS NULL
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_trip_share_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_trip_share_by_slug(text) TO anon, authenticated;

COMMENT ON TABLE public.trip_share_links IS
  'Opaque read-only public links for Trip Ops plans.';

COMMENT ON FUNCTION public.get_trip_share_by_slug(text) IS
  'Returns a public-safe read-only trip share payload by opaque slug.';
