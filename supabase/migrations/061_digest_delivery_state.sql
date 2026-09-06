-- Remember which digest candidates were actually delivered so unchanged items can stay quiet.
CREATE TABLE IF NOT EXISTS public.digest_item_delivery_state (
  item_key TEXT PRIMARY KEY,
  content_hash TEXT NOT NULL,
  last_shown_on DATE NOT NULL,
  show_count INT NOT NULL DEFAULT 1 CHECK (show_count > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.digest_item_delivery_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated full access" ON public.digest_item_delivery_state;
CREATE POLICY "Authenticated full access" ON public.digest_item_delivery_state
FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
