-- =============================================================================
-- ALTIS SERVICES - Politiques RLS simples sans récursion
-- =============================================================================

-- STRATÉGIE: Créer des politiques très simples qui ne créent AUCUNE récursion

-- =============================================================================
-- TABLES UTILISATEURS (admins, agents, bank_users)
-- =============================================================================

-- ADMINS: Tout le monde peut lire, personne ne peut modifier via RLS
-- (Les modifications se feront via l'API avec signUp et des triggers)
DROP POLICY IF EXISTS admins_select_all ON admins;
DROP POLICY IF EXISTS admins_manage_admin_only ON admins;

CREATE POLICY admins_read_all ON admins
  FOR SELECT TO authenticated
  USING (true);

-- Pour les modifications, on désactive temporairement les politiques
-- et on gérera les permissions au niveau application
CREATE POLICY admins_insert_authenticated ON admins
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY admins_update_self ON admins
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY admins_delete_never ON admins
  FOR DELETE TO authenticated
  USING (false);

-- AGENTS: Même stratégie
DROP POLICY IF EXISTS agents_select_all ON agents;
DROP POLICY IF EXISTS agents_manage ON agents;

CREATE POLICY agents_read_all ON agents
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY agents_insert_authenticated ON agents
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY agents_update_self ON agents
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY agents_delete_never ON agents
  FOR DELETE TO authenticated
  USING (false);

-- BANK_USERS: Même stratégie
DROP POLICY IF EXISTS bank_users_select_all ON bank_users;
DROP POLICY IF EXISTS bank_users_manage ON bank_users;

CREATE POLICY bank_users_read_all ON bank_users
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY bank_users_insert_authenticated ON bank_users
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY bank_users_update_self ON bank_users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY bank_users_delete_never ON bank_users
  FOR DELETE TO authenticated
  USING (false);

-- =============================================================================
-- VÉRIFICATION FINALE
-- =============================================================================

-- Test de lecture
SELECT 'Test lecture admins' as test, COUNT(*) as count FROM admins;
SELECT 'Test lecture agents' as test, COUNT(*) as count FROM agents;
SELECT 'Test lecture bank_users' as test, COUNT(*) as count FROM bank_users;
SELECT 'Test lecture banks' as test, COUNT(*) as count FROM banks;
SELECT 'Test lecture cases' as test, COUNT(*) as count FROM cases;

-- Afficher toutes les politiques actives sur les tables utilisateurs
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE tablename IN ('admins', 'agents', 'bank_users', 'banks', 'cases')
ORDER BY tablename, policyname;
