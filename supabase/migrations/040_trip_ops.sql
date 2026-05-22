-- Trip Ops: family travel planning as options, decisions, itinerary blocks, and task links.

CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  destination TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('ideas', 'planning', 'upcoming', 'archived')),
  start_date DATE,
  end_date DATE,
  logistics TEXT,
  participants TEXT,
  already_done TEXT,
  preferences TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX trips_user_status_idx ON trips(user_id, status);
CREATE INDEX trips_start_date_idx ON trips(start_date);

CREATE TABLE trip_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  option_type TEXT NOT NULL DEFAULT 'activity' CHECK (
    option_type IN ('activity', 'food', 'rainy_day', 'scenic_stop', 'logistics', 'other')
  ),
  status TEXT NOT NULL DEFAULT 'maybe' CHECK (status IN ('maybe', 'shortlisted', 'planned', 'rejected')),
  location TEXT,
  best_for TEXT,
  effort TEXT CHECK (effort IS NULL OR effort IN ('low', 'medium', 'high')),
  weather_fit TEXT CHECK (weather_fit IS NULL OR weather_fit IN ('sun', 'rain', 'any')),
  kid_fit TEXT CHECK (kid_fit IS NULL OR kid_fit IN ('low', 'medium', 'high')),
  booking_needed BOOLEAN NOT NULL DEFAULT FALSE,
  why TEXT,
  notes TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX trip_options_trip_idx ON trip_options(trip_id, status, sort_order);

CREATE TABLE trip_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'waiting', 'decided')),
  owner TEXT,
  due_date DATE,
  outcome TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX trip_decisions_trip_idx ON trip_decisions(trip_id, status, due_date);

CREATE TABLE trip_itinerary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day_number INT NOT NULL CHECK (day_number >= 1 AND day_number <= 30),
  block TEXT NOT NULL CHECK (block IN ('morning', 'lunch', 'afternoon', 'backup', 'drop_first')),
  title TEXT NOT NULL,
  option_id UUID REFERENCES trip_options(id) ON DELETE SET NULL,
  notes TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX trip_itinerary_items_trip_day_idx ON trip_itinerary_items(trip_id, day_number, sort_order);

CREATE OR REPLACE FUNCTION public.handle_trip_ops_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_trip_ops_updated_at();

CREATE TRIGGER trigger_trip_options_updated_at
  BEFORE UPDATE ON public.trip_options
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_trip_ops_updated_at();

CREATE TRIGGER trigger_trip_decisions_updated_at
  BEFORE UPDATE ON public.trip_decisions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_trip_ops_updated_at();

CREATE TRIGGER trigger_trip_itinerary_items_updated_at
  BEFORE UPDATE ON public.trip_itinerary_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_trip_ops_updated_at();

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_itinerary_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own trips"
ON trips
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own trip options"
ON trip_options
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = trip_options.trip_id AND t.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = trip_options.trip_id AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Users manage own trip decisions"
ON trip_decisions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = trip_decisions.trip_id AND t.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = trip_decisions.trip_id AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Users manage own trip itinerary"
ON trip_itinerary_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = trip_itinerary_items.trip_id AND t.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = trip_itinerary_items.trip_id AND t.user_id = auth.uid()
  )
);

