-- Migration: porcentaje mínimo de asistencia por curso (ej. 90%).
-- Se usa en el reporte de asistencia y para marcar quién no cumple el mínimo.
-- Ejecutar en el SQL Editor de Supabase (idempotente).

ALTER TABLE courses ADD COLUMN IF NOT EXISTS min_attendance_pct integer DEFAULT 90;
