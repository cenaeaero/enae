-- ============================================
-- MIGRATION: Academic Management System
-- Grade items, student grades, diplomas
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Add fields to registrations
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS theoretical_start DATE;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS practical_end DATE;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS final_score NUMERIC;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS grade_status TEXT CHECK (grade_status IN ('pending', 'approved', 'failed'));
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS company TEXT;

-- 2. Grade items (evaluation definitions per course)
CREATE TABLE grade_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_grade_items_course ON grade_items(course_id);

ALTER TABLE grade_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Grade items viewable by everyone"
  ON grade_items FOR SELECT USING (true);

CREATE POLICY "Admins can manage grade items"
  ON grade_items FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'instructor'))
  );

-- 3. Student grades
CREATE TABLE student_grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  grade_item_id UUID NOT NULL REFERENCES grade_items(id) ON DELETE CASCADE,
  score NUMERIC,
  comments TEXT,
  graded_by UUID REFERENCES profiles(id),
  graded_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(registration_id, grade_item_id)
);

CREATE INDEX idx_student_grades_registration ON student_grades(registration_id);
CREATE INDEX idx_student_grades_item ON student_grades(grade_item_id);

ALTER TABLE student_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own grades"
  ON student_grades FOR SELECT USING (
    registration_id IN (
      SELECT id FROM registrations WHERE email = (SELECT email FROM profiles WHERE user_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'instructor'))
  );

CREATE POLICY "Admins and instructors can manage grades"
  ON student_grades FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'instructor'))
  );

-- 4. Diplomas
CREATE TABLE diplomas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  verification_code TEXT NOT NULL UNIQUE,
  student_name TEXT NOT NULL,
  course_title TEXT NOT NULL,
  course_code TEXT,
  final_score NUMERIC,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'failed')),
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  theoretical_start DATE,
  practical_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_diplomas_registration ON diplomas(registration_id);
CREATE INDEX idx_diplomas_code ON diplomas(verification_code);

ALTER TABLE diplomas ENABLE ROW LEVEL SECURITY;

-- Anyone can verify a diploma (public read by code)
CREATE POLICY "Diplomas are publicly verifiable"
  ON diplomas FOR SELECT USING (true);

CREATE POLICY "Admins can manage diplomas"
  ON diplomas FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Sequence for diploma numbers
CREATE SEQUENCE IF NOT EXISTS diploma_number_seq START 1000;
