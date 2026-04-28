-- Add explicit theoretical / practical hours per course.
-- Used by the DGAC certificate to print the total instructional hours.
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS theoretical_hours INTEGER,
  ADD COLUMN IF NOT EXISTS practical_hours INTEGER;
