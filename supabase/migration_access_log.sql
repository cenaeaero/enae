-- Course access log: tracks each time a student opens the course page
CREATE TABLE IF NOT EXISTS course_access_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_access_log_registration ON course_access_log(registration_id);
CREATE INDEX idx_access_log_accessed_at ON course_access_log(accessed_at DESC);

-- RLS: students can insert their own logs, admins can read all
ALTER TABLE course_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can insert own access log"
  ON course_access_log FOR INSERT
  WITH CHECK (
    registration_id IN (
      SELECT id FROM registrations WHERE email = (SELECT email FROM profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Students can read own access log"
  ON course_access_log FOR SELECT
  USING (
    registration_id IN (
      SELECT id FROM registrations WHERE email = (SELECT email FROM profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Admins can read all access logs"
  ON course_access_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );
