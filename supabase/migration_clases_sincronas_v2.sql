-- =============================================================================
-- v2: Cambio scheduled_at + duration por starts_at + ends_at
-- + libro de asistencia ya filtrado por alumnos seleccionados
-- =============================================================================

ALTER TABLE synchronous_classes
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at   timestamptz;

-- Migración de datos existentes
UPDATE synchronous_classes
SET starts_at = scheduled_at
WHERE starts_at IS NULL AND scheduled_at IS NOT NULL;

UPDATE synchronous_classes
SET ends_at = scheduled_at + (COALESCE(duration_minutes,60) || ' minutes')::interval
WHERE ends_at IS NULL AND scheduled_at IS NOT NULL;

-- starts_at debe quedar NOT NULL para registros nuevos
-- (no forzamos en filas legacy nulas si las hubiera)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM synchronous_classes WHERE starts_at IS NULL) THEN
    RAISE NOTICE 'Hay filas sin starts_at — déjalas null o complétalas a mano antes de NOT NULL';
  ELSE
    ALTER TABLE synchronous_classes ALTER COLUMN starts_at SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sync_classes_starts ON synchronous_classes (starts_at);
