-- =============================================================================
-- Folio ENAE: asignación automática a alumnos
-- - Backfillea los profiles sin folio empezando en 683 (orden por created_at)
-- - Crea una secuencia para futuros inserts
-- - Trigger BEFORE INSERT en profiles que asigna el folio si viene NULL
-- - Índice UNIQUE para garantizar no-duplicados
-- =============================================================================

-- 1) Secuencia (independiente del backfill — se sincroniza al final)
CREATE SEQUENCE IF NOT EXISTS folio_enae_seq;

-- 2) Backfill: ROW_NUMBER() ordenado por created_at + 682 → arranca en 683
WITH to_assign AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn
  FROM profiles
  WHERE folio_enae IS NULL OR folio_enae = ''
)
UPDATE profiles p
SET folio_enae = (t.rn + 682)::text
FROM to_assign t
WHERE p.id = t.id;

-- 3) Sincroniza la secuencia al máximo folio numérico actual
--    El próximo nextval() devolverá MAX + 1
SELECT setval(
  'folio_enae_seq',
  COALESCE(
    (SELECT MAX(folio_enae::int) FROM profiles WHERE folio_enae ~ '^[0-9]+$'),
    682
  )
);

-- 4) Trigger: auto-asigna folio en inserts nuevos
CREATE OR REPLACE FUNCTION profiles_assign_folio() RETURNS trigger AS $$
BEGIN
  IF NEW.folio_enae IS NULL OR NEW.folio_enae = '' THEN
    NEW.folio_enae := nextval('folio_enae_seq')::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_assign_folio ON profiles;
CREATE TRIGGER trg_profiles_assign_folio
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION profiles_assign_folio();

-- 5) UNIQUE para evitar duplicados
CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_folio_enae
  ON profiles (folio_enae)
  WHERE folio_enae IS NOT NULL AND folio_enae <> '';
