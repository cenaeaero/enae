-- Add per-course DGAC habilitations text used in the certificate
-- (the line "Habilitación de tipo X, Y, Z." on page 1).
-- If null/empty, the cert generator falls back to a default list.
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS dgac_habilitaciones TEXT;
