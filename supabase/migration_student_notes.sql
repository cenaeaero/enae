-- =============================================================================
-- Anotaciones internas del admin sobre alumnos
-- - profile_id requerido (alumno)
-- - registration_id opcional (atadas a un curso específico)
-- - author_email para auditoría
-- =============================================================================

CREATE TABLE IF NOT EXISTS student_notes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  registration_id uuid REFERENCES registrations(id) ON DELETE CASCADE,
  author_email    text NOT NULL,
  body            text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_notes_profile      ON student_notes (profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_notes_registration ON student_notes (registration_id) WHERE registration_id IS NOT NULL;

ALTER TABLE student_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_notes_service ON student_notes;
CREATE POLICY student_notes_service ON student_notes
  FOR ALL TO service_role USING (true) WITH CHECK (true);
