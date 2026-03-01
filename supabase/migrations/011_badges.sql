-- 011_badges.sql: Badge/Achievement system
-- badges: badge definitions
-- user_badges: per-user earned badges

-- badges: 배지 정의
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(10) NOT NULL,
  condition_type VARCHAR(50) NOT NULL,
  condition_value INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- user_badges: 사용자별 획득 배지
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- RLS
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- badges는 모든 인증된 사용자가 읽기 가능
CREATE POLICY "Authenticated users can view badges"
  ON badges FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role full access on badges"
  ON badges FOR ALL
  USING (auth.role() = 'service_role');

-- user_badges는 본인만 조회/삽입
CREATE POLICY "Users can view own badges"
  ON user_badges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own badges"
  ON user_badges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access on user_badges"
  ON user_badges FOR ALL
  USING (auth.role() = 'service_role');

-- 시드 데이터: 8종 배지
INSERT INTO badges (slug, name, description, icon, condition_type, condition_value) VALUES
  ('first_step', '첫 발자국', '첫 번째 모듈을 완료했어요', '👶', 'module_complete_total', 1),
  ('consistent_learner', '꾸준한 학습자', '7일 연속 학습을 달성했어요', '🔥', 'streak_days', 7),
  ('quiz_master', '퀴즈 마스터', '퀴즈에서 3번 연속 만점을 받았어요', '🧠', 'quiz_perfect_streak', 3),
  ('code_challenger', '코드 챌린저', '코드 챌린지 10개를 해결했어요', '💻', 'challenge_complete', 10),
  ('fullstack_explorer', '풀스택 탐험가', '커리큘럼 1개를 전부 완료했어요', '🎓', 'path_complete', 1),
  ('versatile', '다재다능', '3개 이상의 기술 스택을 학습했어요', '🌈', 'tech_variety', 3),
  ('ai_friend', 'AI 친구', 'AI 튜터와 50번 대화했어요', '🤖', 'tutor_chats', 50),
  ('speedster', '속도광', '모듈 1개를 10분 안에 완료했어요', '⚡', 'fast_complete_minutes', 10);
