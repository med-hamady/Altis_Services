-- =============================================================================
-- ALTIS SERVICES - Politiques Row Level Security (RLS)
-- Architecture sécurisée avec contrôle strict des accès
-- =============================================================================

-- =============================================================================
-- ACTIVER RLS SUR TOUTES LES TABLES
-- =============================================================================

ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debtors_pp ENABLE ROW LEVEL SECURITY;
ALTER TABLE debtors_pm ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promises ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_history ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- BANKS
-- =============================================================================

CREATE POLICY banks_admin_all ON banks
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY banks_agent_select ON banks
  FOR SELECT TO authenticated
  USING (is_agent() AND id IN (SELECT get_agent_bank_ids()));

CREATE POLICY banks_bankuser_select ON banks
  FOR SELECT TO authenticated
  USING (is_bank_user() AND id = get_bank_user_bank_id());

-- =============================================================================
-- ADMINS
-- =============================================================================

CREATE POLICY admins_admin_all ON admins
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- =============================================================================
-- AGENTS
-- =============================================================================

CREATE POLICY agents_admin_all ON agents
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY agents_self_select ON agents
  FOR SELECT TO authenticated
  USING (is_agent() AND id = auth.uid());

CREATE POLICY agents_self_update ON agents
  FOR UPDATE TO authenticated
  USING (is_agent() AND id = auth.uid())
  WITH CHECK (
    is_agent() AND id = auth.uid() AND
    is_active = (SELECT is_active FROM agents WHERE id = auth.uid())
  );

-- =============================================================================
-- BANK_USERS
-- =============================================================================

CREATE POLICY bank_users_admin_all ON bank_users
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY bank_users_self_select ON bank_users
  FOR SELECT TO authenticated
  USING (is_bank_user() AND id = auth.uid());

-- =============================================================================
-- BANK_CONTACTS
-- =============================================================================

CREATE POLICY bank_contacts_admin_all ON bank_contacts
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY bank_contacts_bankuser_select ON bank_contacts
  FOR SELECT TO authenticated
  USING (is_bank_user() AND bank_id = get_bank_user_bank_id());

-- =============================================================================
-- DEBTORS_PP
-- =============================================================================

CREATE POLICY debtors_pp_admin_all ON debtors_pp
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY debtors_pp_agent_select ON debtors_pp
  FOR SELECT TO authenticated
  USING (
    is_agent() AND EXISTS (
      SELECT 1 FROM cases
      WHERE cases.debtor_pp_id = debtors_pp.id
      AND cases.assigned_agent_id = auth.uid()
    )
  );

CREATE POLICY debtors_pp_agent_insert ON debtors_pp
  FOR INSERT TO authenticated
  WITH CHECK (is_agent() AND created_by = auth.uid());

CREATE POLICY debtors_pp_agent_update ON debtors_pp
  FOR UPDATE TO authenticated
  USING (
    is_agent() AND EXISTS (
      SELECT 1 FROM cases
      WHERE cases.debtor_pp_id = debtors_pp.id
      AND cases.assigned_agent_id = auth.uid()
    )
  )
  WITH CHECK (
    is_agent() AND EXISTS (
      SELECT 1 FROM cases
      WHERE cases.debtor_pp_id = debtors_pp.id
      AND cases.assigned_agent_id = auth.uid()
    )
  );

CREATE POLICY debtors_pp_bankuser_select ON debtors_pp
  FOR SELECT TO authenticated
  USING (
    is_bank_user() AND EXISTS (
      SELECT 1 FROM cases
      WHERE cases.debtor_pp_id = debtors_pp.id
      AND cases.bank_id = get_bank_user_bank_id()
    )
  );

-- =============================================================================
-- DEBTORS_PM
-- =============================================================================

CREATE POLICY debtors_pm_admin_all ON debtors_pm
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY debtors_pm_agent_select ON debtors_pm
  FOR SELECT TO authenticated
  USING (
    is_agent() AND EXISTS (
      SELECT 1 FROM cases
      WHERE cases.debtor_pm_id = debtors_pm.id
      AND cases.assigned_agent_id = auth.uid()
    )
  );

CREATE POLICY debtors_pm_agent_insert ON debtors_pm
  FOR INSERT TO authenticated
  WITH CHECK (is_agent() AND created_by = auth.uid());

CREATE POLICY debtors_pm_agent_update ON debtors_pm
  FOR UPDATE TO authenticated
  USING (
    is_agent() AND EXISTS (
      SELECT 1 FROM cases
      WHERE cases.debtor_pm_id = debtors_pm.id
      AND cases.assigned_agent_id = auth.uid()
    )
  )
  WITH CHECK (
    is_agent() AND EXISTS (
      SELECT 1 FROM cases
      WHERE cases.debtor_pm_id = debtors_pm.id
      AND cases.assigned_agent_id = auth.uid()
    )
  );

CREATE POLICY debtors_pm_bankuser_select ON debtors_pm
  FOR SELECT TO authenticated
  USING (
    is_bank_user() AND EXISTS (
      SELECT 1 FROM cases
      WHERE cases.debtor_pm_id = debtors_pm.id
      AND cases.bank_id = get_bank_user_bank_id()
    )
  );

-- =============================================================================
-- CASES (CRITIQUE)
-- =============================================================================

CREATE POLICY cases_admin_all ON cases
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY cases_agent_select ON cases
  FOR SELECT TO authenticated
  USING (is_agent() AND assigned_agent_id = auth.uid());

CREATE POLICY cases_agent_update ON cases
  FOR UPDATE TO authenticated
  USING (is_agent() AND assigned_agent_id = auth.uid())
  WITH CHECK (
    is_agent() AND
    assigned_agent_id = auth.uid() AND
    bank_id = (SELECT bank_id FROM cases WHERE id = cases.id) AND
    reference = (SELECT reference FROM cases WHERE id = cases.id) AND
    status != 'closed' AND closure_reason IS NULL
  );

CREATE POLICY cases_bankuser_select ON cases
  FOR SELECT TO authenticated
  USING (is_bank_user() AND bank_id = get_bank_user_bank_id());

-- =============================================================================
-- ACTIONS
-- =============================================================================

CREATE POLICY actions_admin_all ON actions
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY actions_agent_select ON actions
  FOR SELECT TO authenticated
  USING (is_agent() AND agent_has_case(case_id));

CREATE POLICY actions_agent_insert ON actions
  FOR INSERT TO authenticated
  WITH CHECK (
    is_agent() AND
    agent_has_case(case_id) AND
    created_by = auth.uid()
  );

CREATE POLICY actions_bankuser_select ON actions
  FOR SELECT TO authenticated
  USING (is_bank_user() AND case_belongs_to_user_bank(case_id));

-- =============================================================================
-- PROMISES
-- =============================================================================

CREATE POLICY promises_admin_all ON promises
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY promises_agent_select ON promises
  FOR SELECT TO authenticated
  USING (is_agent() AND agent_has_case(case_id));

CREATE POLICY promises_agent_insert ON promises
  FOR INSERT TO authenticated
  WITH CHECK (
    is_agent() AND
    agent_has_case(case_id) AND
    created_by = auth.uid()
  );

CREATE POLICY promises_agent_update ON promises
  FOR UPDATE TO authenticated
  USING (is_agent() AND agent_has_case(case_id))
  WITH CHECK (
    is_agent() AND
    agent_has_case(case_id) AND
    case_id = (SELECT case_id FROM promises WHERE id = promises.id)
  );

CREATE POLICY promises_bankuser_select ON promises
  FOR SELECT TO authenticated
  USING (is_bank_user() AND case_belongs_to_user_bank(case_id));

-- =============================================================================
-- PAYMENTS
-- =============================================================================

CREATE POLICY payments_admin_all ON payments
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY payments_agent_select ON payments
  FOR SELECT TO authenticated
  USING (is_agent() AND agent_has_case(case_id));

CREATE POLICY payments_agent_insert ON payments
  FOR INSERT TO authenticated
  WITH CHECK (
    is_agent() AND
    agent_has_case(case_id) AND
    declared_by = auth.uid() AND
    status = 'pending'
  );

CREATE POLICY payments_bankuser_select ON payments
  FOR SELECT TO authenticated
  USING (
    is_bank_user() AND
    case_belongs_to_user_bank(case_id) AND
    status = 'validated'
  );

-- =============================================================================
-- DOCUMENTS
-- =============================================================================

CREATE POLICY documents_admin_all ON documents
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY documents_agent_select ON documents
  FOR SELECT TO authenticated
  USING (
    is_agent() AND
    agent_has_case(case_id) AND
    visibility IN ('agent', 'bank')
  );

CREATE POLICY documents_agent_insert ON documents
  FOR INSERT TO authenticated
  WITH CHECK (
    is_agent() AND
    agent_has_case(case_id) AND
    uploaded_by = auth.uid() AND
    visibility != 'internal'
  );

CREATE POLICY documents_bankuser_select ON documents
  FOR SELECT TO authenticated
  USING (
    is_bank_user() AND
    case_belongs_to_user_bank(case_id) AND
    visibility = 'bank'
  );

-- =============================================================================
-- ACTION_ATTACHMENTS
-- =============================================================================

CREATE POLICY action_attachments_admin_all ON action_attachments
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY action_attachments_agent_select ON action_attachments
  FOR SELECT TO authenticated
  USING (
    is_agent() AND EXISTS (
      SELECT 1 FROM actions a
      WHERE a.id = action_attachments.action_id
      AND agent_has_case(a.case_id)
    )
  );

CREATE POLICY action_attachments_agent_insert ON action_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    is_agent() AND EXISTS (
      SELECT 1 FROM actions a
      WHERE a.id = action_attachments.action_id
      AND agent_has_case(a.case_id)
      AND a.created_by = auth.uid()
    )
  );

CREATE POLICY action_attachments_bankuser_select ON action_attachments
  FOR SELECT TO authenticated
  USING (
    is_bank_user() AND EXISTS (
      SELECT 1 FROM actions a
      WHERE a.id = action_attachments.action_id
      AND case_belongs_to_user_bank(a.case_id)
    )
  );

-- =============================================================================
-- AUDIT_LOGS (Lecture seule pour admin)
-- =============================================================================

CREATE POLICY audit_logs_admin_select ON audit_logs
  FOR SELECT TO authenticated
  USING (is_admin());

-- =============================================================================
-- CONTACT_HISTORY
-- =============================================================================

CREATE POLICY contact_history_admin_select ON contact_history
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY contact_history_agent_select ON contact_history
  FOR SELECT TO authenticated
  USING (
    is_agent() AND (
      (debtor_type = 'pp' AND EXISTS (
        SELECT 1 FROM cases c
        WHERE c.debtor_pp_id = contact_history.debtor_id
        AND c.assigned_agent_id = auth.uid()
      )) OR
      (debtor_type = 'pm' AND EXISTS (
        SELECT 1 FROM cases c
        WHERE c.debtor_pm_id = contact_history.debtor_id
        AND c.assigned_agent_id = auth.uid()
      ))
    )
  );

CREATE POLICY contact_history_bankuser_select ON contact_history
  FOR SELECT TO authenticated
  USING (
    is_bank_user() AND (
      (debtor_type = 'pp' AND EXISTS (
        SELECT 1 FROM cases c
        WHERE c.debtor_pp_id = contact_history.debtor_id
        AND c.bank_id = get_bank_user_bank_id()
      )) OR
      (debtor_type = 'pm' AND EXISTS (
        SELECT 1 FROM cases c
        WHERE c.debtor_pm_id = contact_history.debtor_id
        AND c.bank_id = get_bank_user_bank_id()
      ))
    )
  );
