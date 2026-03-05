-- ============================================================
-- 019: Toss Payments → Stripe Migration
-- ============================================================

-- users 테이블: toss 컬럼 제거, stripe 컬럼 추가
ALTER TABLE users DROP COLUMN IF EXISTS toss_customer_key;
ALTER TABLE users DROP COLUMN IF EXISTS toss_billing_key;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- payments 테이블: toss 컬럼 제거, stripe 컬럼 추가
ALTER TABLE payments DROP COLUMN IF EXISTS toss_secret;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'usd';
