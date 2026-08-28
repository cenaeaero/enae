-- Solicitud de actualización de credencial RPAS a Ayuda SIPA (DGAC).
-- Distinto de la coordinación de examen con Teóricos (solicitud_teoricos_at).
ALTER TABLE dgac_procedures
  ADD COLUMN IF NOT EXISTS solicitud_credencial_at TIMESTAMPTZ;
