-- Emails adicionales en perfiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS corporate_email text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS personal_email text;
