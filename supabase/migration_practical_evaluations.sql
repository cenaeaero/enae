-- Migration: Evaluación práctica en línea (formato ENAE-CHL-N1)
-- Digitaliza el "Formato Cumplimiento de Ejercicios Prácticos": una evaluación
-- por asignación instructor-alumno, con los ejercicios por fase en JSONB.
-- Ejecutar en el SQL Editor de Supabase (idempotente).

CREATE TABLE IF NOT EXISTS practical_evaluations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id    uuid NOT NULL UNIQUE REFERENCES instructor_assignments(id) ON DELETE CASCADE,
  instructor_email text NOT NULL,
  student_name     text,
  student_document text,          -- RUT o pasaporte
  city             text,
  eval_date        date,
  items            jsonb NOT NULL DEFAULT '{}'::jsonb,  -- por ejercicio: { done, hours, ops (despegues/aterrizajes) }
  pre_solo_result  text CHECK (pre_solo_result IN ('aprobado', 'reprobado')),
  observations     text,
  status           text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  completed_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_practical_evals_assignment ON practical_evaluations (assignment_id);
CREATE INDEX IF NOT EXISTS idx_practical_evals_instructor ON practical_evaluations (instructor_email);

ALTER TABLE practical_evaluations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role access" ON practical_evaluations;
CREATE POLICY "Service role access" ON practical_evaluations FOR ALL USING (true) WITH CHECK (true);
