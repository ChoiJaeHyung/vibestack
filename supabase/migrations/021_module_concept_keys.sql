-- Module → Concept 커버리지 관계 컬럼
ALTER TABLE learning_modules
  ADD COLUMN IF NOT EXISTS concept_keys TEXT[] DEFAULT '{}';

COMMENT ON COLUMN learning_modules.concept_keys IS
  'KB concept_key 배열. 이 모듈이 가르치는 개념들. LLM 태깅 + 알고리즘 추론.';

-- GIN 인덱스: "이 개념을 가르치는 모듈은?" 역방향 쿼리용
CREATE INDEX IF NOT EXISTS idx_lm_concept_keys
  ON learning_modules USING GIN (concept_keys);
