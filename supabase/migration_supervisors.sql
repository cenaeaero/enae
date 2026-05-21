-- =============================================================================
-- Portal del Supervisor de Empresa
-- - Hasta 3 supervisores por empresa
-- - Cada uno tiene un profile.role = 'supervisor'
-- =============================================================================

CREATE TABLE IF NOT EXISTS company_supervisors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slot        smallint NOT NULL CHECK (slot BETWEEN 1 AND 3),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, slot),
  UNIQUE (company_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_company_supervisors_company ON company_supervisors (company_id);
CREATE INDEX IF NOT EXISTS idx_company_supervisors_profile ON company_supervisors (profile_id);

ALTER TABLE company_supervisors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cs_service ON company_supervisors;
CREATE POLICY cs_service ON company_supervisors FOR ALL TO service_role USING (true) WITH CHECK (true);
