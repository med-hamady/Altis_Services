-- =============================================================================
-- ALTIS SERVICES - Politiques RLS directes pour admins (sans fonction helper)
-- Fix: Vérifier directement dans la table admins au lieu d'utiliser is_admin()
-- =============================================================================

-- Cette approche évite le problème circulaire avec la fonction is_admin()

-- BANKS
DROP POLICY IF EXISTS banks_admin_select ON banks;
DROP POLICY IF EXISTS banks_admin_modify ON banks;

CREATE POLICY banks_admin_select ON banks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.is_active = true
    )
  );

CREATE POLICY banks_admin_modify ON banks
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

-- BANK_CONTACTS
DROP POLICY IF EXISTS bank_contacts_admin_select ON bank_contacts;
DROP POLICY IF EXISTS bank_contacts_admin_modify ON bank_contacts;

CREATE POLICY bank_contacts_admin_select ON bank_contacts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.is_active = true
    )
  );

-- DEBTORS_PP
DROP POLICY IF EXISTS debtors_pp_admin_select ON debtors_pp;
DROP POLICY IF EXISTS debtors_pp_admin_modify ON debtors_pp;

CREATE POLICY debtors_pp_admin_select ON debtors_pp
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.is_active = true
    )
  );

-- DEBTORS_PM
DROP POLICY IF EXISTS debtors_pm_admin_select ON debtors_pm;
DROP POLICY IF EXISTS debtors_pm_admin_modify ON debtors_pm;

CREATE POLICY debtors_pm_admin_select ON debtors_pm
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.is_active = true
    )
  );

-- CASES
DROP POLICY IF EXISTS cases_admin_select ON cases;
DROP POLICY IF EXISTS cases_admin_modify ON cases;

CREATE POLICY cases_admin_select ON cases
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.is_active = true
    )
  );

-- ACTIONS
DROP POLICY IF EXISTS actions_admin_select ON actions;
DROP POLICY IF EXISTS actions_admin_modify ON actions;

CREATE POLICY actions_admin_select ON actions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.is_active = true
    )
  );

-- PROMISES
DROP POLICY IF EXISTS promises_admin_select ON promises;
DROP POLICY IF EXISTS promises_admin_modify ON promises;

CREATE POLICY promises_admin_select ON promises
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.is_active = true
    )
  );

-- PAYMENTS
DROP POLICY IF EXISTS payments_admin_select ON payments;
DROP POLICY IF EXISTS payments_admin_modify ON payments;

CREATE POLICY payments_admin_select ON payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.is_active = true
    )
  );

-- DOCUMENTS
DROP POLICY IF EXISTS documents_admin_select ON documents;
DROP POLICY IF EXISTS documents_admin_modify ON documents;

CREATE POLICY documents_admin_select ON documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.is_active = true
    )
  );

-- ACTION_ATTACHMENTS
DROP POLICY IF EXISTS action_attachments_admin_select ON action_attachments;
DROP POLICY IF EXISTS action_attachments_admin_modify ON action_attachments;

CREATE POLICY action_attachments_admin_select ON action_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.is_active = true
    )
  );

-- Test: Vérifier que l'utilisateur courant peut lire les tables
SELECT 'Test auth.uid()' as test, auth.uid() as user_id;
SELECT 'Test admin exists' as test, EXISTS (SELECT 1 FROM admins WHERE id = auth.uid() AND is_active = true) as is_admin;
SELECT 'Test count banks' as test, COUNT(*) as count FROM banks;
SELECT 'Test count cases' as test, COUNT(*) as count FROM cases;
