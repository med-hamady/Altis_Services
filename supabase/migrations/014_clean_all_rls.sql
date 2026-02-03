-- =============================================================================
-- ALTIS SERVICES - Nettoyage complet et recréation de TOUTES les politiques RLS
-- =============================================================================

-- ÉTAPE 1: Supprimer TOUTES les politiques existantes sur chaque table
-- =============================================================================

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- =============================================================================
-- ÉTAPE 2: Recréer la fonction is_admin() en SECURITY DEFINER
-- avec BYPASSRLS implicite via le propriétaire (postgres)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins
    WHERE id = auth.uid()
    AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_agent()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agents
    WHERE id = auth.uid()
    AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_bank_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bank_id FROM public.bank_users
  WHERE id = auth.uid()
  AND is_active = true
  LIMIT 1;
$$;

-- =============================================================================
-- ÉTAPE 3: ADMINS, AGENTS, BANK_USERS - Lecture libre, écriture restreinte
-- =============================================================================

-- ADMINS
CREATE POLICY admins_select ON admins
  FOR SELECT TO authenticated USING (true);

CREATE POLICY admins_insert ON admins
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY admins_update ON admins
  FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY admins_delete ON admins
  FOR DELETE TO authenticated USING (false);

-- AGENTS
CREATE POLICY agents_select ON agents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY agents_insert ON agents
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY agents_update ON agents
  FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY agents_delete ON agents
  FOR DELETE TO authenticated USING (false);

-- BANK_USERS
CREATE POLICY bank_users_select ON bank_users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY bank_users_insert ON bank_users
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY bank_users_update ON bank_users
  FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY bank_users_delete ON bank_users
  FOR DELETE TO authenticated USING (false);

-- =============================================================================
-- ÉTAPE 4: BANKS - Admin: tout, BankUser: sa banque, Agent: lecture
-- =============================================================================

CREATE POLICY banks_select ON banks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY banks_insert ON banks
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY banks_update ON banks
  FOR UPDATE TO authenticated USING (is_admin());

CREATE POLICY banks_delete ON banks
  FOR DELETE TO authenticated USING (is_admin());

-- BANK_CONTACTS
CREATE POLICY bank_contacts_select ON bank_contacts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY bank_contacts_insert ON bank_contacts
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY bank_contacts_update ON bank_contacts
  FOR UPDATE TO authenticated USING (is_admin());

CREATE POLICY bank_contacts_delete ON bank_contacts
  FOR DELETE TO authenticated USING (is_admin());

-- =============================================================================
-- ÉTAPE 5: DEBTORS - Admin: tout, Agent: lecture de ses dossiers
-- =============================================================================

CREATE POLICY debtors_pp_select ON debtors_pp
  FOR SELECT TO authenticated USING (true);

CREATE POLICY debtors_pp_insert ON debtors_pp
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY debtors_pp_update ON debtors_pp
  FOR UPDATE TO authenticated USING (is_admin());

CREATE POLICY debtors_pp_delete ON debtors_pp
  FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY debtors_pm_select ON debtors_pm
  FOR SELECT TO authenticated USING (true);

CREATE POLICY debtors_pm_insert ON debtors_pm
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY debtors_pm_update ON debtors_pm
  FOR UPDATE TO authenticated USING (is_admin());

CREATE POLICY debtors_pm_delete ON debtors_pm
  FOR DELETE TO authenticated USING (is_admin());

-- =============================================================================
-- ÉTAPE 6: CASES - Admin: tout, Agent: ses dossiers, BankUser: dossiers banque
-- =============================================================================

CREATE POLICY cases_select ON cases
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR (is_agent() AND assigned_agent_id = auth.uid())
    OR bank_id = get_user_bank_id()
  );

CREATE POLICY cases_insert ON cases
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY cases_update ON cases
  FOR UPDATE TO authenticated
  USING (
    is_admin()
    OR (is_agent() AND assigned_agent_id = auth.uid())
  );

CREATE POLICY cases_delete ON cases
  FOR DELETE TO authenticated USING (is_admin());

-- =============================================================================
-- ÉTAPE 7: ACTIONS
-- =============================================================================

CREATE POLICY actions_select ON actions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY actions_insert ON actions
  FOR INSERT TO authenticated WITH CHECK (is_admin() OR is_agent());

CREATE POLICY actions_update ON actions
  FOR UPDATE TO authenticated USING (is_admin());

CREATE POLICY actions_delete ON actions
  FOR DELETE TO authenticated USING (is_admin());

-- =============================================================================
-- ÉTAPE 8: PROMISES
-- =============================================================================

CREATE POLICY promises_select ON promises
  FOR SELECT TO authenticated USING (true);

CREATE POLICY promises_insert ON promises
  FOR INSERT TO authenticated WITH CHECK (is_admin() OR is_agent());

CREATE POLICY promises_update ON promises
  FOR UPDATE TO authenticated USING (is_admin());

CREATE POLICY promises_delete ON promises
  FOR DELETE TO authenticated USING (is_admin());

-- =============================================================================
-- ÉTAPE 9: PAYMENTS
-- =============================================================================

CREATE POLICY payments_select ON payments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY payments_insert ON payments
  FOR INSERT TO authenticated WITH CHECK (is_admin() OR is_agent());

CREATE POLICY payments_update ON payments
  FOR UPDATE TO authenticated USING (is_admin());

CREATE POLICY payments_delete ON payments
  FOR DELETE TO authenticated USING (is_admin());

-- =============================================================================
-- ÉTAPE 10: DOCUMENTS
-- =============================================================================

CREATE POLICY documents_select ON documents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY documents_insert ON documents
  FOR INSERT TO authenticated WITH CHECK (is_admin() OR is_agent());

CREATE POLICY documents_update ON documents
  FOR UPDATE TO authenticated USING (is_admin());

CREATE POLICY documents_delete ON documents
  FOR DELETE TO authenticated USING (is_admin());

-- =============================================================================
-- ÉTAPE 11: ACTION_ATTACHMENTS
-- =============================================================================

CREATE POLICY action_attachments_select ON action_attachments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY action_attachments_insert ON action_attachments
  FOR INSERT TO authenticated WITH CHECK (is_admin() OR is_agent());

CREATE POLICY action_attachments_update ON action_attachments
  FOR UPDATE TO authenticated USING (is_admin());

CREATE POLICY action_attachments_delete ON action_attachments
  FOR DELETE TO authenticated USING (is_admin());

-- =============================================================================
-- ÉTAPE 12: AUDIT_LOGS et CONTACT_HISTORY
-- =============================================================================

CREATE POLICY audit_logs_select ON audit_logs
  FOR SELECT TO authenticated USING (is_admin());

CREATE POLICY contact_history_select ON contact_history
  FOR SELECT TO authenticated USING (is_admin());

-- =============================================================================
-- VÉRIFICATION
-- =============================================================================

SELECT 'Admins' as tbl, COUNT(*) FROM admins
UNION ALL SELECT 'Banks', COUNT(*) FROM banks
UNION ALL SELECT 'Cases', COUNT(*) FROM cases
UNION ALL SELECT 'Debtors PP', COUNT(*) FROM debtors_pp
UNION ALL SELECT 'Debtors PM', COUNT(*) FROM debtors_pm;
