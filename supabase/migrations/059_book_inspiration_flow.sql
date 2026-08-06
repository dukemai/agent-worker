CREATE TABLE IF NOT EXISTS public.book_inspiration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intention TEXT NOT NULL,
  brief JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT book_inspiration_sessions_status_check CHECK (status IN ('active', 'completed', 'archived'))
);

CREATE TABLE IF NOT EXISTS public.book_inspiration_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.book_inspiration_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT,
  source_url TEXT,
  source_name TEXT,
  factual_summary TEXT,
  facts JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.book_inspiration_shortlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.book_inspiration_sessions(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.book_inspiration_candidates(id) ON DELETE CASCADE,
  rank INT NOT NULL,
  fit_reason TEXT NOT NULL,
  caveats TEXT,
  match_tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT book_inspiration_shortlist_unique_candidate UNIQUE (session_id, candidate_id),
  CONSTRAINT book_inspiration_shortlist_rank_check CHECK (rank > 0)
);

CREATE INDEX IF NOT EXISTS book_inspiration_sessions_user_updated_idx
ON public.book_inspiration_sessions(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS book_inspiration_candidates_session_created_idx
ON public.book_inspiration_candidates(session_id, created_at);
CREATE INDEX IF NOT EXISTS book_inspiration_shortlist_session_rank_idx
ON public.book_inspiration_shortlist_entries(session_id, rank);

DROP TRIGGER IF EXISTS trigger_book_inspiration_sessions_updated_at ON public.book_inspiration_sessions;
CREATE TRIGGER trigger_book_inspiration_sessions_updated_at BEFORE UPDATE ON public.book_inspiration_sessions
FOR EACH ROW EXECUTE FUNCTION public.handle_trip_ops_updated_at();
DROP TRIGGER IF EXISTS trigger_book_inspiration_candidates_updated_at ON public.book_inspiration_candidates;
CREATE TRIGGER trigger_book_inspiration_candidates_updated_at BEFORE UPDATE ON public.book_inspiration_candidates
FOR EACH ROW EXECUTE FUNCTION public.handle_trip_ops_updated_at();
DROP TRIGGER IF EXISTS trigger_book_inspiration_shortlist_updated_at ON public.book_inspiration_shortlist_entries;
CREATE TRIGGER trigger_book_inspiration_shortlist_updated_at BEFORE UPDATE ON public.book_inspiration_shortlist_entries
FOR EACH ROW EXECUTE FUNCTION public.handle_trip_ops_updated_at();

ALTER TABLE public.book_inspiration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_inspiration_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_inspiration_shortlist_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own book inspiration sessions" ON public.book_inspiration_sessions
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage candidates in own sessions" ON public.book_inspiration_candidates
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.book_inspiration_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.book_inspiration_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));
CREATE POLICY "Users manage shortlists in own sessions" ON public.book_inspiration_shortlist_entries
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.book_inspiration_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.book_inspiration_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));
