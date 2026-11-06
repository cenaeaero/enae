-- =====================================================================
-- Fase 3 — Optimización de rendimiento de las políticas RLS (Disk IO)
-- Fecha: 2026-11-06
-- Mismas reglas de acceso que migration_seguridad_fase3_rls.sql, pero:
--   · Las verificaciones se evalúan UNA vez por consulta (patrón "(SELECT fn())",
--     que Postgres resuelve como InitPlan) en vez de una vez por fila.
--   · Índices funcionales por lower(email) en registrations y profiles.
-- Idempotente. Ejecutar en Supabase › SQL Editor.
-- =====================================================================

BEGIN;

-- Índices para las búsquedas por email (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_registrations_lower_email ON public.registrations (lower(email));
CREATE INDEX IF NOT EXISTS idx_profiles_lower_email      ON public.profiles (lower(email));
CREATE INDEX IF NOT EXISTS idx_course_modules_course     ON public.course_modules (course_id);
CREATE INDEX IF NOT EXISTS idx_module_activities_module  ON public.module_activities (module_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_reg       ON public.module_progress (registration_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_reg         ON public.exam_attempts (registration_id);
CREATE INDEX IF NOT EXISTS idx_course_messages_reg       ON public.course_messages (registration_id);
CREATE INDEX IF NOT EXISTS idx_dgac_procedures_reg       ON public.dgac_procedures (registration_id);

-- Conjuntos del usuario actual (se calculan una sola vez por consulta)
CREATE OR REPLACE FUNCTION public.enae_my_registration_ids() RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(array_agg(r.id), '{}') FROM public.registrations r
  WHERE lower(r.email) = public.enae_jwt_email()
$$;

CREATE OR REPLACE FUNCTION public.enae_my_course_ids() RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(array_agg(DISTINCT r.course_id), '{}') FROM public.registrations r
  WHERE lower(r.email) = public.enae_jwt_email() AND r.course_id IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.enae_my_module_ids() RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(array_agg(m.id), '{}') FROM public.course_modules m
  WHERE m.course_id = ANY (public.enae_my_course_ids())
$$;

CREATE OR REPLACE FUNCTION public.enae_my_activity_ids() RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(array_agg(a.id), '{}') FROM public.module_activities a
  WHERE a.module_id = ANY (public.enae_my_module_ids())
$$;

-- Recrear políticas con evaluación única
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['activity_progress','course_access_log','course_messages','course_modules',
    'dgac_procedure_history','dgac_procedures','discussion_threads','exam_attempts','exams',
    'module_activities','module_progress','programs']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_all', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING ((SELECT public.enae_is_admin())) WITH CHECK ((SELECT public.enae_is_admin()))', t || '_admin_all', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS activity_progress_own_read ON public.activity_progress;
CREATE POLICY activity_progress_own_read ON public.activity_progress
  FOR SELECT TO authenticated USING (registration_id = ANY ((SELECT public.enae_my_registration_ids())));

DROP POLICY IF EXISTS module_progress_own_read ON public.module_progress;
CREATE POLICY module_progress_own_read ON public.module_progress
  FOR SELECT TO authenticated USING (registration_id = ANY ((SELECT public.enae_my_registration_ids())));

DROP POLICY IF EXISTS exam_attempts_own_read ON public.exam_attempts;
CREATE POLICY exam_attempts_own_read ON public.exam_attempts
  FOR SELECT TO authenticated USING (registration_id = ANY ((SELECT public.enae_my_registration_ids())));

DROP POLICY IF EXISTS course_messages_own_read ON public.course_messages;
CREATE POLICY course_messages_own_read ON public.course_messages
  FOR SELECT TO authenticated USING (registration_id = ANY ((SELECT public.enae_my_registration_ids())));

DROP POLICY IF EXISTS dgac_procedures_own_read ON public.dgac_procedures;
CREATE POLICY dgac_procedures_own_read ON public.dgac_procedures
  FOR SELECT TO authenticated USING (registration_id = ANY ((SELECT public.enae_my_registration_ids())));

DROP POLICY IF EXISTS course_access_log_own_read ON public.course_access_log;
CREATE POLICY course_access_log_own_read ON public.course_access_log
  FOR SELECT TO authenticated USING (registration_id = ANY ((SELECT public.enae_my_registration_ids())));

DROP POLICY IF EXISTS course_access_log_own_insert ON public.course_access_log;
CREATE POLICY course_access_log_own_insert ON public.course_access_log
  FOR INSERT TO authenticated WITH CHECK (registration_id = ANY ((SELECT public.enae_my_registration_ids())));

DROP POLICY IF EXISTS course_modules_enrolled_read ON public.course_modules;
CREATE POLICY course_modules_enrolled_read ON public.course_modules
  FOR SELECT TO authenticated USING (course_id = ANY ((SELECT public.enae_my_course_ids())));

DROP POLICY IF EXISTS module_activities_enrolled_read ON public.module_activities;
CREATE POLICY module_activities_enrolled_read ON public.module_activities
  FOR SELECT TO authenticated USING (module_id = ANY ((SELECT public.enae_my_module_ids())));

DROP POLICY IF EXISTS exams_enrolled_read ON public.exams;
CREATE POLICY exams_enrolled_read ON public.exams
  FOR SELECT TO authenticated USING (activity_id = ANY ((SELECT public.enae_my_activity_ids())));

COMMIT;

-- Verificación: deben seguir siendo 35 políticas, ahora con "(SELECT ...)" en qual
SELECT tablename, policyname, roles, cmd, left(qual, 80) AS qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('activity_progress','course_access_log','course_messages','course_modules',
    'dgac_procedure_history','dgac_procedures','discussion_threads','exam_attempts','exams',
    'module_activities','module_progress','programs')
ORDER BY tablename, policyname;
