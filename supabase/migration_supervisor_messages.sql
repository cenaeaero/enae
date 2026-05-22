-- Mensajes que el supervisor envía al admin
CREATE TABLE IF NOT EXISTS supervisor_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_email      text NOT NULL,
  company_id      uuid REFERENCES companies(id) ON DELETE SET NULL,
  about_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  subject         text,
  body            text NOT NULL,
  status          text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','read','answered')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sup_msg_from ON supervisor_messages (from_email);
CREATE INDEX IF NOT EXISTS idx_sup_msg_about ON supervisor_messages (about_profile_id);

ALTER TABLE supervisor_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sm_service ON supervisor_messages;
CREATE POLICY sm_service ON supervisor_messages FOR ALL TO service_role USING (true) WITH CHECK (true);
