-- Migration: Educational Analysis System
-- Stores LLM-generated educational metadata collected during MCP sync

-- ─── Educational Analyses Table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.educational_analyses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  analysis_data   JSONB NOT NULL DEFAULT '{}',
  analysis_version INTEGER DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id)  -- one analysis per project, upsert on re-sync
);

-- ─── Indexes ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_educational_analyses_project_id ON public.educational_analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_educational_analyses_user_id ON public.educational_analyses(user_id);

-- ─── RLS ────────────────────────────────────────────────────────────
ALTER TABLE public.educational_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_educational_analyses" ON public.educational_analyses
  FOR ALL USING (user_id = auth.uid());

-- Allow service role full access (for API key auth)
CREATE POLICY "service_role_educational_analyses" ON public.educational_analyses
  FOR ALL USING (auth.role() = 'service_role');

-- ─── Updated_at helper function (idempotent) ──────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── Updated_at trigger ─────────────────────────────────────────────
CREATE TRIGGER update_educational_analyses_updated_at
  BEFORE UPDATE ON public.educational_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
