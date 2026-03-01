-- ─── Payments table RLS hardening ─────────────────────────────────────
-- Existing policy: "Users can view own payments" (SELECT, auth.uid() = user_id)
-- Add explicit DENY policies for INSERT/UPDATE/DELETE via anon/authenticated roles
-- Only service_role (server-side) should be able to insert/update/delete payments

-- Deny INSERT for all non-service roles
CREATE POLICY "Deny direct payment insert"
  ON payments FOR INSERT
  WITH CHECK (false);

-- Deny UPDATE for all non-service roles
CREATE POLICY "Deny direct payment update"
  ON payments FOR UPDATE
  USING (false)
  WITH CHECK (false);

-- Deny DELETE for all non-service roles
CREATE POLICY "Deny direct payment delete"
  ON payments FOR DELETE
  USING (false);

-- Admin SELECT policy for consistency
CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );
