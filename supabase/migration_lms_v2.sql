-- Migration: LMS v2 — Complete Learning Management System
-- 11 new tables + alterations to course_modules

-- ============================================================
-- 1. Alter course_modules: add objectives and materials
-- ============================================================
ALTER TABLE course_modules ADD COLUMN IF NOT EXISTS objectives TEXT;
ALTER TABLE course_modules ADD COLUMN IF NOT EXISTS materials JSONB DEFAULT '[]';

-- ============================================================
-- 2. module_activities — replaces JSONB activities column
-- ============================================================
CREATE TABLE IF NOT EXISTS module_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL CHECK (type IN ('task', 'exam', 'discussion', 'zoom', 'reading')),
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_module_activities_module ON module_activities(module_id);

-- ============================================================
-- 3. activity_progress — per-student, per-activity tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES module_activities(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(registration_id, activity_id)
);
CREATE INDEX IF NOT EXISTS idx_activity_progress_reg ON activity_progress(registration_id);

-- ============================================================
-- 4. reading_materials — PDF links for reading activities & module downloads
-- ============================================================
CREATE TABLE IF NOT EXISTS reading_materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID REFERENCES module_activities(id) ON DELETE CASCADE,
  module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  CHECK (activity_id IS NOT NULL OR module_id IS NOT NULL)
);

-- ============================================================
-- 5. exams — exam metadata linked to activity
-- ============================================================
CREATE TABLE IF NOT EXISTS exams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID UNIQUE REFERENCES module_activities(id) ON DELETE CASCADE,
  time_limit_minutes INTEGER,
  passing_score NUMERIC DEFAULT 80,
  max_attempts INTEGER DEFAULT 1,
  shuffle_questions BOOLEAN DEFAULT TRUE,
  is_final_exam BOOLEAN DEFAULT FALSE,
  is_dgac_simulator BOOLEAN DEFAULT FALSE,
  grade_item_id UUID REFERENCES grade_items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. exam_questions — individual questions
-- ============================================================
CREATE TABLE IF NOT EXISTS exam_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false')),
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer TEXT NOT NULL,
  points NUMERIC DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON exam_questions(exam_id);

-- ============================================================
-- 7. exam_attempts — student exam attempts
-- ============================================================
CREATE TABLE IF NOT EXISTS exam_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  score NUMERIC,
  total_points NUMERIC,
  earned_points NUMERIC,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  UNIQUE(exam_id, registration_id, attempt_number)
);

-- ============================================================
-- 8. exam_answers — individual answers per attempt
-- ============================================================
CREATE TABLE IF NOT EXISTS exam_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
  selected_answer TEXT,
  is_correct BOOLEAN,
  UNIQUE(attempt_id, question_id)
);

-- ============================================================
-- 9. discussion_threads + posts
-- ============================================================
CREATE TABLE IF NOT EXISTS discussion_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID UNIQUE REFERENCES module_activities(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS discussion_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES discussion_threads(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_discussion_posts_thread ON discussion_posts(thread_id);

-- ============================================================
-- 10. zoom_meetings + zoom_config
-- ============================================================
CREATE TABLE IF NOT EXISTS zoom_meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID UNIQUE REFERENCES module_activities(id) ON DELETE CASCADE,
  zoom_meeting_id TEXT,
  topic TEXT,
  start_time TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 60,
  join_url TEXT,
  start_url TEXT,
  password TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'started', 'ended')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS zoom_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. task_submissions
-- ============================================================
CREATE TABLE IF NOT EXISTS task_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES module_activities(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_id, registration_id)
);

-- ============================================================
-- RLS — Allow all (admin access via supabaseAdmin, student via RLS)
-- ============================================================
ALTER TABLE module_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoom_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoom_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_submissions ENABLE ROW LEVEL SECURITY;

-- Full access policies (supabaseAdmin bypasses RLS; browser client needs these)
CREATE POLICY "Full access module_activities" ON module_activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access activity_progress" ON activity_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access reading_materials" ON reading_materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access exams" ON exams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access exam_questions" ON exam_questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access exam_attempts" ON exam_attempts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access exam_answers" ON exam_answers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access discussion_threads" ON discussion_threads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access discussion_posts" ON discussion_posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access zoom_meetings" ON zoom_meetings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access zoom_config" ON zoom_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access task_submissions" ON task_submissions FOR ALL USING (true) WITH CHECK (true);
