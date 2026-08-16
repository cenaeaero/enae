-- Migration: módulo de Marketing (campañas de correo con métricas)
--   leads              → interesados del formulario "Solicitar información"
--   email_campaigns    → campañas de correo
--   email_recipients   → destinatarios por campaña con tracking (envío/apertura/clic)
-- Ejecutar en el SQL Editor de Supabase (idempotente).

CREATE TABLE IF NOT EXISTS leads (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name     text,
  last_name      text,
  email          text NOT NULL,
  phone          text,
  course_interest text,
  message        text,
  source         text DEFAULT 'contacto',
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads (lower(email));

CREATE TABLE IF NOT EXISTS email_campaigns (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject            text NOT NULL,
  body_html          text NOT NULL,
  promoted_course_id uuid REFERENCES courses(id) ON DELETE SET NULL,
  audience           jsonb NOT NULL DEFAULT '{}'::jsonb,   -- filtros usados (informativo)
  status             text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sending','sent')),
  created_by         text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  sent_at            timestamptz,
  total_recipients   integer DEFAULT 0,
  daily_batch        integer NOT NULL DEFAULT 100   -- correos por día (cron diario envía el resto)
);

CREATE TABLE IF NOT EXISTS email_recipients (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   uuid NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  email         text NOT NULL,
  name          text,
  token         text NOT NULL UNIQUE,
  sent_at       timestamptz,
  error         text,
  opened_at     timestamptz,
  open_count    integer NOT NULL DEFAULT 0,
  clicked_at    timestamptz,
  click_count   integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, email)
);
CREATE INDEX IF NOT EXISTS idx_email_recipients_campaign ON email_recipients (campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_recipients_token ON email_recipients (token);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_recipients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS srv_leads ON leads;
DROP POLICY IF EXISTS srv_camp ON email_campaigns;
DROP POLICY IF EXISTS srv_recip ON email_recipients;
CREATE POLICY srv_leads ON leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY srv_camp ON email_campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY srv_recip ON email_recipients FOR ALL USING (true) WITH CHECK (true);
