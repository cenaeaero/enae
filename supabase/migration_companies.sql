-- =============================================================================
-- Maestro de Empresas
-- - Una tabla `companies` con todos los datos legales/contacto
-- - FK desde billing_cases, registrations, profiles
-- - Backfill desde organization existente
-- - RUT UNIQUE (nulls permitidos para filas backfilleadas que el admin completa)
-- =============================================================================

CREATE TABLE IF NOT EXISTS companies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL UNIQUE,   -- nombre comercial UPPERCASE (clave de unicidad)
  legal_name      text,                   -- razón social formal
  rut             text UNIQUE,            -- 76.123.456-7 (UNIQUE permitiendo nulls durante backfill)
  address         text,
  city            text,
  region          text,
  country         text DEFAULT 'Chile',
  phone           text,
  email           text,
  website         text,
  contact_name    text,
  contact_email   text,
  contact_phone   text,
  notes           text,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companies_name ON companies (name);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION companies_touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_companies_updated_at ON companies;
CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION companies_touch_updated_at();

-- =============================================================================
-- FKs en tablas existentes (nullable, no rompen filas legacy)
-- =============================================================================

ALTER TABLE billing_cases
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL;

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_billing_cases_company_id ON billing_cases (company_id);
CREATE INDEX IF NOT EXISTS idx_registrations_company_id ON registrations (company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles (company_id);

-- =============================================================================
-- Backfill: crea una empresa por cada nombre distinto en
-- registrations.organization / profiles.organization
-- =============================================================================

INSERT INTO companies (name)
SELECT DISTINCT organization
FROM (
  SELECT organization FROM registrations WHERE organization IS NOT NULL AND organization <> ''
  UNION
  SELECT organization FROM profiles      WHERE organization IS NOT NULL AND organization <> ''
) AS s
WHERE organization NOT IN (SELECT name FROM companies)
ON CONFLICT (name) DO NOTHING;

-- Linkear por nombre
UPDATE registrations r
SET company_id = c.id
FROM companies c
WHERE r.organization = c.name AND r.company_id IS NULL;

UPDATE profiles p
SET company_id = c.id
FROM companies c
WHERE p.organization = c.name AND p.company_id IS NULL;

UPDATE billing_cases bc
SET company_id = c.id
FROM companies c
WHERE bc.company = c.name AND bc.company_id IS NULL;

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS companies_service ON companies;
CREATE POLICY companies_service ON companies
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Lectura para usuarios autenticados (el picker la usa)
DROP POLICY IF EXISTS companies_read ON companies;
CREATE POLICY companies_read ON companies
  FOR SELECT TO authenticated USING (true);
