-- ============================================
-- ENAE Training Catalogue - Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- COURSES TABLE
-- ============================================
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  area TEXT NOT NULL,
  area_slug TEXT NOT NULL,
  subarea TEXT,
  level TEXT NOT NULL DEFAULT 'Básico',
  duration TEXT NOT NULL,
  modality TEXT NOT NULL DEFAULT 'Presencial' CHECK (modality IN ('Presencial', 'Híbrido', 'Online')),
  language TEXT NOT NULL DEFAULT 'Español',
  goal TEXT,
  objectives TEXT[],
  modules TEXT[],
  target_audience TEXT[],
  prerequisites TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- SESSIONS TABLE (course dates/locations)
-- ============================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  dates TEXT NOT NULL,
  location TEXT NOT NULL,
  modality TEXT NOT NULL DEFAULT 'Presencial',
  fee TEXT,
  seats INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- PROFILES TABLE (students, instructors, admins)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  job_title TEXT,
  organization TEXT,
  organization_type TEXT,
  supervisor_name TEXT,
  supervisor_email TEXT,
  supervisor_phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Chile',
  phone TEXT,
  secondary_phone TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- REGISTRATIONS TABLE
-- ============================================
CREATE TABLE registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  age_group TEXT,
  job_title TEXT,
  organization TEXT,
  organization_type TEXT,
  supervisor_name TEXT,
  supervisor_email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  phone TEXT,
  billing_same_address BOOLEAN DEFAULT true,
  billing_name TEXT,
  billing_address TEXT,
  billing_city TEXT,
  billing_country TEXT,
  how_found TEXT,
  comments TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'rejected', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- PAYMENTS TABLE
-- ============================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES registrations(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'CLP',
  tbk_token TEXT,
  tbk_response JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_courses_area_slug ON courses(area_slug);
CREATE INDEX idx_courses_is_active ON courses(is_active);
CREATE INDEX idx_sessions_course_id ON sessions(course_id);
CREATE INDEX idx_registrations_course_id ON registrations(course_id);
CREATE INDEX idx_registrations_email ON registrations(email);
CREATE INDEX idx_registrations_status ON registrations(status);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_role ON profiles(role);

-- ============================================
-- AUTO-UPDATE updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Courses: public read, admin write
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Courses are viewable by everyone"
  ON courses FOR SELECT USING (true);

CREATE POLICY "Admins can manage courses"
  ON courses FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Sessions: public read, admin write
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sessions are viewable by everyone"
  ON sessions FOR SELECT USING (true);

CREATE POLICY "Admins can manage sessions"
  ON sessions FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Registrations: users see their own, admins see all
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create registrations"
  ON registrations FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own registrations"
  ON registrations FOR SELECT USING (
    email = (SELECT email FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage registrations"
  ON registrations FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Profiles: users see own, admins see all
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can manage profiles"
  ON profiles FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Allow public inserts for profiles (registration creates profile)
CREATE POLICY "Anyone can create a profile"
  ON profiles FOR INSERT WITH CHECK (true);

-- ============================================
-- SEED DATA (initial courses from static data)
-- ============================================
INSERT INTO courses (code, title, description, area, area_slug, subarea, level, duration, modality, language, goal, objectives, modules, target_audience, prerequisites) VALUES
('ENAE/UAS/001', 'Operador UAS Nivel 1 - Básico', 'Certificación como operador de sistemas de aeronaves no tripuladas. Fundamentos de vuelo, regulación DGAC y operación segura de RPAS.', 'UAS/RPAS', 'uas-rpas', 'Operaciones RPAS', 'Básico', '40 horas', 'Presencial', 'Español',
 'Preparar al participante para obtener la certificación como operador de sistemas de aeronaves no tripuladas (UAS) según la normativa vigente de la DGAC Chile.',
 ARRAY['Comprender los principios fundamentales de la aeronáutica aplicados a sistemas no tripulados', 'Conocer y aplicar la regulación DGAC vigente para operaciones UAS en Chile', 'Interpretar información meteorológica relevante para operaciones RPAS', 'Ejecutar maniobras básicas de vuelo de forma segura y controlada'],
 ARRAY['Fundamentos de aeronáutica', 'Regulación DGAC para UAS (DAN 151)', 'Meteorología operacional', 'Principios de navegación aérea', 'Operación y maniobras básicas', 'Gestión de baterías y mantenimiento', 'Procedimientos de emergencia', 'Evaluación práctica de vuelo'],
 ARRAY['Personas interesadas en obtener certificación como operador RPAS', 'Profesionales que requieran incorporar tecnología de drones en su actividad laboral'],
 ARRAY['Mayor de 18 años', 'Educación media completa', 'Certificado médico clase 2 o superior vigente']),

('ENAE/UAS/002', 'Operador UAS Nivel 2 - Industrial', 'Operaciones industriales con drones: fotogrametría, inspección de infraestructura, agricultura de precisión y mapeo aéreo.', 'UAS/RPAS', 'uas-rpas', 'Operaciones RPAS', 'Intermedio', '60 horas', 'Presencial', 'Español', NULL, NULL, NULL, NULL, NULL),

('ENAE/UAS/003', 'Operador UAS Nivel 3 - Profesional', 'Certificación avanzada: operaciones BVLOS, vuelo nocturno, gestión de flota y planificación de misiones complejas.', 'UAS/RPAS', 'uas-rpas', 'Operaciones RPAS', 'Avanzado', '80 horas', 'Presencial', 'Español', NULL, NULL, NULL, NULL, NULL),

('ENAE/UAS/004', 'Operaciones Nocturnas UAS', 'Habilitación para operaciones con drones en horario nocturno. Protocolos de seguridad, iluminación y coordinación con ATC.', 'UAS/RPAS', 'uas-rpas', 'Operaciones Especiales', 'Especialización', '24 horas', 'Híbrido', 'Español', NULL, NULL, NULL, NULL, NULL),

('ENAE/UAS/005', 'Operaciones BVLOS', 'Operaciones más allá de la línea visual. Planificación, gestión de riesgos, sistemas de detección y evasión (DAA).', 'UAS/RPAS', 'uas-rpas', 'Operaciones Especiales', 'Especialización', '32 horas', 'Híbrido', 'Español', NULL, NULL, NULL, NULL, NULL),

('ENAE/UAS/006', 'Instructor / Examinador RPAS', 'Formación de instructores y examinadores de sistemas RPAS. Metodología de enseñanza, evaluación de competencias y estándares DGAC.', 'UAS/RPAS', 'uas-rpas', 'Formación de Formadores', 'Avanzado', '48 horas', 'Presencial', 'Español', NULL, NULL, NULL, NULL, NULL),

('ENAE/UAS/007', 'Sistemas eVTOL', 'Introducción a aeronaves de despegue y aterrizaje vertical eléctrico. Tecnología, regulación y futuro de la movilidad aérea urbana.', 'UAS/RPAS', 'uas-rpas', 'Tecnologías Emergentes', 'Especialización', '20 horas', 'Online', 'Español', NULL, NULL, NULL, NULL, NULL),

('ENAE/UAS/008', 'Gestión de Mantenimiento UAS', 'Planificación y ejecución de mantenimiento preventivo y correctivo de sistemas RPAS. Documentación técnica y aeronavegabilidad.', 'UAS/RPAS', 'uas-rpas', 'Mantenimiento', 'Intermedio', '30 horas', 'Híbrido', 'Español', NULL, NULL, NULL, NULL, NULL),

('ENAE/ATM/001', 'Radiotelefonía Aeronáutica', 'Comunicaciones aeronáuticas en banda VHF. Fraseología estándar OACI, procedimientos de comunicación y coordinación con ATC.', 'ATM & Navegación', 'atm-navegacion', 'Comunicaciones', 'Básico', '24 horas', 'Presencial', 'Español', NULL, NULL, NULL, NULL, NULL),

('ENAE/ATM/002', 'Planificación de Vuelo', 'Planificación operacional de vuelos: meteorología, NOTAMs, espacio aéreo, performance y documentación de vuelo.', 'ATM & Navegación', 'atm-navegacion', 'Navegación', 'Intermedio', '36 horas', 'Híbrido', 'Español', NULL, NULL, NULL, NULL, NULL),

('ENAE/SEC/001', 'Seguridad de la Aviación (AVSEC)', 'Fundamentos de seguridad aeroportuaria según Anexo 17 OACI. Control de acceso, inspección de pasajeros y gestión de amenazas.', 'Seguridad/AVSEC', 'seguridad-avsec', 'Seguridad Aeroportuaria', 'Básico', '40 horas', 'Presencial', 'Español', NULL, NULL, NULL, NULL, NULL),

('ENAE/SEC/002', 'Mercancías Peligrosas por Vía Aérea', 'Regulación OACI/IATA para transporte de mercancías peligrosas. Clasificación, embalaje, etiquetado y documentación DGR.', 'Seguridad/AVSEC', 'seguridad-avsec', 'Mercancías Peligrosas', 'Especialización', '32 horas', 'Híbrido', 'Español', NULL, NULL, NULL, NULL, NULL),

('ENAE/SMS/001', 'Sistema de Gestión de Seguridad Operacional (SMS)', 'Implementación de SMS según Doc 9859 OACI. Identificación de peligros, gestión de riesgos, aseguramiento y promoción de la seguridad.', 'Safety & Factores Humanos', 'safety-ffhh', 'SMS', 'Intermedio', '40 horas', 'Híbrido', 'Español', NULL, NULL, NULL, NULL, NULL),

('ENAE/SMS/002', 'Factores Humanos en Aviación', 'Estudio del factor humano en operaciones aeronáuticas. CRM, fatiga, toma de decisiones, error humano y cultura de seguridad.', 'Safety & Factores Humanos', 'safety-ffhh', 'Factores Humanos', 'Básico', '24 horas', 'Online', 'Español', NULL, NULL, NULL, NULL, NULL),

('ENAE/SMS/003', 'Investigación de Accidentes Aéreos', 'Metodología de investigación de accidentes e incidentes según Anexo 13 OACI. Recolección de evidencia, análisis y recomendaciones.', 'Safety & Factores Humanos', 'safety-ffhh', 'Investigación', 'Avanzado', '48 horas', 'Presencial', 'Español', NULL, NULL, NULL, NULL, NULL),

('ENAE/GES/001', 'Auditor de Calidad Aeronáutica', 'Formación de auditores internos de calidad para organizaciones aeronáuticas. Normas ISO 9001 aplicadas a la aviación.', 'Gestión Aeronáutica', 'gestion-aeronautica', 'Calidad', 'Especialización', '36 horas', 'Híbrido', 'Español', NULL, NULL, NULL, NULL, NULL),

('ENAE/GES/002', 'Gestión de Proyectos Aeronáuticos', 'Planificación, ejecución y control de proyectos en el sector aeronáutico. Metodologías ágiles y PMI aplicadas a la aviación.', 'Gestión Aeronáutica', 'gestion-aeronautica', 'Proyectos', 'Intermedio', '30 horas', 'Online', 'Español', NULL, NULL, NULL, NULL, NULL),

('ENAE/UAS/009', 'Operaciones de Entrega Médica con UAS', 'Uso de drones para entrega de suministros médicos. Protocolos de emergencia, cadena de frío y coordinación sanitaria.', 'UAS/RPAS', 'uas-rpas', 'Operaciones Especiales', 'Especialización', '28 horas', 'Presencial', 'Español', NULL, NULL, NULL, NULL, NULL),

('ENAE/SIM/001', 'Simulador de Control de Tránsito Aéreo', 'Prácticas en simulador de torre de control y aproximación. Gestión de tráfico, separación de aeronaves y procedimientos de emergencia.', 'Simuladores', 'simuladores', 'ATC', 'Intermedio', '60 horas', 'Presencial', 'Español', NULL, NULL, NULL, NULL, NULL),

('ENAE/SIM/002', 'Simulador de Operaciones RPAS', 'Entrenamiento en simulador de vuelo RPAS. Escenarios de emergencia, operaciones multi-drone y misiones complejas.', 'Simuladores', 'simuladores', 'RPAS', 'Básico', '20 horas', 'Presencial', 'Español', NULL, NULL, NULL, NULL, NULL);

-- Insert sessions for courses
INSERT INTO sessions (course_id, dates, location, modality, fee)
SELECT id, '14 Abr - 25 Abr 2026', 'Santiago, Chile', 'Presencial', 'CLP $850.000' FROM courses WHERE code = 'ENAE/UAS/001'
UNION ALL
SELECT id, '16 Jun - 27 Jun 2026', 'Santiago, Chile', 'Presencial', 'CLP $850.000' FROM courses WHERE code = 'ENAE/UAS/001'
UNION ALL
SELECT id, '05 May - 23 May 2026', 'Santiago, Chile', 'Presencial', 'CLP $1.100.000' FROM courses WHERE code = 'ENAE/UAS/002'
UNION ALL
SELECT id, '01 Jun - 26 Jun 2026', 'Santiago, Chile', 'Presencial', 'CLP $1.400.000' FROM courses WHERE code = 'ENAE/UAS/003'
UNION ALL
SELECT id, '07 Abr - 11 Abr 2026', 'Santiago, Chile', 'Presencial', 'CLP $450.000' FROM courses WHERE code = 'ENAE/ATM/001'
UNION ALL
SELECT id, '08 Sep - 12 Sep 2026', 'Madrid, España', 'Presencial', 'EUR €600' FROM courses WHERE code = 'ENAE/ATM/001'
UNION ALL
SELECT id, '21 Abr - 02 May 2026', 'Santiago, Chile', 'Presencial', 'CLP $750.000' FROM courses WHERE code = 'ENAE/SEC/001'
UNION ALL
SELECT id, '04 May - 15 May 2026', 'Santiago, Chile', 'Híbrido', 'CLP $800.000' FROM courses WHERE code = 'ENAE/SMS/001'
UNION ALL
SELECT id, '07 Sep - 18 Sep 2026', 'Bogotá, Colombia', 'Híbrido', 'USD $950' FROM courses WHERE code = 'ENAE/SMS/001';

-- ============================================
-- SURVEY RESPONSES TABLE
-- ============================================
CREATE TABLE survey_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  questionnaire_type TEXT NOT NULL CHECK (questionnaire_type IN ('module', 'course', 'instructor')),
  module_name TEXT,
  answers JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(registration_id, questionnaire_type, module_name)
);

CREATE INDEX idx_survey_responses_registration ON survey_responses(registration_id);
CREATE INDEX idx_survey_responses_profile ON survey_responses(profile_id);
CREATE INDEX idx_survey_responses_type ON survey_responses(questionnaire_type);

ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own survey responses"
  ON survey_responses FOR INSERT WITH CHECK (
    profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view own survey responses"
  ON survey_responses FOR SELECT USING (
    profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage survey responses"
  ON survey_responses FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Create initial admin profile (replace with your actual email after setting up auth)
-- INSERT INTO profiles (first_name, last_name, email, job_title, organization, role)
-- VALUES ('Ivan', 'Araos', 'iaraos@cenae.aero', 'Director', 'Escuela de Navegación Aérea SpA', 'admin');
