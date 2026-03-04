-- 014: Code health scores and refactoring challenges
-- Stores project health scores, challenge templates, and user challenge attempts

-- ── code_health_scores ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS code_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  scores JSONB NOT NULL DEFAULT '{}',
  improvement_items JSONB NOT NULL DEFAULT '[]',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id)
);

CREATE INDEX IF NOT EXISTS idx_health_scores_project
  ON code_health_scores(project_id);

ALTER TABLE code_health_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project health scores"
  ON code_health_scores FOR SELECT
  USING (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own project health scores"
  ON code_health_scores FOR INSERT
  WITH CHECK (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update own project health scores"
  ON code_health_scores FOR UPDATE
  USING (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ));

CREATE POLICY "Service role full access on code_health_scores"
  ON code_health_scores FOR ALL
  USING (auth.role() = 'service_role');

-- ── challenge_templates ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS challenge_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title_ko TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_ko TEXT NOT NULL,
  description_en TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'intermediate' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  pattern_matcher JSONB NOT NULL DEFAULT '{}',
  hints JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE challenge_templates ENABLE ROW LEVEL SECURITY;

-- Anyone can view active templates
CREATE POLICY "Anyone can view active challenge templates"
  ON challenge_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role full access on challenge_templates"
  ON challenge_templates FOR ALL
  USING (auth.role() = 'service_role');

-- ── refactoring_challenges ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS refactoring_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_id UUID REFERENCES project_files(id) ON DELETE SET NULL,
  template_id UUID REFERENCES challenge_templates(id) ON DELETE SET NULL,
  mission_text_ko TEXT NOT NULL DEFAULT '',
  mission_text_en TEXT NOT NULL DEFAULT '',
  original_code TEXT NOT NULL DEFAULT '',
  user_submission TEXT,
  reference_answer TEXT,
  hints JSONB NOT NULL DEFAULT '[]',
  score INTEGER CHECK (score >= 0 AND score <= 100),
  ai_feedback JSONB,
  difficulty TEXT NOT NULL DEFAULT 'intermediate' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'submitted', 'completed', 'skipped')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refactoring_challenges_user_project
  ON refactoring_challenges(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_refactoring_challenges_status
  ON refactoring_challenges(status);
CREATE INDEX IF NOT EXISTS idx_refactoring_challenges_created
  ON refactoring_challenges(created_at DESC);

ALTER TABLE refactoring_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own refactoring challenges"
  ON refactoring_challenges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own refactoring challenges"
  ON refactoring_challenges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own refactoring challenges"
  ON refactoring_challenges FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on refactoring_challenges"
  ON refactoring_challenges FOR ALL
  USING (auth.role() = 'service_role');
