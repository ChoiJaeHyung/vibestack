-- 013: Architecture challenges for interactive architecture map
-- Stores user attempts at architecture diagram quizzes and freeform challenges

CREATE TABLE IF NOT EXISTS architecture_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  challenge_type TEXT NOT NULL DEFAULT 'guided' CHECK (challenge_type IN ('guided', 'freeform')),
  diagram_type TEXT NOT NULL DEFAULT 'tech_stack' CHECK (diagram_type IN ('tech_stack', 'file_dependency', 'data_flow')),
  user_answer JSONB DEFAULT '{}',
  correct_answer JSONB DEFAULT '{}',
  score INTEGER CHECK (score >= 0 AND score <= 100),
  feedback JSONB DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_arch_challenges_user_project
  ON architecture_challenges(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_arch_challenges_created
  ON architecture_challenges(created_at DESC);

-- RLS
ALTER TABLE architecture_challenges ENABLE ROW LEVEL SECURITY;

-- Users can read/insert/update their own challenges
CREATE POLICY "Users can view own architecture challenges"
  ON architecture_challenges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own architecture challenges"
  ON architecture_challenges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own architecture challenges"
  ON architecture_challenges FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role full access on architecture_challenges"
  ON architecture_challenges FOR ALL
  USING (auth.role() = 'service_role');
