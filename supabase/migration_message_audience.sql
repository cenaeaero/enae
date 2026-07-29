-- Migration: canal del mensaje (a quién va dirigido).
--   'admin'      → mensaje del alumno a la escuela/administración (los instructores NO lo ven)
--   'instructor' → conversación alumno ↔ instructor asignado
-- Los mensajes históricos se marcan como 'admin' (eran del canal escuela).
-- Ejecutar en el SQL Editor de Supabase (idempotente).

ALTER TABLE course_messages ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'admin';
CREATE INDEX IF NOT EXISTS idx_course_messages_audience ON course_messages (registration_id, audience);
