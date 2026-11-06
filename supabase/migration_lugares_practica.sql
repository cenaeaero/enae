-- =====================================================================
-- Fase 1 — Catálogo de Lugares de práctica
-- Fecha: 2026-11-06 · Auditoría del Panel Administrativo enae.cl
--
-- practice_sites                : ficha de cada lugar (ubicación, espacio aéreo,
--                                 límites operacionales, logística, seguridad).
-- practice_site_authorizations  : autorizaciones del lugar con vigencia y
--                                 antelación de coordinación (DGAC, FACh, propietario, ATC).
-- instructor_assignments.practice_site_id : lugar elegido al programar la clase.
--                                 Los campos de texto existentes (city, location_name,
--                                 location_url) se mantienen y se copian desde la ficha.
--
-- Acceso: solo service_role (las pantallas usan endpoints con control de rol).
-- Idempotente. Ejecutar en Supabase › SQL Editor ANTES de publicar el código.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.practice_sites (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                    text UNIQUE,                       -- código interno, ej: SCL-ARR
  name                    text NOT NULL,                     -- nombre normalizado
  site_type               text NOT NULL DEFAULT 'zona_vuelo'
                            CHECK (site_type IN ('aerodromo','zona_vuelo','faena','sede_teorica','otro')),
  status                  text NOT NULL DEFAULT 'activo' CHECK (status IN ('activo','suspendido')),
  -- Ubicación
  address                 text,
  comuna                  text,
  city                    text,
  region                  text,
  latitude                numeric(9,6),
  longitude               numeric(9,6),
  maps_url                text,
  kml_url                 text,                              -- polígono del área operacional
  -- Espacio aéreo
  fir                     text,                              -- ej: SCEZ Santiago, SCFZ Antofagasta
  airspace_class          text,
  nearest_aerodrome       text,
  nearest_aerodrome_km    numeric(6,1),
  restricted_zones        text,                              -- ej: SC-R25
  -- Límites operacionales
  max_height_agl_m        integer,
  max_radius_m            integer,
  operation_types         text[] DEFAULT '{}',               -- VLOS / EVLOS
  max_mtom_kg             numeric(7,2),
  max_simultaneous_rpa    integer,
  -- Logística
  capacity_students       integer,
  availability            text,                              -- días y horarios disponibles
  services                text,                              -- sombra, baño, energía, estacionamiento
  contact_name            text,
  contact_phone           text,
  contact_email           text,
  -- Seguridad
  meeting_point           text,
  nearest_medical_center  text,
  emergency_phone         text,
  emergency_plan          text,
  -- Uso
  access_instructions     text,                              -- se muestran al alumno
  course_ids              uuid[] DEFAULT '{}',               -- cursos habilitados (vacío = todos)
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.practice_site_authorizations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       uuid NOT NULL REFERENCES public.practice_sites(id) ON DELETE CASCADE,
  authority     text NOT NULL,              -- DGAC, FACh, Propietario, ATC, Otro
  reference     text,                       -- N° de resolución, oficio o carta
  document_url  text,
  valid_from    date,
  valid_until   date,                       -- vacío = sin vencimiento
  lead_days     integer,                    -- antelación mínima para coordinar cada vuelo
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_psa_site ON public.practice_site_authorizations(site_id);

ALTER TABLE public.instructor_assignments
  ADD COLUMN IF NOT EXISTS practice_site_id uuid REFERENCES public.practice_sites(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_ia_practice_site ON public.instructor_assignments(practice_site_id);

ALTER TABLE public.practice_sites               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_site_authorizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS practice_sites_service_only ON public.practice_sites;
CREATE POLICY practice_sites_service_only ON public.practice_sites
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS practice_site_authorizations_service_only ON public.practice_site_authorizations;
CREATE POLICY practice_site_authorizations_service_only ON public.practice_site_authorizations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;

-- Verificación
select table_name from information_schema.tables
where table_schema = 'public' and table_name in ('practice_sites','practice_site_authorizations');
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'instructor_assignments' and column_name = 'practice_site_id';
