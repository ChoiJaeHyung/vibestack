-- 015: Knowledge Graph — concept mastery tracking
-- Adds inter-tech prerequisites to technology_knowledge + user mastery table

-- ─────────────────────────────────────────────────────
-- 1. Add prerequisites column to technology_knowledge
-- ─────────────────────────────────────────────────────
ALTER TABLE technology_knowledge
  ADD COLUMN IF NOT EXISTS prerequisites JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN technology_knowledge.prerequisites IS
  'Array of technology_name_normalized strings that are prerequisites for this technology (inter-tech dependency)';

-- ─────────────────────────────────────────────────────
-- 2. Seed inter-tech prerequisites for existing data
-- ─────────────────────────────────────────────────────

-- Next.js depends on React
UPDATE technology_knowledge
SET prerequisites = '["react"]'::jsonb
WHERE technology_name_normalized = 'next.js';

-- Others have no inter-tech prerequisites (React, TypeScript, Supabase, Tailwind are independent)

-- ─────────────────────────────────────────────────────
-- 3. user_concept_mastery table
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_concept_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  knowledge_id UUID NOT NULL REFERENCES technology_knowledge(id) ON DELETE CASCADE,
  mastery_level INTEGER NOT NULL DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 100),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, knowledge_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_concept_mastery_user ON user_concept_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_user_concept_mastery_knowledge ON user_concept_mastery(knowledge_id);

-- ─────────────────────────────────────────────────────
-- 4. RLS
-- ─────────────────────────────────────────────────────
ALTER TABLE user_concept_mastery ENABLE ROW LEVEL SECURITY;

-- Users can read their own mastery
CREATE POLICY "Users can view own mastery"
  ON user_concept_mastery FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own mastery
CREATE POLICY "Users can insert own mastery"
  ON user_concept_mastery FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own mastery
CREATE POLICY "Users can update own mastery"
  ON user_concept_mastery FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role bypass
CREATE POLICY "Service role full access on user_concept_mastery"
  ON user_concept_mastery FOR ALL
  USING (auth.role() = 'service_role');
