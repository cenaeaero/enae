-- =============================================================================
-- Nombres y apellidos siempre en MAYÚSCULAS
-- - Backfill de filas existentes
-- - Trigger que fuerza UPPER en INSERT/UPDATE de profiles y registrations
-- =============================================================================

-- 1) Backfill
UPDATE profiles
SET first_name = UPPER(first_name), last_name = UPPER(last_name)
WHERE first_name IS NOT NULL OR last_name IS NOT NULL;

UPDATE registrations
SET first_name = UPPER(first_name), last_name = UPPER(last_name)
WHERE first_name IS NOT NULL OR last_name IS NOT NULL;

-- 2) Función genérica que pasa first_name/last_name a mayúsculas
CREATE OR REPLACE FUNCTION uppercase_names() RETURNS trigger AS $$
BEGIN
  IF NEW.first_name IS NOT NULL THEN NEW.first_name := UPPER(NEW.first_name); END IF;
  IF NEW.last_name  IS NOT NULL THEN NEW.last_name  := UPPER(NEW.last_name);  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3) Triggers
DROP TRIGGER IF EXISTS trg_profiles_uppercase_names ON profiles;
CREATE TRIGGER trg_profiles_uppercase_names
  BEFORE INSERT OR UPDATE OF first_name, last_name ON profiles
  FOR EACH ROW EXECUTE FUNCTION uppercase_names();

DROP TRIGGER IF EXISTS trg_registrations_uppercase_names ON registrations;
CREATE TRIGGER trg_registrations_uppercase_names
  BEFORE INSERT OR UPDATE OF first_name, last_name ON registrations
  FOR EACH ROW EXECUTE FUNCTION uppercase_names();
