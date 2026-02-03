-- =============================================================================
-- ALTIS SERVICES - Correction des politiques RLS pour admins
-- Fix: Créer des politiques SELECT explicites pour les admins
-- =============================================================================

-- Pour les admins, on crée des politiques SELECT séparées qui sont plus simples

-- BANKS
DROP POLICY IF EXISTS banks_admin_all ON banks;
CREATE POLICY banks_admin_select ON banks
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY banks_admin_modify ON banks
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- BANK_CONTACTS
DROP POLICY IF EXISTS bank_contacts_admin_all ON bank_contacts;
CREATE POLICY bank_contacts_admin_select ON bank_contacts
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY bank_contacts_admin_modify ON bank_contacts
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- DEBTORS_PP
DROP POLICY IF EXISTS debtors_pp_admin_all ON debtors_pp;
CREATE POLICY debtors_pp_admin_select ON debtors_pp
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY debtors_pp_admin_modify ON debtors_pp
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- DEBTORS_PM
DROP POLICY IF EXISTS debtors_pm_admin_all ON debtors_pm;
CREATE POLICY debtors_pm_admin_select ON debtors_pm
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY debtors_pm_admin_modify ON debtors_pm
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- CASES
DROP POLICY IF EXISTS cases_admin_all ON cases;
CREATE POLICY cases_admin_select ON cases
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY cases_admin_modify ON cases
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ACTIONS
DROP POLICY IF EXISTS actions_admin_all ON actions;
CREATE POLICY actions_admin_select ON actions
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY actions_admin_modify ON actions
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- PROMISES
DROP POLICY IF EXISTS promises_admin_all ON promises;
CREATE POLICY promises_admin_select ON promises
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY promises_admin_modify ON promises
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- PAYMENTS
DROP POLICY IF EXISTS payments_admin_all ON payments;
CREATE POLICY payments_admin_select ON payments
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY payments_admin_modify ON payments
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- DOCUMENTS
DROP POLICY IF EXISTS documents_admin_all ON documents;
CREATE POLICY documents_admin_select ON documents
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY documents_admin_modify ON documents
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ACTION_ATTACHMENTS
DROP POLICY IF EXISTS action_attachments_admin_all ON action_attachments;
CREATE POLICY action_attachments_admin_select ON action_attachments
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY action_attachments_admin_modify ON action_attachments
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Vérification
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('banks', 'cases', 'debtors_pp', 'debtors_pm', 'admins')
ORDER BY tablename, policyname;
