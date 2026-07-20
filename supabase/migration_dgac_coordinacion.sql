-- Migration: Coordinación de examen DGAC (Teóricos)
-- Agrega a dgac_procedures los pasos que faltaban del proceso real:
--   - cedula_identidad / examen_practico: ítems nuevos del checklist
--   - unidad_coordinada / unidad_contacto: pre-coordinación con la unidad DGAC (provincia)
--   - solicitud_teoricos_at: cuándo se envió la solicitud a Teóricos Licencias (teoricosag@dgac.gob.cl)
-- Ejecutar en el SQL Editor de Supabase (idempotente).

ALTER TABLE dgac_procedures ADD COLUMN IF NOT EXISTS cedula_identidad BOOLEAN DEFAULT FALSE;
ALTER TABLE dgac_procedures ADD COLUMN IF NOT EXISTS examen_practico BOOLEAN DEFAULT FALSE;
ALTER TABLE dgac_procedures ADD COLUMN IF NOT EXISTS unidad_coordinada BOOLEAN DEFAULT FALSE;
ALTER TABLE dgac_procedures ADD COLUMN IF NOT EXISTS unidad_contacto TEXT;
ALTER TABLE dgac_procedures ADD COLUMN IF NOT EXISTS solicitud_teoricos_at TIMESTAMPTZ;
