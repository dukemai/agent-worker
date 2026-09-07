CREATE TABLE IF NOT EXISTS public.learning_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  total_days INT NOT NULL CHECK (total_days > 0 AND total_days <= 365),
  current_day INT NOT NULL DEFAULT 1 CHECK (current_day > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.learning_program_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.learning_programs(id) ON DELETE CASCADE,
  day_number INT NOT NULL CHECK (day_number > 0),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  resources JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (program_id, day_number)
);

CREATE INDEX IF NOT EXISTS learning_programs_status_idx ON public.learning_programs(status);
CREATE INDEX IF NOT EXISTS learning_program_days_program_idx ON public.learning_program_days(program_id, day_number);

DROP TRIGGER IF EXISTS trigger_learning_programs_updated_at ON public.learning_programs;
CREATE TRIGGER trigger_learning_programs_updated_at
  BEFORE UPDATE ON public.learning_programs
  FOR EACH ROW EXECUTE FUNCTION public.handle_trip_ops_updated_at();

ALTER TABLE public.learning_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_program_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated full access" ON public.learning_programs;
CREATE POLICY "Authenticated full access" ON public.learning_programs
FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Authenticated full access" ON public.learning_program_days;
CREATE POLICY "Authenticated full access" ON public.learning_program_days
FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
