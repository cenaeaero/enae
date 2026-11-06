-- =====================================================================
-- REVERSIÓN de la Fase 3 — vuelve al estado previo (políticas abiertas)
-- Usar SOLO si alguna pantalla dejó de funcionar tras migration_seguridad_fase3_rls.sql.
-- Restaura "FOR ALL USING (true)" para public en las 12 tablas (estado del 06-11-2026),
-- más la lectura pública de course_modules y programas activos.
-- =====================================================================
BEGIN;
DO $$
DECLARE pol record; t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['activity_progress','course_access_log','course_messages','course_modules',
    'dgac_procedure_history','dgac_procedures','discussion_threads','exam_attempts','exams',
    'module_activities','module_progress','programs']
  LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (true) WITH CHECK (true)', 'Full access ' || t, t);
  END LOOP;
END $$;
COMMIT;
