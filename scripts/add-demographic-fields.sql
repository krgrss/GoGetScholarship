-- Add demographic fields to students table
-- These fields help with matching scholarships that have specific demographic eligibility

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS ethnicity text,
ADD COLUMN IF NOT EXISTS level_of_study text;

COMMENT ON COLUMN students.gender IS 'Gender identity (optional, for demographic-specific scholarships)';
COMMENT ON COLUMN students.date_of_birth IS 'Date of birth (optional, for age-based eligibility)';
COMMENT ON COLUMN students.ethnicity IS 'Ethnicity (optional, for identity-based scholarships)';
COMMENT ON COLUMN students.level_of_study IS 'Current level: High School, Undergraduate, Graduate, PhD';
