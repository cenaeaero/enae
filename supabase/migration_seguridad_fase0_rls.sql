-- =====================================================================
-- Seguridad Fase 0 — Cierre inmediato de políticas RLS abiertas
-- Fecha: 2026-11-06 · Auditoría del Panel Administrativo enae.cl
--
-- Contexto: estas tablas tenían una política "FOR ALL USING (true)" para el
-- rol public (incluye anon = cualquier visitante con la clave pública del
-- sitio). Verificado en pg_policies el 06-11-2026.
--
-- Estas 10 tablas SOLO se usan desde el servidor con supabaseAdmin
-- (service_role), que ignora RLS. Por eso cerrarlas NO afecta ninguna
-- pantalla. zoom_config no se usa en el código.
--
-- Efecto: RLS queda activo y sin políticas para anon/authenticated
-- (= acceso denegado). service_role sigue con acceso total.
-- Idempotente. Ejecutar en Supabase › SQL Editor.
-- =====================================================================

BEGIN;

ALTER TABLE public.zoom_config                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_meetings                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_answers                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads                            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_recipients                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practical_evaluations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_assignment_documents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_instructors               ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Full access zoom_config"       ON public.zoom_config;
DROP POLICY IF EXISTS "Full access zoom_meetings"     ON public.zoom_meetings;
DROP POLICY IF EXISTS "Full access exam_questions"    ON public.exam_questions;
DROP POLICY IF EXISTS "Full access exam_answers"      ON public.exam_answers;
DROP POLICY IF EXISTS "srv_leads"                     ON public.leads;
DROP POLICY IF EXISTS "srv_camp"                      ON public.email_campaigns;
DROP POLICY IF EXISTS "srv_recip"                     ON public.email_recipients;
DROP POLICY IF EXISTS "Service role access"           ON public.practical_evaluations;
DROP POLICY IF EXISTS "Service role access"           ON public.instructor_assignment_documents;
DROP POLICY IF EXISTS "course_instructors_all"        ON public.course_instructors;

-- Política explícita solo para service_role (documental; service_role ya ignora RLS)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['zoom_config','zoom_meetings','exam_questions','exam_answers','leads',
    'email_campaigns','email_recipients','practical_evaluations','instructor_assignment_documents','course_instructors']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_service_only', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', t || '_service_only', t);
  END LOOP;
END $$;

COMMIT;

-- Verificación: debe mostrar solo políticas con roles = {service_role}
select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('zoom_config','zoom_meetings','exam_questions','exam_answers','leads',
    'email_campaigns','email_recipients','practical_evaluations','instructor_assignment_documents','course_instructors')
order by tablename;
