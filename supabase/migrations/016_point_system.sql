-- 016: Point System — VP (Vibe Points) balance, transactions, rewards
-- Supports learning gamification across all users (BYOK and server-key alike)

-- ── users.nickname ──────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname VARCHAR(30);

-- ── user_points ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_balance INTEGER NOT NULL DEFAULT 0 CHECK (current_balance >= 0),
  total_earned INTEGER NOT NULL DEFAULT 0 CHECK (total_earned >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_points_user ON user_points(user_id);

ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_points_select_own" ON user_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_points_insert_own" ON user_points FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_points_update_own" ON user_points FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_points_service" ON user_points FOR ALL USING (auth.role() = 'service_role');

-- ── point_transactions ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- positive = earn, negative = spend
  transaction_type VARCHAR(50) NOT NULL, -- e.g. 'module_complete', 'quiz_bonus', 'reward_purchase'
  source_id UUID, -- optional reference (module_id, badge_id, reward_id, etc.)
  source_type VARCHAR(50), -- e.g. 'learning_module', 'badge', 'reward'
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_point_tx_user ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_tx_created ON point_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_tx_type ON point_transactions(user_id, transaction_type);

ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "point_tx_select_own" ON point_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "point_tx_service" ON point_transactions FOR ALL USING (auth.role() = 'service_role');

-- ── daily_point_summary ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_point_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary_date DATE NOT NULL DEFAULT CURRENT_DATE,
  earned INTEGER NOT NULL DEFAULT 0,
  spent INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, summary_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_point_summary_user ON daily_point_summary(user_id, summary_date DESC);

ALTER TABLE daily_point_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_summary_select_own" ON daily_point_summary FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "daily_summary_service" ON daily_point_summary FOR ALL USING (auth.role() = 'service_role');

-- ── Trigger: auto-update daily_point_summary on point_transactions insert ──
CREATE OR REPLACE FUNCTION update_daily_point_summary()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO daily_point_summary (user_id, summary_date, earned, spent)
  VALUES (
    NEW.user_id,
    CURRENT_DATE,
    CASE WHEN NEW.amount > 0 THEN NEW.amount ELSE 0 END,
    CASE WHEN NEW.amount < 0 THEN ABS(NEW.amount) ELSE 0 END
  )
  ON CONFLICT (user_id, summary_date)
  DO UPDATE SET
    earned = daily_point_summary.earned + CASE WHEN NEW.amount > 0 THEN NEW.amount ELSE 0 END,
    spent = daily_point_summary.spent + CASE WHEN NEW.amount < 0 THEN ABS(NEW.amount) ELSE 0 END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_daily_point_summary ON point_transactions;
CREATE TRIGGER trg_daily_point_summary
  AFTER INSERT ON point_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_point_summary();

-- ── rewards ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) NOT NULL UNIQUE,
  name_ko TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ko TEXT NOT NULL,
  description_en TEXT NOT NULL,
  cost INTEGER NOT NULL CHECK (cost > 0),
  icon VARCHAR(50) NOT NULL DEFAULT 'Gift',
  category VARCHAR(30) NOT NULL DEFAULT 'general', -- 'general' | 'server_key_only'
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rewards_select_all" ON rewards FOR SELECT USING (true);
CREATE POLICY "rewards_service" ON rewards FOR ALL USING (auth.role() = 'service_role');

-- ── user_rewards ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ, -- NULL = permanent
  is_used BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_user_rewards_user ON user_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_active ON user_rewards(user_id, is_used) WHERE NOT is_used;

ALTER TABLE user_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_rewards_select_own" ON user_rewards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_rewards_service" ON user_rewards FOR ALL USING (auth.role() = 'service_role');

-- ── Seed: 8 rewards ─────────────────────────────────────────────────
INSERT INTO rewards (slug, name_ko, name_en, description_ko, description_en, cost, icon, category, sort_order) VALUES
  ('extra_challenge_3', '추가 챌린지 +3회', 'Extra Challenges +3', '리팩토링 챌린지를 3회 추가로 이용할 수 있어요', 'Get 3 extra refactoring challenge attempts', 800, 'Swords', 'server_key_only', 1),
  ('tutor_personality', 'AI 튜터 성격 변경', 'AI Tutor Personality', 'AI 튜터의 대화 스타일을 변경할 수 있어요', 'Change your AI tutor conversation style', 300, 'Palette', 'general', 2),
  ('learning_report', '학습 리포트', 'Learning Report', '현재까지의 학습 현황을 상세 리포트로 확인하세요', 'Get a detailed report of your learning progress', 500, 'BarChart3', 'general', 3),
  ('path_regenerate', '학습 경로 재생성', 'Regenerate Learning Path', '학습 로드맵을 다시 생성할 수 있어요', 'Regenerate your learning roadmap with fresh content', 1000, 'RefreshCw', 'general', 4),
  ('extra_chat_5', '추가 AI 대화 +5회', 'Extra AI Chats +5', 'AI 튜터 대화를 5회 추가로 이용할 수 있어요', 'Get 5 extra AI tutor chat sessions', 500, 'MessageCirclePlus', 'server_key_only', 5),
  ('extra_project_1', '추가 프로젝트 +1', 'Extra Project +1', '프로젝트를 1개 추가로 분석할 수 있어요', 'Analyze 1 additional project', 2000, 'FolderPlus', 'server_key_only', 6),
  ('learning_certificate', '학습 인증서', 'Learning Certificate', '완료한 학습 경로의 인증서를 발급받으세요', 'Get a certificate for completed learning paths', 1000, 'Award', 'general', 7),
  ('pro_trial_24h', 'Pro 체험 24시간', '24h Pro Trial', '24시간 동안 Pro 플랜의 모든 기능을 체험해보세요', 'Experience all Pro features for 24 hours', 5000, 'Crown', 'server_key_only', 8)
ON CONFLICT (slug) DO NOTHING;
