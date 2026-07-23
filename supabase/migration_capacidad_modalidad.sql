-- Migration: capacidad por modalidad en las sesiones (cursos híbridos)
--   - capacity_presencial: cupos presenciales (fijos, ej. 20)
--   - capacity_online:     cupos online sincrónicos (ampliables, ej. +20)
-- Se usa para bloquear inscripciones cuando la modalidad elegida está llena.
-- Ejecutar en el SQL Editor de Supabase (idempotente).

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS capacity_presencial integer DEFAULT 20;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS capacity_online integer DEFAULT 20;

-- Horario de la sesión (ej: "09:00 a 18:00 hrs"), mostrado en la ficha del curso.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS schedule text;
