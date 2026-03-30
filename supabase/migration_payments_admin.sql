-- ============================================
-- MIGRATION: Admin Payments + Refund Support
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Add 'refunded' to payments status CHECK constraint
ALTER TABLE payments DROP CONSTRAINT payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'refunded'));

-- 2. Add refund fields
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS refund_amount INTEGER,
  ADD COLUMN IF NOT EXISTS refund_response JSONB,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- 3. Enable RLS on payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 4. Admin can do everything with payments
CREATE POLICY "Admins can manage payments"
  ON payments FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 5. Users can view own payments (through their registrations)
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT USING (
    registration_id IN (
      SELECT id FROM registrations
      WHERE email = (SELECT email FROM profiles WHERE user_id = auth.uid())
    )
  );

-- 6. Allow service role inserts (for payment creation API)
CREATE POLICY "Service can insert payments"
  ON payments FOR INSERT WITH CHECK (true);
