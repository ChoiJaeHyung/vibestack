-- 025: 학습 경로 공개 설정
-- learning_paths에 is_public 컬럼 추가 + 비로그인 사용자 RLS

ALTER TABLE learning_paths ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- 비로그인 사용자도 is_public=true인 학습 경로를 조회 가능
CREATE POLICY "Anyone can view public learning paths"
  ON learning_paths FOR SELECT
  USING (is_public = true);

-- 비로그인 사용자도 공개 학습 경로의 모듈을 조회 가능
CREATE POLICY "Anyone can view modules of public learning paths"
  ON learning_modules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM learning_paths lp
      WHERE lp.id = learning_modules.learning_path_id
        AND lp.is_public = true
    )
  );
