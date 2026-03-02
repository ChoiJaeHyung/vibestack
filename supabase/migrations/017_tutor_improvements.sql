-- 017: Tutor improvements — token budget admin setting + feedback table

-- ── Admin setting: monthly token budget for free users ────────────────
INSERT INTO system_settings (setting_key, setting_value, category, description)
VALUES (
  'monthly_token_budget_free',
  '500000',
  'pricing',
  'Monthly token budget for free (non-BYOK) users. Set to null for unlimited.'
)
ON CONFLICT (setting_key) DO NOTHING;

-- ── Tutor feedback table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tutor_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  message_index INTEGER NOT NULL CHECK (message_index >= 0),
  rating VARCHAR(10) NOT NULL CHECK (rating IN ('positive', 'negative')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, conversation_id, message_index)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tutor_feedback_conversation
  ON tutor_feedback(conversation_id);
CREATE INDEX IF NOT EXISTS idx_tutor_feedback_user_created
  ON tutor_feedback(user_id, created_at DESC);

-- RLS
ALTER TABLE tutor_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tutor_feedback_select_own"
  ON tutor_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "tutor_feedback_insert_own"
  ON tutor_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tutor_feedback_update_own"
  ON tutor_feedback FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tutor_feedback_delete_own"
  ON tutor_feedback FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "tutor_feedback_service_role"
  ON tutor_feedback FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
