-- =====================================================================
-- Seguridad Fase 3 — Políticas RLS por rol en las 12 tablas restantes
-- Fecha: 2026-11-06 · Auditoría del Panel Administrativo enae.cl
--
-- Antes: "FOR ALL USING (true)" para public (cualquier visitante con la
-- clave pública podía leer y modificar).
-- Después:
--   · admin (profiles.role = 'admin')  -> acceso total (panel /admin)
--   · alumno autenticado               -> SOLO LECTURA de sus propias filas
--                                          (por registration_id), y del contenido
--                                          de los cursos en que está inscrito
--   · alumno                            -> puede INSERTAR su propio registro de acceso
--   · público (anon)                    -> solo programas activos
--   · service_role (APIs del servidor)  -> acceso total (no cambia)
--
-- Basado en la revisión de TODOS los usos desde el navegador del código de
-- enae.cl al 06-11-2026. Reversión: migration_seguridad_fase3_rollback.sql
-- Idempotente. Ejecutar en Supabase › SQL Editor.
-- =====================================================================

BEGIN;

-- ---------- Funciones auxiliares (SECURITY DEFINER: no dependen del RLS de profiles/registrations)
CREATE OR REPLACE FUNCTION public.enae_jwt_email() RETURNS text
LANGUAGE sql STABLE AS $$ SELECT lower(coalesce(auth.jwt() ->> 'email', '')) $$;

CREATE OR REPLACE FUNCTION public.enae_is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p
                 WHERE lower(p.email) = public.enae_jwt_email() AND p.role = 'admin')
$$;

CREATE OR REPLACE FUNCTION public.enae_owns_registration(reg uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.registrations r
                 WHERE r.id = reg AND lower(r.email) = public.enae_jwt_email())
$$;

CREATE OR REPLACE FUNCTION public.enae_enrolled_in_course(cid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.registrations r
                 WHERE r.course_id = cid AND lower(r.email) = public.enae_jwt_email())
$$;

CREATE OR REPLACE FUNCTION public.enae_can_read_module(mid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.course_modules m
                 JOIN public.registrations r ON r.course_id = m.course_id
                 WHERE m.id = mid AND lower(r.email) = public.enae_jwt_email())
$$;

CREATE OR REPLACE FUNCTION public.enae_can_read_activity(aid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.module_activities a
                 JOIN public.course_modules m ON m.id = a.module_id
                 JOIN public.registrations r ON r.course_id = m.course_id
                 WHERE a.id = aid AND lower(r.email) = public.enae_jwt_email())
$$;

-- ---------- Eliminar TODAS las políticas actuales de las 12 tablas y activar RLS
DO $$
DECLARE pol record; t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['activity_progress','course_access_log','course_messages','course_modules',
    'dgac_procedure_history','dgac_procedures','discussion_threads','exam_attempts','exams',
    'module_activities','module_progress','programs']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;
    -- Backend (service_role) y administradores: acceso total
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', t || '_service_only', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.enae_is_admin()) WITH CHECK (public.enae_is_admin())', t || '_admin_all', t);
  END LOOP;
END $$;

-- ---------- Alumno: lectura de SUS filas (por inscripción)
CREATE POLICY activity_progress_own_read ON public.activity_progress
  FOR SELECT TO authenticated USING (public.enae_owns_registration(registration_id));
CREATE POLICY module_progress_own_read ON public.module_progress
  FOR SELECT TO authenticated USING (public.enae_owns_registration(registration_id));
CREATE POLICY exam_attempts_own_read ON public.exam_attempts
  FOR SELECT TO authenticated USING (public.enae_owns_registration(registration_id));
CREATE POLICY course_messages_own_read ON public.course_messages
  FOR SELECT TO authenticated USING (public.enae_owns_registration(registration_id));
CREATE POLICY dgac_procedures_own_read ON public.dgac_procedures
  FOR SELECT TO authenticated USING (public.enae_owns_registration(registration_id));
CREATE POLICY course_access_log_own_read ON public.course_access_log
  FOR SELECT TO authenticated USING (public.enae_owns_registration(registration_id));
CREATE POLICY course_access_log_own_insert ON public.course_access_log
  FOR INSERT TO authenticated WITH CHECK (public.enae_owns_registration(registration_id));

-- ---------- Alumno: contenido de los cursos en que está inscrito (solo lectura)
CREATE POLICY course_modules_enrolled_read ON public.course_modules
  FOR SELECT TO authenticated USING (public.enae_enrolled_in_course(course_id));
CREATE POLICY module_activities_enrolled_read ON public.module_activities
  FOR SELECT TO authenticated USING (public.enae_can_read_module(module_id));
CREATE POLICY exams_enrolled_read ON public.exams
  FOR SELECT TO authenticated USING (public.enae_can_read_activity(activity_id));

-- ---------- Público: solo programas activos (sitio web)
CREATE POLICY programs_public_read ON public.programs
  FOR SELECT TO anon, authenticated USING (is_active = true);

-- dgac_procedure_history y discussion_threads: solo admin y backend (ya creadas arriba)

COMMIT;

-- ---------- Verificación: ninguna política debe quedar con roles {public} y qual = true
select tablename, policyname, roles, cmd, qual
from pg_policies
where schemaname = 'public'
  and tablename in ('activity_progress','course_access_log','course_messages','course_modules',
    'dgac_procedure_history','dgac_procedures','discussion_threads','exam_attempts','exams',
    'module_activities','module_progress','programs')
order by tablename, policyname;
