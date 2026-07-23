-- Migration: brochure descargable del curso + elección de modalidad al inscribirse
--   - courses.brochure_url          → PDF del brochure (bucket público)
--   - courses.allow_attendance_choice → si el alumno elige presencial / online al inscribirse
--   - registrations.delivery_mode ya existe; aquí solo lo aprovechamos.
-- Ejecutar en el SQL Editor de Supabase (idempotente).

ALTER TABLE courses ADD COLUMN IF NOT EXISTS brochure_url text;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS allow_attendance_choice boolean NOT NULL DEFAULT false;

-- Bucket público para los brochures
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-brochures', 'course-brochures', true)
ON CONFLICT (id) DO NOTHING;
