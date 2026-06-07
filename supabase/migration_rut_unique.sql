-- =============================================================================
-- Prevención de duplicados de alumnos por RUT / identificador
-- =============================================================================
-- Estrategia (acordada):
--   1) La app (formularios + APIs) ya exige RUT y rechaza duplicados.
--   2) La BASE DE DATOS añade índices ÚNICOS como red de seguridad final.
--
-- La clave de unicidad es el RUT NORMALIZADO: sin puntos, guiones ni espacios
-- y en minúscula  ->  lower(regexp_replace(rut, '[.\-\s]', '', 'g'))
-- (debe coincidir con normalizeId() de src/lib/rut.ts).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- PASO 1 — SEGURO DE CORRER AHORA: agrega columna rut a registrations
-- (las inscripciones guardaban el RUT solo en el perfil; ahora también queda
--  en la inscripción como snapshot, igual que el resto de datos del alumno).
-- -----------------------------------------------------------------------------
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS rut text;

-- Backfill: copia el RUT del perfil a las inscripciones que aún no lo tengan.
UPDATE registrations r
SET rut = p.rut
FROM profiles p
WHERE r.rut IS NULL
  AND p.rut IS NOT NULL
  AND (r.profile_id = p.id OR lower(r.email) = lower(p.email));


-- -----------------------------------------------------------------------------
-- PASO 2 — PRE-CHEQUEO (solo lectura): corre esto ANTES de crear los índices.
-- Si devuelve filas, hay RUT duplicados que debes resolver en el panel
--   /admin/duplicados  antes de continuar, o los índices del Paso 3 fallarán.
-- -----------------------------------------------------------------------------

-- 2a) Perfiles con el mismo RUT normalizado:
-- SELECT lower(regexp_replace(rut,'[.\-\s]','','g')) AS rut_norm,
--        count(*), array_agg(email)
-- FROM profiles
-- WHERE rut IS NOT NULL AND rut <> ''
-- GROUP BY 1 HAVING count(*) > 1;

-- 2b) Inscripciones con el mismo RUT normalizado en el MISMO curso:
-- SELECT course_id, lower(regexp_replace(rut,'[.\-\s]','','g')) AS rut_norm,
--        count(*), array_agg(email)
-- FROM registrations
-- WHERE rut IS NOT NULL AND rut <> ''
-- GROUP BY 1,2 HAVING count(*) > 1;


-- -----------------------------------------------------------------------------
-- PASO 3 — ÍNDICES ÚNICOS: corre esto SOLO cuando el Paso 2 no devuelva filas.
-- Son parciales (ignoran NULL/'') para no romper filas históricas sin RUT.
-- -----------------------------------------------------------------------------

-- Un RUT = un perfil (evita perfiles duplicados de la misma persona).
-- CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_rut_norm
--   ON profiles ( (lower(regexp_replace(rut,'[.\-\s]','','g'))) )
--   WHERE rut IS NOT NULL AND rut <> '';

-- Un RUT no puede inscribirse dos veces en el mismo curso (caso Wilfredo).
-- CREATE UNIQUE INDEX IF NOT EXISTS uq_registrations_course_rut_norm
--   ON registrations ( course_id, (lower(regexp_replace(rut,'[.\-\s]','','g'))) )
--   WHERE rut IS NOT NULL AND rut <> '';
