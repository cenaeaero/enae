-- Migration: marca de aviso enviado al alumno sobre su clase práctica
-- Permite mostrar "✓ Avisado" en los dashboards de admin e instructor.
-- Ejecutar en el SQL Editor de Supabase (idempotente).

ALTER TABLE instructor_assignments ADD COLUMN IF NOT EXISTS notified_at timestamptz;
