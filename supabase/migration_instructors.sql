-- =============================================================================
-- Portal del Instructor + honorarios + datos bancarios
-- =============================================================================

-- 1) Asignación de un instructor a una inscripción concreta
CREATE TABLE IF NOT EXISTS instructor_assignments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_email    text NOT NULL,
  registration_id     uuid NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  kind                text NOT NULL CHECK (kind IN ('theoretical','practical','both')) DEFAULT 'practical',
  city                text,
  scheduled_date      date,
  status              text NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned','in_progress','completed','cancelled')),
  evaluation_file_url text,    -- hoja de evaluación firmada subida por el instructor
  grade_theoretical   numeric(5,2),
  grade_practical     numeric(5,2),
  observations        text,
  completed_at        timestamptz,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inst_assign_instructor   ON instructor_assignments (instructor_email);
CREATE INDEX IF NOT EXISTS idx_inst_assign_registration ON instructor_assignments (registration_id);
CREATE INDEX IF NOT EXISTS idx_inst_assign_status       ON instructor_assignments (status);

-- 2) Honorarios por asignación
CREATE TABLE IF NOT EXISTS instructor_fees (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id     uuid REFERENCES instructor_assignments(id) ON DELETE CASCADE,
  instructor_email  text NOT NULL,
  registration_id   uuid REFERENCES registrations(id) ON DELETE SET NULL,
  amount            numeric(14, 2) NOT NULL,
  proposed_by       text NOT NULL DEFAULT 'admin' CHECK (proposed_by IN ('admin','instructor')),
  status            text NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed','approved','paid','rejected')),
  approved_at       timestamptz,
  payment_date      date,
  payment_amount    numeric(14, 2),
  payment_bank      text,
  payment_reference text,
  receipt_file_url  text,   -- boleta de honorarios subida por el instructor
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inst_fees_instructor ON instructor_fees (instructor_email);
CREATE INDEX IF NOT EXISTS idx_inst_fees_status     ON instructor_fees (status);

-- 3) Trigger updated_at
CREATE OR REPLACE FUNCTION touch_updated_at_generic() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inst_assign_updated ON instructor_assignments;
CREATE TRIGGER trg_inst_assign_updated BEFORE UPDATE ON instructor_assignments
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at_generic();

DROP TRIGGER IF EXISTS trg_inst_fees_updated ON instructor_fees;
CREATE TRIGGER trg_inst_fees_updated BEFORE UPDATE ON instructor_fees
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at_generic();

-- 4) Datos bancarios del instructor en profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_account_type text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_account_number text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_account_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_account_confirmed_at timestamptz;

-- 5) RLS
ALTER TABLE instructor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_fees        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ia_service ON instructor_assignments;
CREATE POLICY ia_service ON instructor_assignments FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS if_service ON instructor_fees;
CREATE POLICY if_service ON instructor_fees FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6) Buckets de Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('instructor-evaluations', 'instructor-evaluations', false, 26214400, ARRAY['application/pdf','image/png','image/jpeg']),
  ('instructor-receipts',    'instructor-receipts',    false, 26214400, ARRAY['application/pdf','image/png','image/jpeg'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "inst-evals service" ON storage.objects;
CREATE POLICY "inst-evals service" ON storage.objects FOR ALL TO service_role
  USING (bucket_id IN ('instructor-evaluations','instructor-receipts'))
  WITH CHECK (bucket_id IN ('instructor-evaluations','instructor-receipts'));
