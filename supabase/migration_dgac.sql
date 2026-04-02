-- Migration: DGAC Procedures Management
-- Adds tables for tracking DGAC credential procedures (Nueva, Renovación, Actualización)

-- Table for DGAC procedures linked to student registrations
CREATE TABLE IF NOT EXISTS dgac_procedures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  procedure_type TEXT NOT NULL CHECK (procedure_type IN ('nueva', 'renovacion', 'actualizacion')),
  folio_number TEXT,
  dgac_credential_number TEXT,
  registro_sipa BOOLEAN DEFAULT FALSE,
  solicitud_credencial BOOLEAN DEFAULT FALSE,
  apendice_c BOOLEAN DEFAULT FALSE,
  pago_tasa BOOLEAN DEFAULT FALSE,
  coordinacion_examen BOOLEAN DEFAULT FALSE,
  exam_datetime TIMESTAMPTZ,
  exam_unit_city TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- History log for automatic change tracking
CREATE TABLE IF NOT EXISTS dgac_procedure_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  procedure_id UUID NOT NULL REFERENCES dgac_procedures(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by registration
CREATE INDEX IF NOT EXISTS idx_dgac_procedures_registration ON dgac_procedures(registration_id);
CREATE INDEX IF NOT EXISTS idx_dgac_history_procedure ON dgac_procedure_history(procedure_id);

-- RLS policies
ALTER TABLE dgac_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE dgac_procedure_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to dgac_procedures"
  ON dgac_procedures FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin full access to dgac_procedure_history"
  ON dgac_procedure_history FOR ALL
  USING (true)
  WITH CHECK (true);
