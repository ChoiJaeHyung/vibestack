-- Project-level concept matching cache
-- Stores which KB concepts are detected in a project's source files
-- Computed once after analysis, re-computed on re-analysis

CREATE TABLE IF NOT EXISTS project_concept_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  technology_name TEXT NOT NULL,
  concept_key TEXT NOT NULL,
  match_score REAL NOT NULL DEFAULT 0,
  matched_files TEXT[] DEFAULT '{}',
  marker_summary JSONB DEFAULT '{}',
  computed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, technology_name, concept_key)
);

CREATE INDEX idx_pcm_project ON project_concept_matches(project_id);

-- RLS
ALTER TABLE project_concept_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project matches"
  ON project_concept_matches FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );
