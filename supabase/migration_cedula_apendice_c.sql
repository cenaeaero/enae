-- Cédula de identidad (ambos lados, PDF) para el trámite DGAC / Apéndice C.
-- Se guarda junto al Apéndice C en el bucket de storage "apendice-c".
ALTER TABLE dgac_procedures
  ADD COLUMN IF NOT EXISTS cedula_frente_url TEXT,
  ADD COLUMN IF NOT EXISTS cedula_reverso_url TEXT,
  ADD COLUMN IF NOT EXISTS cedula_uploaded_at TIMESTAMPTZ;
