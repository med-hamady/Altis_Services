-- ============================================================================
-- Migration 019 : Permettre aux admins de modifier les profils utilisateurs
-- Les politiques UPDATE actuelles ne permettent qu'à l'utilisateur lui-même
-- de modifier son propre profil. L'admin doit aussi pouvoir le faire.
-- ============================================================================

-- ADMINS : l'admin peut modifier son propre profil OU tout autre admin
DROP POLICY IF EXISTS admins_update ON admins;
CREATE POLICY admins_update ON admins
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR is_admin());

-- AGENTS : l'agent peut modifier son profil OU un admin peut modifier tout agent
DROP POLICY IF EXISTS agents_update ON agents;
CREATE POLICY agents_update ON agents
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR is_admin());

-- BANK_USERS : le bank_user peut modifier son profil OU un admin peut modifier tout bank_user
DROP POLICY IF EXISTS bank_users_update ON bank_users;
CREATE POLICY bank_users_update ON bank_users
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR is_admin());
