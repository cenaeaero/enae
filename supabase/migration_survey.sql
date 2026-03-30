-- ============================================
-- MIGRATION: Survey/Questionnaire System
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Add 'completed' to registrations status CHECK constraint
ALTER TABLE registrations DROP CONSTRAINT registrations_status_check;
ALTER TABLE registrations ADD CONSTRAINT registrations_status_check
  CHECK (status IN ('pending', 'confirmed', 'completed', 'rejected', 'cancelled'));

-- 2. Create survey_responses table
CREATE TABLE survey_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  questionnaire_type TEXT NOT NULL CHECK (questionnaire_type IN ('module', 'course', 'instructor')),
  module_name TEXT,  -- only used when questionnaire_type = 'module'
  answers JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(registration_id, questionnaire_type, module_name)
);

-- 3. Indexes
CREATE INDEX idx_survey_responses_registration ON survey_responses(registration_id);
CREATE INDEX idx_survey_responses_profile ON survey_responses(profile_id);
CREATE INDEX idx_survey_responses_type ON survey_responses(questionnaire_type);

-- 4. Row Level Security
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
