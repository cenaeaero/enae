-- Configuración del Certificado DGAC por curso: fechas/ciudad/horas reales del
-- curso presencial y textos editables (para cursos técnicos como Termografía,
-- cuyo texto no es el de credencial DAN 151).
ALTER TABLE courses ADD COLUMN IF NOT EXISTS cert_city TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS cert_start_date DATE;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS cert_end_date DATE;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS cert_hours INTEGER;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS cert_compendio TEXT;  -- COMPENDIO (null = texto DAN 151 por defecto)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS cert_mac_text TEXT;   -- párrafo de cierre MAC (null = por defecto)
