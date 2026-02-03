-- ============================================================================
-- Migration 021 : Champs profil (logo banque, avatar utilisateur)
-- ============================================================================

-- 1) Ajouter logo_url sur banks
ALTER TABLE banks ADD COLUMN IF NOT EXISTS logo_url text;

-- 2) Ajouter avatar_url sur bank_users
ALTER TABLE bank_users ADD COLUMN IF NOT EXISTS avatar_url text;

-- 3) Créer le bucket storage pour avatars/logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Politique storage : authentifiés peuvent upload dans avatars
CREATE POLICY "auth_upload_avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

-- Politique storage : tout le monde peut lire les avatars (public)
CREATE POLICY "public_read_avatars" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

-- Politique storage : authentifiés peuvent mettre à jour leurs avatars
CREATE POLICY "auth_update_avatars" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars');

-- Politique storage : authentifiés peuvent supprimer leurs avatars
CREATE POLICY "auth_delete_avatars" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars');

-- 4) Permettre au bank_user de modifier le profil de sa banque
CREATE POLICY banks_bankuser_update ON banks
  FOR UPDATE TO authenticated
  USING (
    is_bank_user()
    AND id = get_bank_user_bank_id()
  );
