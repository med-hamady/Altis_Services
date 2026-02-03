-- =============================================================================
-- ALTIS SERVICES - Fix du problème circulaire RLS sur la table admins
-- =============================================================================

-- Le problème : Les politiques sur d'autres tables vérifient dans la table admins,
-- mais la table admins elle-même a des politiques RLS qui peuvent bloquer l'accès.

-- Solution : Permettre à tous les utilisateurs authentifiés de LIRE la table admins
-- pour vérifier si un UUID est un admin. Cela ne pose pas de problème de sécurité
-- car on ne stocke que des infos non sensibles (pas de mots de passe).

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS admins_select ON admins;
DROP POLICY IF EXISTS admins_manage ON admins;

-- Nouvelle politique : Tout utilisateur authentifié peut lire la table admins
-- Cela permet aux politiques d'autres tables de vérifier si quelqu'un est admin
CREATE POLICY admins_select_all ON admins
  FOR SELECT TO authenticated
  USING (true);

-- Seuls les admins peuvent modifier la table admins
CREATE POLICY admins_manage_admin_only ON admins
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.is_active = true
    )
  );

-- Pareil pour agents et bank_users pour éviter les problèmes similaires
DROP POLICY IF EXISTS agents_select ON agents;
DROP POLICY IF EXISTS agents_update_self ON agents;
DROP POLICY IF EXISTS agents_manage ON agents;

CREATE POLICY agents_select_all ON agents
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS bank_users_select ON bank_users;
DROP POLICY IF EXISTS bank_users_manage ON bank_users;

CREATE POLICY bank_users_select_all ON bank_users
  FOR SELECT TO authenticated
  USING (true);

-- Test
SELECT 'Admins' as table_name, COUNT(*) as count FROM admins;
SELECT 'Agents' as table_name, COUNT(*) as count FROM agents;
SELECT 'Bank Users' as table_name, COUNT(*) as count FROM bank_users;
SELECT 'Banks' as table_name, COUNT(*) as count FROM banks;
SELECT 'Cases' as table_name, COUNT(*) as count FROM cases;
