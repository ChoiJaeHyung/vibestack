-- user_concept_mastery에 concept_key 컬럼 추가
-- NULL = 레거시 기술 단위 숙련도 (폴백으로 유지)
ALTER TABLE user_concept_mastery
  ADD COLUMN IF NOT EXISTS concept_key TEXT;

-- 새 복합 유니크 인덱스 (concept_key NULL 허용)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ucm_user_knowledge_concept
  ON user_concept_mastery(user_id, knowledge_id, COALESCE(concept_key, '__TECH_LEVEL__'));

-- 개념별 조회용 인덱스
CREATE INDEX IF NOT EXISTS idx_ucm_concept_key
  ON user_concept_mastery(user_id, concept_key)
  WHERE concept_key IS NOT NULL;

COMMENT ON COLUMN user_concept_mastery.concept_key IS
  'NULL = 기술 단위 숙련도(레거시 폴백). 값 있음 = 개념 단위 숙련도.';
