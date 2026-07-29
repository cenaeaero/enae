-- ============================================
-- MIGRATION: Paddle (Merchant of Record) para cobros internacionales en USD
-- Convive con Transbank Webpay (CLP). No modifica el flujo existente.
-- ============================================

-- 1) Distinguir el proveedor de cada pago y guardar datos de Paddle.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'transbank';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paddle_transaction_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paddle_response JSONB;

-- Índice para buscar el pago cuando llega el webhook de Paddle.
CREATE INDEX IF NOT EXISTS idx_payments_paddle_txn ON payments (paddle_transaction_id);

-- 2) Precio internacional por sesión, en dólares enteros (USD).
--    NULL = esta sesión no ofrece pago internacional (solo Webpay/CLP).
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS price_usd INTEGER;

-- Nota: payments.amount ya existe (INTEGER) y payments.currency (TEXT DEFAULT 'CLP').
-- Para pagos Paddle guardamos amount = dólares enteros y currency = 'USD'.
