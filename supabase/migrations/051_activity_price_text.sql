ALTER TABLE public.local_activities
ADD COLUMN IF NOT EXISTS price_text TEXT;

ALTER TABLE public.seasonal_activity_instances
ADD COLUMN IF NOT EXISTS price_text TEXT;

