-- =============================================================================
-- Fecha de nacimiento + bucket para fotos de perfil
-- =============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date date;

-- Bucket de avatars (público para que las imágenes se vean directo en la UI)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 1048576, ARRAY['image/jpeg','image/jpg'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 1048576,
  allowed_mime_types = ARRAY['image/jpeg','image/jpg'];

-- Policy: lectura pública (es bucket público)
DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
CREATE POLICY "avatars public read" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'avatars');

-- Policy: solo service_role escribe (API admin sube por nosotros)
DROP POLICY IF EXISTS "avatars service write" ON storage.objects;
CREATE POLICY "avatars service write" ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'avatars')
  WITH CHECK (bucket_id = 'avatars');
