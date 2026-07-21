-- Migration: Documentos adicionales por asignación instructor-alumno
-- El instructor puede subir varios archivos por alumno (además de la hoja de
-- evaluación única que ya existe en instructor_assignments.evaluation_file_url).
-- Ejecutar en el SQL Editor de Supabase (idempotente).

CREATE TABLE IF NOT EXISTS instructor_assignment_documents (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id    uuid NOT NULL REFERENCES instructor_assignments(id) ON DELETE CASCADE,
  instructor_email text NOT NULL,
  file_path        text NOT NULL,
  file_name        text NOT NULL,
  uploaded_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inst_docs_assignment ON instructor_assignment_documents (assignment_id);

ALTER TABLE instructor_assignment_documents ENABLE ROW LEVEL SECURITY;
-- Se accede solo vía APIs con service role; la política evita el deny-all accidental.
DROP POLICY IF EXISTS "Service role access" ON instructor_assignment_documents;
CREATE POLICY "Service role access" ON instructor_assignment_documents FOR ALL USING (true) WITH CHECK (true);

-- Bucket privado para estos documentos
INSERT INTO storage.buckets (id, name, public)
VALUES ('instructor-documents', 'instructor-documents', false)
ON CONFLICT (id) DO NOTHING;
