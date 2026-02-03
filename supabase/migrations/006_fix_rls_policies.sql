-- =============================================================================
-- ALTIS SERVICES - Correction des politiques RLS pour les tables utilisateurs
-- Fix: Ajouter des policies permettant de lire son propre profil
-- =============================================================================

-- =============================================================================
-- Supprimer les anciennes policies
-- =============================================================================

DROP POLICY IF EXISTS admins_admin_all ON admins;
DROP POLICY IF EXISTS admins_self_select ON admins;
DROP POLICY IF EXISTS admins_admin_manage ON admins;

DROP POLICY IF EXISTS agents_admin_all ON agents;
DROP POLICY IF EXISTS agents_self_select ON agents;
DROP POLICY IF EXISTS agents_self_update ON agents;
DROP POLICY IF EXISTS agents_admin_manage ON agents;

DROP POLICY IF EXISTS bank_users_admin_all ON bank_users;
DROP POLICY IF EXISTS bank_users_self_select ON bank_users;
DROP POLICY IF EXISTS bank_users_admin_manage ON bank_users;

-- =============================================================================
-- ADMINS - Nouvelles policies
-- =============================================================================

-- Lecture: Soit son propre profil, soit admin peut tout lire
CREATE POLICY admins_select ON admins
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR is_admin());

-- Insertion/modification/suppression: Réservé aux admins
CREATE POLICY admins_manage ON admins
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- =============================================================================
-- AGENTS - Nouvelles policies
-- =============================================================================

-- Lecture: Soit son propre profil, soit admin peut tout lire
CREATE POLICY agents_select ON agents
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR is_admin());

-- Modification de son propre profil (sauf is_active)
CREATE POLICY agents_update_self ON agents
  FOR UPDATE TO authenticated
  USING (is_agent() AND id = auth.uid())
  WITH CHECK (
    is_agent() AND
    id = auth.uid() AND
    is_active = (SELECT is_active FROM agents WHERE id = auth.uid())
  );

-- Gestion complète par les admins
CREATE POLICY agents_manage ON agents
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- =============================================================================
-- BANK_USERS - Nouvelles policies
-- =============================================================================

-- Lecture: Soit son propre profil, soit admin peut tout lire
CREATE POLICY bank_users_select ON bank_users
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR is_admin());

-- Gestion complète par les admins
CREATE POLICY bank_users_manage ON bank_users
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- =============================================================================
-- Réactiver RLS sur les tables utilisateurs
-- =============================================================================

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_users ENABLE ROW LEVEL SECURITY;
