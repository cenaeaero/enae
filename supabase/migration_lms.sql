-- ============================================
-- MIGRATION: LMS - Course Modules, Progress & Messaging
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Add instructor/moodle fields to courses
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS moodle_url TEXT,
  ADD COLUMN IF NOT EXISTS instructor_name TEXT,
  ADD COLUMN IF NOT EXISTS instructor_whatsapp TEXT;

-- 2. Course Modules table
CREATE TABLE course_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT,
  video_entry_id TEXT,
  video_title TEXT,
  activities JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_course_modules_course ON course_modules(course_id);
CREATE INDEX idx_course_modules_order ON course_modules(course_id, sort_order);

ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Course modules viewable by everyone"
  ON course_modules FOR SELECT USING (true);

CREATE POLICY "Admins can manage course modules"
  ON course_modules FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 3. Module Progress table
CREATE TABLE module_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(registration_id, module_id)
);

CREATE INDEX idx_module_progress_registration ON module_progress(registration_id);
CREATE INDEX idx_module_progress_module ON module_progress(module_id);

ALTER TABLE module_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON module_progress FOR SELECT USING (
    registration_id IN (
      SELECT id FROM registrations WHERE email = (SELECT email FROM profiles WHERE user_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'instructor'))
  );

CREATE POLICY "Users can insert own progress"
  ON module_progress FOR INSERT WITH CHECK (
    registration_id IN (
      SELECT id FROM registrations WHERE email = (SELECT email FROM profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update own progress"
  ON module_progress FOR UPDATE USING (
    registration_id IN (
      SELECT id FROM registrations WHERE email = (SELECT email FROM profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Admins can manage all progress"
  ON module_progress FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 4. Course Messages table
CREATE TABLE course_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  sender_profile_id UUID NOT NULL REFERENCES profiles(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_course_messages_registration ON course_messages(registration_id);
CREATE INDEX idx_course_messages_sender ON course_messages(sender_profile_id);

ALTER TABLE course_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON course_messages FOR SELECT USING (
    registration_id IN (
      SELECT id FROM registrations WHERE email = (SELECT email FROM profiles WHERE user_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'instructor'))
  );

CREATE POLICY "Users can send messages"
  ON course_messages FOR INSERT WITH CHECK (
    sender_profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage messages"
  ON course_messages FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'instructor'))
  );
