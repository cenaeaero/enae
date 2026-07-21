-- Migration: Datos de la clase práctica para el alumno + firma electrónica
--   - instructor_assignments: hora de inicio, lugar y link de Google Maps
--   - practical_evaluations: firma del alumno (nombre + fecha/hora)
-- Ejecutar en el SQL Editor de Supabase (idempotente).

ALTER TABLE instructor_assignments ADD COLUMN IF NOT EXISTS start_time text;      -- ej: "15:00"
ALTER TABLE instructor_assignments ADD COLUMN IF NOT EXISTS location_name text;   -- ej: "Aeródromo Eulogio Sánchez, Tobalaba"
ALTER TABLE instructor_assignments ADD COLUMN IF NOT EXISTS location_url text;    -- link de Google Maps

ALTER TABLE practical_evaluations ADD COLUMN IF NOT EXISTS student_signature_name text;
ALTER TABLE practical_evaluations ADD COLUMN IF NOT EXISTS student_signed_at timestamptz;
