-- Add last_reviewed_at for Ebbinghaus forgetting curve decay
ALTER TABLE user_concept_mastery
  ADD COLUMN IF NOT EXISTS last_reviewed_at timestamptz;

-- Backfill existing rows: use updated_at as initial last_reviewed_at
UPDATE user_concept_mastery
  SET last_reviewed_at = updated_at
  WHERE last_reviewed_at IS NULL;

-- Set default for new rows
ALTER TABLE user_concept_mastery
  ALTER COLUMN last_reviewed_at SET DEFAULT now();

-- Index for decay-based queries (sort by staleness)
CREATE INDEX IF NOT EXISTS idx_ucm_last_reviewed
  ON user_concept_mastery (user_id, last_reviewed_at);
