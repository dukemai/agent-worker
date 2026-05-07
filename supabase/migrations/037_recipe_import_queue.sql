-- Async recipe source imports: dashboard enqueues pasted markdown, worker extracts later.

CREATE TABLE public.recipe_import_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
  source_url TEXT NOT NULL DEFAULT '',
  source_label TEXT NOT NULL DEFAULT '',
  source_markdown TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processing_started_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  created_recipe_id UUID REFERENCES public.saved_recipes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX recipe_import_queue_user_created_idx
  ON public.recipe_import_queue(user_id, created_at DESC);

CREATE INDEX recipe_import_queue_status_run_after_idx
  ON public.recipe_import_queue(status, run_after, created_at);

CREATE INDEX recipe_import_queue_household_idx
  ON public.recipe_import_queue(household_id);

ALTER TABLE public.recipe_import_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own recipe import queue"
ON public.recipe_import_queue
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_recipe_import_queue_updated_at
  BEFORE UPDATE ON public.recipe_import_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.recipe_import_queue IS
  'Pasted recipe source markdown waiting for scheduled AI extraction into saved_recipes.';

COMMENT ON COLUMN public.recipe_import_queue.source_markdown IS
  'Raw markdown or copied recipe text submitted from the Recipe import tab.';
