-- ─── Stripe → 토스페이먼츠 마이그레이션 ─────────────────────────────

-- stripe_customer_id → toss_customer_key 변경
ALTER TABLE users RENAME COLUMN stripe_customer_id TO toss_customer_key;

-- 빌링키 저장 컬럼 추가 (자동결제용)
ALTER TABLE users ADD COLUMN toss_billing_key TEXT;

-- 결제 내역 테이블 (Stripe Portal 대체 → 자체 구독 관리 UI)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL UNIQUE,
  payment_key TEXT,
  plan TEXT NOT NULL CHECK (plan IN ('pro', 'team')),
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'canceled', 'failed')),
  method TEXT,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own payments" ON payments FOR SELECT USING (auth.uid() = user_id);
