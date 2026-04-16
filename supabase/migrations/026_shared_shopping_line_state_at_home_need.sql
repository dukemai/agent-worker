-- Collapse line_state to at_home | need only (drop "want"; map old rows to need).

UPDATE shared_shopping_list_items
SET line_state = 'need'
WHERE line_state = 'want';

ALTER TABLE shared_shopping_list_items
  DROP CONSTRAINT IF EXISTS shared_shopping_list_items_line_state_check;

ALTER TABLE shared_shopping_list_items
  ADD CONSTRAINT shared_shopping_list_items_line_state_check
  CHECK (line_state IN ('at_home', 'need'));

CREATE OR REPLACE FUNCTION public.get_shared_shopping_list_by_slug(p_slug text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT CASE
    WHEN l.id IS NULL THEN NULL
    ELSE jsonb_build_object(
      'title', l.title,
      'slug', l.public_slug,
      'items', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'sort_order', i.sort_order,
              'label', i.label,
              'quantity', i.quantity
            )
            ORDER BY i.sort_order, i.id
          )
          FROM shared_shopping_list_items i
          WHERE i.list_id = l.id
            AND i.line_state = 'need'
        ),
        '[]'::jsonb
      )
    )
  END
  FROM shared_shopping_lists l
  WHERE l.public_slug = p_slug
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_shared_shopping_list_by_slug(text) IS
  'Returns a public-safe JSON payload for a shared list by slug (need lines only).';
