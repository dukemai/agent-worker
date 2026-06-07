-- Trip Ops weather forecasts fetched for a user-selected trip location.

CREATE TABLE IF NOT EXISTS public.trip_weather_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  provider TEXT NOT NULL DEFAULT 'open-meteo',
  location_label TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  summary TEXT,
  weather_code INTEGER,
  temperature_min_c NUMERIC,
  temperature_max_c NUMERIC,
  precipitation_probability INTEGER,
  precipitation_mm NUMERIC,
  wind_speed_mps NUMERIC,
  raw_forecast JSONB NOT NULL DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trip_id, forecast_date)
);

CREATE INDEX IF NOT EXISTS trip_weather_forecasts_trip_idx
  ON public.trip_weather_forecasts(trip_id, forecast_date);

CREATE TRIGGER trigger_trip_weather_forecasts_updated_at
  BEFORE UPDATE ON public.trip_weather_forecasts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_trip_ops_updated_at();

ALTER TABLE public.trip_weather_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members manage trip weather forecasts"
ON public.trip_weather_forecasts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_weather_forecasts.trip_id
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
    WHERE t.id = trip_weather_forecasts.trip_id
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
