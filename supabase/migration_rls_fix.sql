-- Fix Supabase Security Advisor alerts:
--   - rls_disabled_in_public        (table accesible vía API sin RLS)
--   - sensitive_columns_exposed     (columnas con datos personales sin restricción)
--
-- Tablas afectadas: programs, course_instructors.
-- Ambas se crearon manualmente desde el dashboard, por lo que nacieron sin RLS.

-- ============================================================
-- programs : listado público (solo lectura), escritura solo admin
-- ============================================================
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active programs" ON public.programs;
CREATE POLICY "Public can read active programs"
  ON public.programs
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage programs" ON public.programs;
CREATE POLICY "Admins can manage programs"
  ON public.programs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.email = auth.jwt() ->> 'email'
        AND p.role  = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.email = auth.jwt() ->> 'email'
        AND p.role  = 'admin'
    )
  );

-- ============================================================
-- course_instructors : solo backend (service_role) y admins/instructor propio
-- ============================================================
ALTER TABLE public.course_instructors ENABLE ROW LEVEL SECURITY;

-- El service_role del backend ignora RLS, así que las rutas /api existentes
-- siguen funcionando. Estas políticas son defensa en profundidad para clientes
-- autenticados (anon / user) que pudieran consultar la tabla directamente.

DROP POLICY IF EXISTS "Admins manage course_instructors" ON public.course_instructors;
CREATE POLICY "Admins manage course_instructors"
  ON public.course_instructors
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.email = auth.jwt() ->> 'email'
        AND p.role  = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.email = auth.jwt() ->> 'email'
        AND p.role  = 'admin'
    )
  );

DROP POLICY IF EXISTS "Instructors see own assignments" ON public.course_instructors;
CREATE POLICY "Instructors see own assignments"
  ON public.course_instructors
  FOR SELECT
  USING (instructor_email = auth.jwt() ->> 'email');
