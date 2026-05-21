-- =============================================================================
-- Folio por inscripción (certificado de curso)
-- - Cada registration recibe su folio_enae al emitir certificado/diploma
-- - Continúa la misma secuencia folio_enae_seq que se usa en profiles
-- - Trigger: auto-asigna cuando status pasa a "completed" o cuando se emite diploma
-- =============================================================================

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS folio_enae text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_registrations_folio_enae
  ON registrations (folio_enae)
  WHERE folio_enae IS NOT NULL AND folio_enae <> '';

-- Auto-asigna folio_enae a una registration cuando:
--   - se marca status='completed' o
--   - se crea/actualiza la diploma asociada
CREATE OR REPLACE FUNCTION registrations_assign_folio() RETURNS trigger AS $$
BEGIN
  IF (NEW.folio_enae IS NULL OR NEW.folio_enae = '')
     AND NEW.status IN ('completed') THEN
    NEW.folio_enae := nextval('folio_enae_seq')::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_registrations_assign_folio ON registrations;
CREATE TRIGGER trg_registrations_assign_folio
  BEFORE INSERT OR UPDATE OF status ON registrations
  FOR EACH ROW EXECUTE FUNCTION registrations_assign_folio();

-- Cuando se crea una diploma, también asigna folio si la registration no tiene
CREATE OR REPLACE FUNCTION diploma_assign_registration_folio() RETURNS trigger AS $$
BEGIN
  UPDATE registrations r
  SET folio_enae = nextval('folio_enae_seq')::text
  WHERE r.id = NEW.registration_id
    AND (r.folio_enae IS NULL OR r.folio_enae = '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_diploma_assign_folio ON diplomas;
CREATE TRIGGER trg_diploma_assign_folio
  AFTER INSERT ON diplomas
  FOR EACH ROW EXECUTE FUNCTION diploma_assign_registration_folio();

-- Backfill: asignar folio a registrations completadas que no tienen
WITH to_assign AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY coalesce(completed_at, created_at), id) AS rn
  FROM registrations
  WHERE status = 'completed'
    AND (folio_enae IS NULL OR folio_enae = '')
)
UPDATE registrations r
SET folio_enae = nextval('folio_enae_seq')::text
FROM to_assign t
WHERE r.id = t.id;
