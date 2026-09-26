-- Cédula de identidad (un solo PDF con ambos lados) para el trámite DGAC / Apéndice C.
-- Se guarda junto al Apéndice C en el bucket de storage "apendice-c".
ALTER TABLE dgac_procedures
  ADD COLUMN IF NOT EXISTS cedula_url TEXT,
  ADD COLUMN IF NOT EXISTS cedula_uploaded_at TIMESTAMPTZ;
