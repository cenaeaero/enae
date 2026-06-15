-- =============================================================================
-- Políticas RLS de `registrations` (versionadas)
-- =============================================================================
-- INCIDENTE: la tabla `registrations` quedó con RLS ACTIVO pero SIN políticas.
-- En Postgres eso significa "denegar todo" al rol `authenticated` → TODOS los
-- alumnos dejaron de ver sus cursos en el portal (el SQL Editor usa service_role
-- y salta RLS, por eso la data se veía intacta). Este archivo recrea las
-- políticas y las deja en control de versiones para que no se vuelvan a perder.
--
-- Mejora vs. el esquema original: la política de "ver lo propio" usa
-- lower(email) IN (...) en vez de email = (SELECT ... ) — así:
--   1) no revienta si un usuario tiene perfil duplicado (subconsulta escalar
--      que devolvía >1 fila), y
--   2) tolera diferencias de mayúsculas/minúsculas en el correo.
-- =============================================================================

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede crear una inscripción (registro público)
DROP POLICY IF EXISTS "Users can create registrations" ON public.registrations;
CREATE POLICY "Users can create registrations"
  ON public.registrations
  FOR INSERT
  WITH CHECK (true);

-- El alumno ve sus propias inscripciones; el admin ve todas
DROP POLICY IF EXISTS "Users can view own registrations" ON public.registrations;
CREATE POLICY "Users can view own registrations"
  ON public.registrations
  FOR SELECT
  USING (
    lower(email) IN (SELECT lower(email) FROM public.profiles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- El admin gestiona todo (insert/update/delete)
DROP POLICY IF EXISTS "Admins can manage registrations" ON public.registrations;
CREATE POLICY "Admins can manage registrations"
  ON public.registrations
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );
