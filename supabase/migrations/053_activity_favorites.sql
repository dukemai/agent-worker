ALTER TABLE public.local_activities
ADD COLUMN IF NOT EXISTS favorite BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.seasonal_activity_instances
ADD COLUMN IF NOT EXISTS favorite BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS local_activities_favorite_idx
ON public.local_activities(status, favorite, updated_at DESC);

CREATE INDEX IF NOT EXISTS seasonal_activity_instances_favorite_idx
ON public.seasonal_activity_instances(status, favorite, valid_from);
