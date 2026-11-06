-- =====================================================================
-- Indicador por curso: "requiere trámite de credencial DGAC"
-- Fecha: 2026-11-06
-- Distinto de has_dgac_certificate (emite Certificado DGAC). Solo los cursos
-- marcados aquí entran al tablero de Trámites DGAC y a Prioridades DGAC.
-- Hoy: únicamente Operador RPAS Nivel 1. Editable en Cursos › Documentación DGAC.
-- Idempotente. Ejecutar en Supabase › SQL Editor ANTES de publicar el código.
-- =====================================================================
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS requires_dgac_procedure boolean NOT NULL DEFAULT false;

-- Marca el curso de Operador RPAS / UAS Nivel 1
UPDATE public.courses
SET requires_dgac_procedure = true
WHERE title ILIKE '%operador%'
  AND (title ILIKE '%nivel 1%' OR title ILIKE '%nivel i %' OR title ~* '\mN1\M' OR code ~* '\mN1\M');

-- Verificación: revisar que SOLO el curso de Operador RPAS N1 quede en true
SELECT code, title, has_dgac_certificate, requires_dgac_procedure
FROM public.courses
WHERE requires_dgac_procedure OR has_dgac_certificate
ORDER BY requires_dgac_procedure DESC, title;
