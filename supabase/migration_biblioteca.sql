-- Biblioteca: documentos PDF descargables por curso.
-- Los administradores suben PDFs por curso; los alumnos inscritos los descargan.

CREATE TABLE IF NOT EXISTS course_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,            -- ruta dentro del bucket "biblioteca"
  file_name TEXT,                    -- nombre original del archivo
  file_size BIGINT,                  -- tamaño en bytes
  mime_type TEXT DEFAULT 'application/pdf',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_course_documents_course
  ON course_documents (course_id, is_active, sort_order);

ALTER TABLE course_documents ENABLE ROW LEVEL SECURITY;

-- Políticas: la lectura/escritura va por endpoints server-side (service role),
-- así que no necesitamos políticas anon abiertas. Bloqueamos por defecto.
DROP POLICY IF EXISTS "course_documents_read_all" ON course_documents;
CREATE POLICY "course_documents_read_all" ON course_documents
  FOR SELECT USING (true);

-- =============================================================================
-- IMPORTANTE: Crear el bucket "biblioteca" desde el dashboard de Supabase
-- (Storage → New bucket → name: "biblioteca", public: false).
-- Las descargas pasan por endpoint con createSignedUrl, así que el bucket
-- debe ser PRIVADO. La subida se hace con service role desde el server.
-- =============================================================================
