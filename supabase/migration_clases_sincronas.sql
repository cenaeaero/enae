-- =============================================================================
-- Clases sincrónicas (clase en vivo, examen sincrónico, tarea, trabajo)
-- + libro de asistencia
-- =============================================================================

CREATE TABLE IF NOT EXISTS synchronous_classes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id         uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  session_id        uuid REFERENCES sessions(id) ON DELETE SET NULL,
  title             text NOT NULL,
  description       text,
  kind              text NOT NULL DEFAULT 'class'
    CHECK (kind IN ('class','exam','assignment','workshop','meeting')),
  link_url          text,
  scheduled_at      timestamptz NOT NULL,
  duration_minutes  integer DEFAULT 60,
  instructor_email  text,
  created_by        text NOT NULL,
  status            text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  invitation_sent_at timestamptz,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_classes_course   ON synchronous_classes (course_id);
CREATE INDEX IF NOT EXISTS idx_sync_classes_session  ON synchronous_classes (session_id);
CREATE INDEX IF NOT EXISTS idx_sync_classes_when     ON synchronous_classes (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_sync_classes_instructor ON synchronous_classes (instructor_email);

CREATE TABLE IF NOT EXISTS class_attendance (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  synchronous_class_id   uuid NOT NULL REFERENCES synchronous_classes(id) ON DELETE CASCADE,
  registration_id        uuid NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  status                 text NOT NULL DEFAULT 'absent'
    CHECK (status IN ('present','absent','late','excused')),
  arrived_at             timestamptz,
  notes                  text,
  marked_by              text,
  marked_at              timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (synchronous_class_id, registration_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_class        ON class_attendance (synchronous_class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_registration ON class_attendance (registration_id);

-- Trigger updated_at en synchronous_classes
DROP TRIGGER IF EXISTS trg_sync_classes_updated ON synchronous_classes;
CREATE TRIGGER trg_sync_classes_updated BEFORE UPDATE ON synchronous_classes
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at_generic();

ALTER TABLE synchronous_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_attendance    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sc_service ON synchronous_classes;
CREATE POLICY sc_service ON synchronous_classes FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ca_service ON class_attendance;
CREATE POLICY ca_service ON class_attendance FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Lectura para autenticados (alumnos ven sus clases)
DROP POLICY IF EXISTS sc_read ON synchronous_classes;
CREATE POLICY sc_read ON synchronous_classes FOR SELECT TO authenticated USING (true);
