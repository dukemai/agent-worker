ALTER TABLE public.activity_sources
ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS activity_sources_queue_run_idx
ON public.activity_sources(status, run_after, created_at)
WHERE status IN ('queued', 'failed');
