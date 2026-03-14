-- 029: Add review_count for adaptive decay (Ebbinghaus spacing effect)
-- review_count tracks how many times a concept has been reviewed,
-- allowing the decay half-life to increase with repetition.

ALTER TABLE user_concept_mastery
ADD COLUMN IF NOT EXISTS review_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN user_concept_mastery.review_count IS 'Number of times this concept has been reviewed. Used to extend decay half-life (spacing effect).';
