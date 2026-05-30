-- =============================================================================
-- Sincronización profile → registrations + diplomas
-- =============================================================================
-- Problema: los nombres y datos del alumno se almacenan denormalizados en
-- registrations (snapshot al inscribirse) y diplomas (snapshot legal). Si el
-- admin corrige un dato en profiles, las demás tablas quedan desincronizadas
-- y los certificados/correos siguen mostrando el dato viejo.
--
-- Solución: trigger AFTER UPDATE en profiles que propaga los cambios a:
--   - registrations (por email viejo/nuevo o profile_id)
--   - diplomas.student_name (a través de los registrations vinculados)
--
-- Nota: los nombres se siguen normalizando a MAYÚSCULAS por el trigger
-- existente en migration_names_uppercase.sql.
-- =============================================================================

CREATE OR REPLACE FUNCTION sync_profile_to_dependent_records()
RETURNS TRIGGER AS $$
DECLARE
  v_changed_relevant boolean;
BEGIN
  -- ¿Cambió algún campo relevante para sincronizar?
  v_changed_relevant :=
       NEW.first_name        IS DISTINCT FROM OLD.first_name
    OR NEW.last_name         IS DISTINCT FROM OLD.last_name
    OR NEW.email             IS DISTINCT FROM OLD.email
    OR NEW.phone             IS DISTINCT FROM OLD.phone
    OR NEW.organization      IS DISTINCT FROM OLD.organization
    OR NEW.organization_type IS DISTINCT FROM OLD.organization_type
    OR NEW.job_title         IS DISTINCT FROM OLD.job_title
    OR NEW.address           IS DISTINCT FROM OLD.address
    OR NEW.city              IS DISTINCT FROM OLD.city
    OR NEW.state             IS DISTINCT FROM OLD.state
    OR NEW.postal_code       IS DISTINCT FROM OLD.postal_code
    OR NEW.country           IS DISTINCT FROM OLD.country
    OR NEW.supervisor_name   IS DISTINCT FROM OLD.supervisor_name
    OR NEW.supervisor_email  IS DISTINCT FROM OLD.supervisor_email;

  IF NOT v_changed_relevant THEN
    RETURN NEW;
  END IF;

  -- 1) Sincroniza registrations
  --    Matchea por profile_id si existe, o por email viejo (antes del cambio).
  UPDATE registrations
  SET
    first_name        = NEW.first_name,
    last_name         = NEW.last_name,
    email             = NEW.email,
    phone             = NEW.phone,
    organization      = NEW.organization,
    organization_type = NEW.organization_type,
    job_title         = NEW.job_title,
    address           = NEW.address,
    city              = NEW.city,
    state             = NEW.state,
    postal_code       = NEW.postal_code,
    country           = NEW.country,
    supervisor_name   = NEW.supervisor_name,
    supervisor_email  = NEW.supervisor_email
  WHERE
        profile_id = NEW.id
     OR email      = OLD.email
     OR email      = NEW.email;

  -- 2) Sincroniza diplomas (student_name) para todos los registros del alumno.
  --    Solo si cambió el nombre — los diplomas son documentos legales y no se
  --    tocan por cambios de contacto/dirección.
  IF NEW.first_name IS DISTINCT FROM OLD.first_name
     OR NEW.last_name IS DISTINCT FROM OLD.last_name
  THEN
    UPDATE diplomas d
    SET student_name = NEW.last_name || ', ' || NEW.first_name
    FROM registrations r
    WHERE d.registration_id = r.id
      AND (r.profile_id = NEW.id OR r.email = NEW.email);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_profile_to_dependent_records ON profiles;
CREATE TRIGGER trg_sync_profile_to_dependent_records
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_to_dependent_records();

-- =============================================================================
-- Backfill puntual: igualar registrations a profiles para alumnos donde
-- el nombre actual de profiles no coincide con el de su registration.
-- Útil para limpiar datos históricos. Ejecutar UNA sola vez si lo deseas.
-- Descomenta si quieres correrlo ahora.
-- =============================================================================
-- UPDATE registrations r
-- SET
--   first_name = p.first_name,
--   last_name  = p.last_name,
--   phone      = COALESCE(p.phone, r.phone),
--   organization = COALESCE(p.organization, r.organization)
-- FROM profiles p
-- WHERE (r.profile_id = p.id OR r.email = p.email)
--   AND (r.first_name IS DISTINCT FROM p.first_name OR r.last_name IS DISTINCT FROM p.last_name);
