-- ============================================================================
-- MIGRATION : Fonctions RPC pour remplacer les requêtes directes PostgREST
-- Date : 2026-02-17
-- Description : 59 fonctions RPC couvrant toutes les opérations CRUD
-- ============================================================================

-- ============================================================================
-- 1. AUTHENTIFICATION & PROFILS
-- ============================================================================

-- 1.1 get_user_profile : Récupère le profil utilisateur (admin, agent ou bank_user)
CREATE OR REPLACE FUNCTION get_user_profile(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  -- 1. Vérifier dans admins
  SELECT json_build_object(
    'userType', 'admin',
    'profile', row_to_json(a)
  ) INTO v_result
  FROM admins a
  WHERE a.id = p_user_id;

  IF v_result IS NOT NULL THEN
    RETURN v_result;
  END IF;

  -- 2. Vérifier dans agents
  SELECT json_build_object(
    'userType', 'agent',
    'profile', row_to_json(ag)
  ) INTO v_result
  FROM agents ag
  WHERE ag.id = p_user_id;

  IF v_result IS NOT NULL THEN
    RETURN v_result;
  END IF;

  -- 3. Vérifier dans bank_users (avec join banks)
  SELECT json_build_object(
    'userType', 'bank_user',
    'profile', json_build_object(
      'id', bu.id,
      'email', bu.email,
      'full_name', bu.full_name,
      'phone', bu.phone,
      'bank_id', bu.bank_id,
      'job_title', bu.job_title,
      'is_active', bu.is_active,
      'created_at', bu.created_at,
      'updated_at', bu.updated_at,
      'avatar_url', bu.avatar_url,
      'username', bu.username,
      'bank', row_to_json(b)
    )
  ) INTO v_result
  FROM bank_users bu
  LEFT JOIN banks b ON b.id = bu.bank_id
  WHERE bu.id = p_user_id;

  RETURN v_result; -- NULL si aucun profil trouvé
END;
$$;

-- 1.2 get_admin_emails : Emails des admins actifs (pour notifications)
CREATE OR REPLACE FUNCTION get_admin_emails()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(json_build_object('email', a.email)), '[]'::json)
    FROM admins a
    WHERE a.is_active = true
  );
END;
$$;

-- ============================================================================
-- 2. GESTION DES UTILISATEURS
-- ============================================================================

-- 2.1 list_admins
CREATE OR REPLACE FUNCTION list_admins()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  RETURN (
    SELECT COALESCE(json_agg(row_to_json(a) ORDER BY a.full_name), '[]'::json)
    FROM admins a
  );
END;
$$;

-- 2.2 create_admin
CREATE OR REPLACE FUNCTION create_admin(
  p_id uuid,
  p_email varchar,
  p_full_name varchar,
  p_phone varchar DEFAULT NULL,
  p_username varchar DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  INSERT INTO admins (id, email, full_name, phone, username)
  VALUES (p_id, p_email, p_full_name, p_phone, p_username)
  RETURNING row_to_json(admins) INTO v_result;

  RETURN v_result;
END;
$$;

-- 2.3 update_admin
CREATE OR REPLACE FUNCTION update_admin(
  p_id uuid,
  p_full_name varchar DEFAULT NULL,
  p_phone varchar DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  UPDATE admins SET
    full_name = COALESCE(p_full_name, full_name),
    phone = CASE WHEN p_phone IS NOT NULL THEN p_phone ELSE phone END,
    is_active = COALESCE(p_is_active, is_active),
    updated_at = now()
  WHERE id = p_id
  RETURNING row_to_json(admins) INTO v_result;

  RETURN v_result;
END;
$$;

-- 2.4 list_agents
CREATE OR REPLACE FUNCTION list_agents()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  RETURN (
    SELECT COALESCE(json_agg(row_to_json(a) ORDER BY a.full_name), '[]'::json)
    FROM agents a
  );
END;
$$;

-- 2.5 create_agent
CREATE OR REPLACE FUNCTION create_agent(
  p_id uuid,
  p_email varchar,
  p_full_name varchar,
  p_phone varchar DEFAULT NULL,
  p_username varchar DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  INSERT INTO agents (id, email, full_name, phone, username)
  VALUES (p_id, p_email, p_full_name, p_phone, p_username)
  RETURNING row_to_json(agents) INTO v_result;

  RETURN v_result;
END;
$$;

-- 2.6 update_agent
CREATE OR REPLACE FUNCTION update_agent(
  p_id uuid,
  p_full_name varchar DEFAULT NULL,
  p_phone varchar DEFAULT NULL,
  p_sector varchar DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  UPDATE agents SET
    full_name = COALESCE(p_full_name, full_name),
    phone = CASE WHEN p_phone IS NOT NULL THEN p_phone ELSE phone END,
    sector = CASE WHEN p_sector IS NOT NULL THEN p_sector ELSE sector END,
    is_active = COALESCE(p_is_active, is_active),
    updated_at = now()
  WHERE id = p_id
  RETURNING row_to_json(agents) INTO v_result;

  RETURN v_result;
END;
$$;

-- 2.7 list_bank_users
CREATE OR REPLACE FUNCTION list_bank_users()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  RETURN (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', bu.id,
        'email', bu.email,
        'full_name', bu.full_name,
        'phone', bu.phone,
        'bank_id', bu.bank_id,
        'job_title', bu.job_title,
        'is_active', bu.is_active,
        'created_at', bu.created_at,
        'updated_at', bu.updated_at,
        'avatar_url', bu.avatar_url,
        'username', bu.username,
        'bank', row_to_json(b)
      ) ORDER BY bu.full_name
    ), '[]'::json)
    FROM bank_users bu
    LEFT JOIN banks b ON b.id = bu.bank_id
  );
END;
$$;

-- 2.8 create_bank_user
CREATE OR REPLACE FUNCTION create_bank_user(
  p_id uuid,
  p_email varchar,
  p_full_name varchar,
  p_bank_id uuid,
  p_phone varchar DEFAULT NULL,
  p_job_title varchar DEFAULT NULL,
  p_username varchar DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  INSERT INTO bank_users (id, email, full_name, phone, bank_id, job_title, username)
  VALUES (p_id, p_email, p_full_name, p_phone, p_bank_id, p_job_title, p_username);

  SELECT json_build_object(
    'id', bu.id,
    'email', bu.email,
    'full_name', bu.full_name,
    'phone', bu.phone,
    'bank_id', bu.bank_id,
    'job_title', bu.job_title,
    'is_active', bu.is_active,
    'created_at', bu.created_at,
    'updated_at', bu.updated_at,
    'avatar_url', bu.avatar_url,
    'username', bu.username,
    'bank', row_to_json(b)
  ) INTO v_result
  FROM bank_users bu
  LEFT JOIN banks b ON b.id = bu.bank_id
  WHERE bu.id = p_id;

  RETURN v_result;
END;
$$;

-- 2.9 update_bank_user
CREATE OR REPLACE FUNCTION update_bank_user(
  p_id uuid,
  p_full_name varchar DEFAULT NULL,
  p_phone varchar DEFAULT NULL,
  p_job_title varchar DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  UPDATE bank_users SET
    full_name = COALESCE(p_full_name, full_name),
    phone = CASE WHEN p_phone IS NOT NULL THEN p_phone ELSE phone END,
    job_title = CASE WHEN p_job_title IS NOT NULL THEN p_job_title ELSE job_title END,
    is_active = COALESCE(p_is_active, is_active),
    updated_at = now()
  WHERE id = p_id;

  SELECT json_build_object(
    'id', bu.id,
    'email', bu.email,
    'full_name', bu.full_name,
    'phone', bu.phone,
    'bank_id', bu.bank_id,
    'job_title', bu.job_title,
    'is_active', bu.is_active,
    'created_at', bu.created_at,
    'updated_at', bu.updated_at,
    'avatar_url', bu.avatar_url,
    'username', bu.username,
    'bank', row_to_json(b)
  ) INTO v_result
  FROM bank_users bu
  LEFT JOIN banks b ON b.id = bu.bank_id
  WHERE bu.id = p_id;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- 3. DASHBOARD STATS
-- ============================================================================

-- 3.1 get_admin_stats
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_cases bigint;
  v_cases_in_progress bigint;
  v_active_banks bigint;
  v_active_agents bigint;
  v_cases_with_guarantee bigint;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  SELECT count(*) INTO v_total_cases FROM cases;
  SELECT count(*) INTO v_cases_in_progress FROM cases WHERE status != 'closed';
  SELECT count(*) INTO v_active_banks FROM banks WHERE is_active = true;
  SELECT count(*) INTO v_active_agents FROM agents WHERE is_active = true;
  SELECT count(*) INTO v_cases_with_guarantee FROM cases WHERE has_guarantee = true;

  RETURN json_build_object(
    'totalCases', v_total_cases,
    'casesInProgress', v_cases_in_progress,
    'activeBanks', v_active_banks,
    'activeAgents', v_active_agents,
    'casesWithGuarantee', v_cases_with_guarantee
  );
END;
$$;

-- 3.2 get_agent_stats
CREATE OR REPLACE FUNCTION get_agent_stats(p_agent_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_cases bigint;
  v_cases_to_process bigint;
  v_upcoming_promises bigint;
  v_closed_this_month bigint;
  v_first_day_of_month date;
  v_seven_days_from_now date;
BEGIN
  IF NOT (is_admin() OR (is_agent() AND auth.uid() = p_agent_id)) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  v_first_day_of_month := date_trunc('month', current_date)::date;
  v_seven_days_from_now := (current_date + interval '7 days')::date;

  SELECT count(*) INTO v_my_cases
  FROM cases WHERE assigned_agent_id = p_agent_id;

  SELECT count(*) INTO v_cases_to_process
  FROM cases
  WHERE assigned_agent_id = p_agent_id
    AND status IN ('new', 'assigned', 'in_progress');

  SELECT count(*) INTO v_upcoming_promises
  FROM promises p
  INNER JOIN cases c ON c.id = p.case_id
  WHERE c.assigned_agent_id = p_agent_id
    AND p.status = 'pending'
    AND p.due_date <= v_seven_days_from_now;

  SELECT count(*) INTO v_closed_this_month
  FROM cases
  WHERE assigned_agent_id = p_agent_id
    AND status = 'closed'
    AND closed_at >= v_first_day_of_month;

  RETURN json_build_object(
    'myCases', v_my_cases,
    'casesToProcess', v_cases_to_process,
    'upcomingPromises', v_upcoming_promises,
    'closedThisMonth', v_closed_this_month
  );
END;
$$;

-- 3.3 get_bank_user_stats
CREATE OR REPLACE FUNCTION get_bank_user_stats(p_bank_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_cases bigint;
  v_cases_in_recovery bigint;
  v_total_due numeric;
  v_total_recovered numeric;
  v_amount_recovered_this_month numeric;
  v_recovery_rate numeric;
  v_first_day_of_month date;
BEGIN
  IF NOT (is_admin() OR (is_bank_user() AND get_user_bank_id() = p_bank_id)) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  v_first_day_of_month := date_trunc('month', current_date)::date;

  SELECT count(*) INTO v_total_cases
  FROM cases WHERE bank_id = p_bank_id;

  SELECT count(*) INTO v_cases_in_recovery
  FROM cases WHERE bank_id = p_bank_id AND status != 'closed';

  -- Montant total dû
  SELECT COALESCE(SUM(
    ABS(COALESCE(amount_principal, 0)) +
    ABS(COALESCE(amount_interest, 0)) +
    ABS(COALESCE(amount_penalties, 0)) +
    ABS(COALESCE(amount_fees, 0))
  ), 0) INTO v_total_due
  FROM cases WHERE bank_id = p_bank_id;

  -- Total recouvré (paiements validés)
  SELECT COALESCE(SUM(pay.amount), 0) INTO v_total_recovered
  FROM payments pay
  INNER JOIN cases c ON c.id = pay.case_id
  WHERE c.bank_id = p_bank_id AND pay.status = 'validated';

  -- Montant recouvré ce mois
  SELECT COALESCE(SUM(pay.amount), 0) INTO v_amount_recovered_this_month
  FROM payments pay
  INNER JOIN cases c ON c.id = pay.case_id
  WHERE c.bank_id = p_bank_id
    AND pay.status = 'validated'
    AND pay.payment_date >= v_first_day_of_month;

  -- Taux de recouvrement
  IF v_total_due > 0 THEN
    v_recovery_rate := ROUND((v_total_recovered / v_total_due) * 100);
  ELSE
    v_recovery_rate := 0;
  END IF;

  RETURN json_build_object(
    'totalCases', v_total_cases,
    'casesInRecovery', v_cases_in_recovery,
    'recoveryRate', v_recovery_rate,
    'amountRecovered', v_amount_recovered_this_month
  );
END;
$$;

-- 3.4 get_recent_actions
CREATE OR REPLACE FUNCTION get_recent_actions(p_user_id uuid, p_role text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bank_id uuid;
BEGIN
  IF p_role = 'bank_user' THEN
    SELECT bank_id INTO v_bank_id FROM bank_users WHERE id = p_user_id;
  END IF;

  RETURN (
    SELECT COALESCE(json_agg(row_order), '[]'::json)
    FROM (
      SELECT json_build_object(
        'id', a.id,
        'action_type', a.action_type,
        'result', a.result,
        'action_date', a.action_date,
        'notes', a.notes,
        'case_id', a.case_id,
        'case_reference', c.reference,
        'debtor_name', COALESCE(
          dpm.company_name,
          CASE WHEN dpp.first_name IS NOT NULL THEN dpp.first_name || ' ' || dpp.last_name ELSE 'Inconnu' END
        )
      ) AS row_order
      FROM actions a
      INNER JOIN cases c ON c.id = a.case_id
      LEFT JOIN debtors_pp dpp ON dpp.id = c.debtor_pp_id
      LEFT JOIN debtors_pm dpm ON dpm.id = c.debtor_pm_id
      WHERE
        CASE
          WHEN p_role = 'agent' THEN c.assigned_agent_id = p_user_id
          WHEN p_role = 'bank_user' THEN c.bank_id = v_bank_id
          ELSE true
        END
      ORDER BY a.action_date DESC
      LIMIT 10
    ) sub
  );
END;
$$;

-- 3.5 get_upcoming_promises
CREATE OR REPLACE FUNCTION get_upcoming_promises(p_user_id uuid, p_role text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bank_id uuid;
  v_today date;
  v_seven_days date;
BEGIN
  v_today := current_date;
  v_seven_days := (current_date + interval '7 days')::date;

  IF p_role = 'bank_user' THEN
    SELECT bank_id INTO v_bank_id FROM bank_users WHERE id = p_user_id;
  END IF;

  RETURN (
    SELECT COALESCE(json_agg(row_order), '[]'::json)
    FROM (
      SELECT json_build_object(
        'id', p.id,
        'amount', p.amount,
        'due_date', p.due_date,
        'payment_method', p.payment_method,
        'status', p.status,
        'case_id', p.case_id,
        'case_reference', c.reference,
        'debtor_name', COALESCE(
          dpm.company_name,
          CASE WHEN dpp.first_name IS NOT NULL THEN dpp.first_name || ' ' || dpp.last_name ELSE 'Inconnu' END
        )
      ) AS row_order
      FROM promises p
      INNER JOIN cases c ON c.id = p.case_id
      LEFT JOIN debtors_pp dpp ON dpp.id = c.debtor_pp_id
      LEFT JOIN debtors_pm dpm ON dpm.id = c.debtor_pm_id
      WHERE p.status = 'pending'
        AND p.due_date >= v_today
        AND p.due_date <= v_seven_days
        AND CASE
          WHEN p_role = 'agent' THEN c.assigned_agent_id = p_user_id
          WHEN p_role = 'bank_user' THEN c.bank_id = v_bank_id
          ELSE true
        END
      ORDER BY p.due_date ASC
    ) sub
  );
END;
$$;

-- ============================================================================
-- 4. DOSSIERS (CASES)
-- ============================================================================

-- Helper : construire l'objet JSON d'un case avec ses relations
CREATE OR REPLACE FUNCTION _build_case_json(p_case_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'id', c.id,
    'reference', c.reference,
    'bank_reference', c.bank_reference,
    'bank_id', c.bank_id,
    'assigned_agent_id', c.assigned_agent_id,
    'debtor_pp_id', c.debtor_pp_id,
    'debtor_pm_id', c.debtor_pm_id,
    'status', c.status,
    'product_type', c.product_type,
    'contract_reference', c.contract_reference,
    'default_date', c.default_date,
    'amount_principal', c.amount_principal,
    'amount_interest', c.amount_interest,
    'amount_penalties', c.amount_penalties,
    'amount_fees', c.amount_fees,
    'closure_reason', c.closure_reason,
    'closure_notes', c.closure_notes,
    'closed_at', c.closed_at,
    'closed_by', c.closed_by,
    'notes', c.notes,
    'created_at', c.created_at,
    'updated_at', c.updated_at,
    'created_by', c.created_by,
    'phase', c.phase,
    'guarantee_type', c.guarantee_type,
    'guarantee_description', c.guarantee_description,
    'last_bank_payment_date', c.last_bank_payment_date,
    'last_bank_payment_amount', c.last_bank_payment_amount,
    'risk_level', c.risk_level,
    'internal_notes', c.internal_notes,
    'last_action_at', c.last_action_at,
    'last_action_type', c.last_action_type,
    'next_action_at', c.next_action_at,
    'next_action_type', c.next_action_type,
    'total_paid', c.total_paid,
    'remaining_balance', c.remaining_balance,
    'has_guarantee', c.has_guarantee,
    'bank', CASE WHEN b.id IS NOT NULL THEN row_to_json(b) ELSE NULL END,
    'debtor_pp', CASE WHEN dpp.id IS NOT NULL THEN row_to_json(dpp) ELSE NULL END,
    'debtor_pm', CASE WHEN dpm.id IS NOT NULL THEN row_to_json(dpm) ELSE NULL END,
    'assigned_agent', CASE WHEN ag.id IS NOT NULL THEN row_to_json(ag) ELSE NULL END
  ) INTO v_result
  FROM cases c
  LEFT JOIN banks b ON b.id = c.bank_id
  LEFT JOIN debtors_pp dpp ON dpp.id = c.debtor_pp_id
  LEFT JOIN debtors_pm dpm ON dpm.id = c.debtor_pm_id
  LEFT JOIN agents ag ON ag.id = c.assigned_agent_id
  WHERE c.id = p_case_id;

  RETURN v_result;
END;
$$;

-- 4.1 list_cases : Dossiers actifs (non clos) filtrés par rôle
CREATE OR REPLACE FUNCTION list_cases(p_user_id uuid, p_role text, p_bank_id uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_order), '[]'::json)
    FROM (
      SELECT json_build_object(
        'id', c.id,
        'reference', c.reference,
        'bank_reference', c.bank_reference,
        'bank_id', c.bank_id,
        'assigned_agent_id', c.assigned_agent_id,
        'debtor_pp_id', c.debtor_pp_id,
        'debtor_pm_id', c.debtor_pm_id,
        'status', c.status,
        'product_type', c.product_type,
        'contract_reference', c.contract_reference,
        'default_date', c.default_date,
        'amount_principal', c.amount_principal,
        'amount_interest', c.amount_interest,
        'amount_penalties', c.amount_penalties,
        'amount_fees', c.amount_fees,
        'closure_reason', c.closure_reason,
        'closure_notes', c.closure_notes,
        'closed_at', c.closed_at,
        'closed_by', c.closed_by,
        'notes', c.notes,
        'created_at', c.created_at,
        'updated_at', c.updated_at,
        'created_by', c.created_by,
        'phase', c.phase,
        'guarantee_type', c.guarantee_type,
        'guarantee_description', c.guarantee_description,
        'last_bank_payment_date', c.last_bank_payment_date,
        'last_bank_payment_amount', c.last_bank_payment_amount,
        'risk_level', c.risk_level,
        'internal_notes', c.internal_notes,
        'last_action_at', c.last_action_at,
        'last_action_type', c.last_action_type,
        'next_action_at', c.next_action_at,
        'next_action_type', c.next_action_type,
        'total_paid', c.total_paid,
        'remaining_balance', c.remaining_balance,
        'has_guarantee', c.has_guarantee,
        'bank', CASE WHEN b.id IS NOT NULL THEN row_to_json(b) ELSE NULL END,
        'debtor_pp', CASE WHEN dpp.id IS NOT NULL THEN row_to_json(dpp) ELSE NULL END,
        'debtor_pm', CASE WHEN dpm.id IS NOT NULL THEN row_to_json(dpm) ELSE NULL END,
        'assigned_agent', CASE WHEN ag.id IS NOT NULL THEN row_to_json(ag) ELSE NULL END
      ) AS row_order
      FROM cases c
      LEFT JOIN banks b ON b.id = c.bank_id
      LEFT JOIN debtors_pp dpp ON dpp.id = c.debtor_pp_id
      LEFT JOIN debtors_pm dpm ON dpm.id = c.debtor_pm_id
      LEFT JOIN agents ag ON ag.id = c.assigned_agent_id
      WHERE c.status != 'closed'
        AND CASE
          WHEN p_role = 'agent' THEN c.assigned_agent_id = p_user_id
          WHEN p_role = 'bank_user' THEN c.bank_id = p_bank_id
          ELSE true
        END
      ORDER BY c.created_at DESC
    ) sub
  );
END;
$$;

-- 4.2 list_archived_cases : Dossiers clos filtrés par rôle
CREATE OR REPLACE FUNCTION list_archived_cases(p_user_id uuid, p_role text, p_bank_id uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_order), '[]'::json)
    FROM (
      SELECT json_build_object(
        'id', c.id,
        'reference', c.reference,
        'bank_reference', c.bank_reference,
        'bank_id', c.bank_id,
        'assigned_agent_id', c.assigned_agent_id,
        'debtor_pp_id', c.debtor_pp_id,
        'debtor_pm_id', c.debtor_pm_id,
        'status', c.status,
        'product_type', c.product_type,
        'contract_reference', c.contract_reference,
        'default_date', c.default_date,
        'amount_principal', c.amount_principal,
        'amount_interest', c.amount_interest,
        'amount_penalties', c.amount_penalties,
        'amount_fees', c.amount_fees,
        'closure_reason', c.closure_reason,
        'closure_notes', c.closure_notes,
        'closed_at', c.closed_at,
        'closed_by', c.closed_by,
        'notes', c.notes,
        'created_at', c.created_at,
        'updated_at', c.updated_at,
        'created_by', c.created_by,
        'phase', c.phase,
        'guarantee_type', c.guarantee_type,
        'guarantee_description', c.guarantee_description,
        'last_bank_payment_date', c.last_bank_payment_date,
        'last_bank_payment_amount', c.last_bank_payment_amount,
        'risk_level', c.risk_level,
        'internal_notes', c.internal_notes,
        'last_action_at', c.last_action_at,
        'last_action_type', c.last_action_type,
        'next_action_at', c.next_action_at,
        'next_action_type', c.next_action_type,
        'total_paid', c.total_paid,
        'remaining_balance', c.remaining_balance,
        'has_guarantee', c.has_guarantee,
        'bank', CASE WHEN b.id IS NOT NULL THEN row_to_json(b) ELSE NULL END,
        'debtor_pp', CASE WHEN dpp.id IS NOT NULL THEN row_to_json(dpp) ELSE NULL END,
        'debtor_pm', CASE WHEN dpm.id IS NOT NULL THEN row_to_json(dpm) ELSE NULL END,
        'assigned_agent', CASE WHEN ag.id IS NOT NULL THEN row_to_json(ag) ELSE NULL END
      ) AS row_order
      FROM cases c
      LEFT JOIN banks b ON b.id = c.bank_id
      LEFT JOIN debtors_pp dpp ON dpp.id = c.debtor_pp_id
      LEFT JOIN debtors_pm dpm ON dpm.id = c.debtor_pm_id
      LEFT JOIN agents ag ON ag.id = c.assigned_agent_id
      WHERE c.status = 'closed'
        AND CASE
          WHEN p_role = 'bank_user' THEN c.bank_id = p_bank_id
          ELSE true
        END
      ORDER BY c.closed_at DESC
    ) sub
  );
END;
$$;

-- 4.3 create_case
CREATE OR REPLACE FUNCTION create_case(p_data json)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  INSERT INTO cases (
    reference, bank_reference, bank_id, assigned_agent_id,
    debtor_pp_id, debtor_pm_id, product_type, contract_reference,
    default_date, amount_principal, amount_interest, amount_penalties,
    amount_fees, notes, phase, guarantee_type, guarantee_description,
    last_bank_payment_date, last_bank_payment_amount, risk_level,
    internal_notes, created_by
  )
  VALUES (
    COALESCE(p_data->>'reference', generate_case_reference()),
    p_data->>'bank_reference',
    (p_data->>'bank_id')::uuid,
    (p_data->>'assigned_agent_id')::uuid,
    (p_data->>'debtor_pp_id')::uuid,
    (p_data->>'debtor_pm_id')::uuid,
    p_data->>'product_type',
    p_data->>'contract_reference',
    (p_data->>'default_date')::date,
    COALESCE((p_data->>'amount_principal')::numeric, 0),
    COALESCE((p_data->>'amount_interest')::numeric, 0),
    COALESCE((p_data->>'amount_penalties')::numeric, 0),
    COALESCE((p_data->>'amount_fees')::numeric, 0),
    p_data->>'notes',
    COALESCE((p_data->>'phase')::case_phase, 'amicable'),
    p_data->>'guarantee_type',
    p_data->>'guarantee_description',
    (p_data->>'last_bank_payment_date')::date,
    (p_data->>'last_bank_payment_amount')::numeric,
    p_data->>'risk_level',
    p_data->>'internal_notes',
    auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN _build_case_json(v_id);
END;
$$;

-- 4.4 get_case_detail
CREATE OR REPLACE FUNCTION get_case_detail(p_case_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérification d'accès : admin, agent assigné ou bank_user de la même banque
  IF NOT (
    is_admin()
    OR (is_agent() AND EXISTS (SELECT 1 FROM cases WHERE id = p_case_id AND assigned_agent_id = auth.uid()))
    OR (is_bank_user() AND EXISTS (SELECT 1 FROM cases WHERE id = p_case_id AND bank_id = get_user_bank_id()))
  ) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  RETURN _build_case_json(p_case_id);
END;
$$;

-- 4.5 assign_agent
CREATE OR REPLACE FUNCTION assign_agent(p_case_id uuid, p_agent_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  UPDATE cases SET
    assigned_agent_id = p_agent_id,
    status = CASE WHEN p_agent_id IS NOT NULL THEN 'assigned'::case_status ELSE 'new'::case_status END,
    updated_at = now()
  WHERE id = p_case_id;

  RETURN _build_case_json(p_case_id);
END;
$$;

-- 4.6 update_case
CREATE OR REPLACE FUNCTION update_case(p_case_id uuid, p_data json)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    is_admin()
    OR (is_agent() AND EXISTS (SELECT 1 FROM cases WHERE id = p_case_id AND assigned_agent_id = auth.uid()))
  ) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  UPDATE cases SET
    phase = COALESCE((p_data->>'phase')::case_phase, phase),
    default_date = CASE WHEN p_data ? 'default_date' THEN (p_data->>'default_date')::date ELSE default_date END,
    product_type = CASE WHEN p_data ? 'product_type' THEN p_data->>'product_type' ELSE product_type END,
    contract_reference = CASE WHEN p_data ? 'contract_reference' THEN p_data->>'contract_reference' ELSE contract_reference END,
    risk_level = CASE WHEN p_data ? 'risk_level' THEN p_data->>'risk_level' ELSE risk_level END,
    amount_principal = CASE WHEN p_data ? 'amount_principal' THEN (p_data->>'amount_principal')::numeric ELSE amount_principal END,
    amount_interest = CASE WHEN p_data ? 'amount_interest' THEN (p_data->>'amount_interest')::numeric ELSE amount_interest END,
    amount_penalties = CASE WHEN p_data ? 'amount_penalties' THEN (p_data->>'amount_penalties')::numeric ELSE amount_penalties END,
    amount_fees = CASE WHEN p_data ? 'amount_fees' THEN (p_data->>'amount_fees')::numeric ELSE amount_fees END,
    guarantee_description = CASE WHEN p_data ? 'guarantee_description' THEN p_data->>'guarantee_description' ELSE guarantee_description END,
    notes = CASE WHEN p_data ? 'notes' THEN p_data->>'notes' ELSE notes END,
    internal_notes = CASE WHEN p_data ? 'internal_notes' THEN p_data->>'internal_notes' ELSE internal_notes END,
    updated_at = now()
  WHERE id = p_case_id;

  RETURN _build_case_json(p_case_id);
END;
$$;

-- ============================================================================
-- 5. DÉTAILS DOSSIER : Actions, Promesses, Paiements, Documents
-- ============================================================================

-- 5.1 list_case_actions
CREATE OR REPLACE FUNCTION list_case_actions(p_case_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(a) ORDER BY a.action_date DESC), '[]'::json)
    FROM actions a
    WHERE a.case_id = p_case_id
  );
END;
$$;

-- 5.2 list_case_promises
CREATE OR REPLACE FUNCTION list_case_promises(p_case_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(p) ORDER BY p.due_date DESC), '[]'::json)
    FROM promises p
    WHERE p.case_id = p_case_id
  );
END;
$$;

-- 5.3 list_case_payments
CREATE OR REPLACE FUNCTION list_case_payments(p_case_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(pay) ORDER BY pay.payment_date DESC), '[]'::json)
    FROM payments pay
    WHERE pay.case_id = p_case_id
  );
END;
$$;

-- 5.4 list_case_documents
CREATE OR REPLACE FUNCTION list_case_documents(p_case_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(d) ORDER BY d.uploaded_at DESC), '[]'::json)
    FROM documents d
    WHERE d.case_id = p_case_id
  );
END;
$$;

-- 5.5 create_action
CREATE OR REPLACE FUNCTION create_action(
  p_case_id uuid,
  p_action_type action_type,
  p_action_date timestamptz,
  p_result action_result,
  p_notes text DEFAULT NULL,
  p_next_action_type action_type DEFAULT NULL,
  p_next_action_date date DEFAULT NULL,
  p_next_action_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT (is_admin() OR is_agent()) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  INSERT INTO actions (case_id, action_type, action_date, result, notes, next_action_type, next_action_date, next_action_notes, created_by)
  VALUES (p_case_id, p_action_type, p_action_date, p_result, p_notes, p_next_action_type, p_next_action_date, p_next_action_notes, auth.uid())
  RETURNING row_to_json(actions) INTO v_result;

  RETURN v_result;
END;
$$;

-- 5.6 create_promise
CREATE OR REPLACE FUNCTION create_promise(
  p_case_id uuid,
  p_amount numeric,
  p_due_date date,
  p_payment_method varchar DEFAULT NULL,
  p_reference varchar DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT (is_admin() OR is_agent()) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  INSERT INTO promises (case_id, amount, due_date, payment_method, reference, notes, created_by)
  VALUES (p_case_id, p_amount, p_due_date, p_payment_method, p_reference, p_notes, auth.uid())
  RETURNING row_to_json(promises) INTO v_result;

  RETURN v_result;
END;
$$;

-- 5.7 update_promise_status
CREATE OR REPLACE FUNCTION update_promise_status(
  p_promise_id uuid,
  p_status promise_status,
  p_status_notes text DEFAULT NULL,
  p_new_due_date date DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT (is_admin() OR is_agent()) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  UPDATE promises SET
    status = p_status,
    status_changed_at = now(),
    status_changed_by = auth.uid(),
    status_notes = p_status_notes,
    due_date = CASE WHEN p_status = 'rescheduled' AND p_new_due_date IS NOT NULL THEN p_new_due_date ELSE due_date END
  WHERE id = p_promise_id
  RETURNING row_to_json(promises) INTO v_result;

  RETURN v_result;
END;
$$;

-- 5.8 delete_promise
CREATE OR REPLACE FUNCTION delete_promise(p_promise_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  DELETE FROM promises WHERE id = p_promise_id;
END;
$$;

-- 5.9 create_payment
CREATE OR REPLACE FUNCTION create_payment(
  p_case_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_payment_method varchar DEFAULT NULL,
  p_transaction_reference varchar DEFAULT NULL,
  p_receipt_path text DEFAULT NULL,
  p_is_admin boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
  v_user_id uuid;
BEGIN
  IF NOT (is_admin() OR is_agent()) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  v_user_id := auth.uid();

  IF p_is_admin AND is_admin() THEN
    INSERT INTO payments (case_id, amount, payment_date, payment_method, transaction_reference, receipt_path, declared_by, status, validated_by, validated_at)
    VALUES (p_case_id, p_amount, p_payment_date, p_payment_method, p_transaction_reference, p_receipt_path, v_user_id, 'validated', v_user_id, now())
    RETURNING row_to_json(payments) INTO v_result;
  ELSE
    INSERT INTO payments (case_id, amount, payment_date, payment_method, transaction_reference, receipt_path, declared_by)
    VALUES (p_case_id, p_amount, p_payment_date, p_payment_method, p_transaction_reference, p_receipt_path, v_user_id)
    RETURNING row_to_json(payments) INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;

-- 5.10 validate_payment
CREATE OR REPLACE FUNCTION validate_payment(
  p_payment_id uuid,
  p_approved boolean,
  p_rejection_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  IF p_approved THEN
    UPDATE payments SET
      status = 'validated',
      validated_by = auth.uid(),
      validated_at = now()
    WHERE id = p_payment_id
    RETURNING row_to_json(payments) INTO v_result;
  ELSE
    UPDATE payments SET
      status = 'rejected',
      validated_by = auth.uid(),
      validated_at = now(),
      rejection_reason = p_rejection_reason
    WHERE id = p_payment_id
    RETURNING row_to_json(payments) INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- 6. BANQUES
-- ============================================================================

-- 6.1 list_banks
CREATE OR REPLACE FUNCTION list_banks()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(b) ORDER BY b.name), '[]'::json)
    FROM banks b
  );
END;
$$;

-- 6.2 get_bank
CREATE OR REPLACE FUNCTION get_bank(p_bank_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT row_to_json(b) FROM banks b WHERE b.id = p_bank_id
  );
END;
$$;

-- 6.3 create_bank
CREATE OR REPLACE FUNCTION create_bank(p_data json)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  INSERT INTO banks (code, name, address, city, phone, email, is_active, logo_url)
  VALUES (
    p_data->>'code',
    p_data->>'name',
    p_data->>'address',
    p_data->>'city',
    p_data->>'phone',
    p_data->>'email',
    COALESCE((p_data->>'is_active')::boolean, true),
    p_data->>'logo_url'
  )
  RETURNING row_to_json(banks) INTO v_result;

  RETURN v_result;
END;
$$;

-- 6.4 update_bank
CREATE OR REPLACE FUNCTION update_bank(p_bank_id uuid, p_data json)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  UPDATE banks SET
    code = CASE WHEN p_data ? 'code' THEN p_data->>'code' ELSE code END,
    name = CASE WHEN p_data ? 'name' THEN p_data->>'name' ELSE name END,
    address = CASE WHEN p_data ? 'address' THEN p_data->>'address' ELSE address END,
    city = CASE WHEN p_data ? 'city' THEN p_data->>'city' ELSE city END,
    phone = CASE WHEN p_data ? 'phone' THEN p_data->>'phone' ELSE phone END,
    email = CASE WHEN p_data ? 'email' THEN p_data->>'email' ELSE email END,
    is_active = CASE WHEN p_data ? 'is_active' THEN (p_data->>'is_active')::boolean ELSE is_active END,
    logo_url = CASE WHEN p_data ? 'logo_url' THEN p_data->>'logo_url' ELSE logo_url END,
    updated_at = now()
  WHERE id = p_bank_id
  RETURNING row_to_json(banks) INTO v_result;

  RETURN v_result;
END;
$$;

-- 6.5 delete_bank
CREATE OR REPLACE FUNCTION delete_bank(p_bank_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  DELETE FROM banks WHERE id = p_bank_id;
END;
$$;

-- 6.6 update_bank_profile (par un bank_user)
CREATE OR REPLACE FUNCTION update_bank_profile(p_bank_id uuid, p_data json)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT (is_admin() OR (is_bank_user() AND get_user_bank_id() = p_bank_id)) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  UPDATE banks SET
    name = CASE WHEN p_data ? 'name' THEN p_data->>'name' ELSE name END,
    address = CASE WHEN p_data ? 'address' THEN p_data->>'address' ELSE address END,
    city = CASE WHEN p_data ? 'city' THEN p_data->>'city' ELSE city END,
    phone = CASE WHEN p_data ? 'phone' THEN p_data->>'phone' ELSE phone END,
    email = CASE WHEN p_data ? 'email' THEN p_data->>'email' ELSE email END,
    logo_url = CASE WHEN p_data ? 'logo_url' THEN p_data->>'logo_url' ELSE logo_url END,
    updated_at = now()
  WHERE id = p_bank_id
  RETURNING row_to_json(banks) INTO v_result;

  RETURN v_result;
END;
$$;

-- 6.7 update_bank_user_profile
CREATE OR REPLACE FUNCTION update_bank_user_profile(p_user_id uuid, p_data json)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT (is_admin() OR auth.uid() = p_user_id) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  UPDATE bank_users SET
    full_name = CASE WHEN p_data ? 'full_name' THEN p_data->>'full_name' ELSE full_name END,
    phone = CASE WHEN p_data ? 'phone' THEN p_data->>'phone' ELSE phone END,
    job_title = CASE WHEN p_data ? 'job_title' THEN p_data->>'job_title' ELSE job_title END,
    avatar_url = CASE WHEN p_data ? 'avatar_url' THEN p_data->>'avatar_url' ELSE avatar_url END,
    updated_at = now()
  WHERE id = p_user_id
  RETURNING row_to_json(bank_users) INTO v_result;

  RETURN v_result;
END;
$$;

-- 6.8 toggle_bank_status
CREATE OR REPLACE FUNCTION toggle_bank_status(p_bank_id uuid, p_is_active boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  UPDATE banks SET
    is_active = p_is_active,
    updated_at = now()
  WHERE id = p_bank_id
  RETURNING row_to_json(banks) INTO v_result;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- 7. DÉBITEURS
-- ============================================================================

-- 7.1 list_debtors_pp
CREATE OR REPLACE FUNCTION list_debtors_pp()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(d) ORDER BY d.last_name), '[]'::json)
    FROM debtors_pp d
  );
END;
$$;

-- 7.2 list_debtors_pm
CREATE OR REPLACE FUNCTION list_debtors_pm()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(d) ORDER BY d.company_name), '[]'::json)
    FROM debtors_pm d
  );
END;
$$;

-- 7.3 list_debtors_pp_by_bank
CREATE OR REPLACE FUNCTION list_debtors_pp_by_bank(p_bank_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(d) ORDER BY d.last_name), '[]'::json)
    FROM debtors_pp d
    WHERE d.id IN (
      SELECT DISTINCT c.debtor_pp_id
      FROM cases c
      WHERE c.bank_id = p_bank_id AND c.debtor_pp_id IS NOT NULL
    )
  );
END;
$$;

-- 7.4 list_debtors_pm_by_bank
CREATE OR REPLACE FUNCTION list_debtors_pm_by_bank(p_bank_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(d) ORDER BY d.company_name), '[]'::json)
    FROM debtors_pm d
    WHERE d.id IN (
      SELECT DISTINCT c.debtor_pm_id
      FROM cases c
      WHERE c.bank_id = p_bank_id AND c.debtor_pm_id IS NOT NULL
    )
  );
END;
$$;

-- 7.5 get_debtor_counts_by_bank
CREATE OR REPLACE FUNCTION get_debtor_counts_by_bank()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_object_agg(
      bank_id,
      json_build_object('pp', pp_count, 'pm', pm_count)
    ), '{}'::json)
    FROM (
      SELECT
        c.bank_id,
        COUNT(DISTINCT c.debtor_pp_id) FILTER (WHERE c.debtor_pp_id IS NOT NULL) AS pp_count,
        COUNT(DISTINCT c.debtor_pm_id) FILTER (WHERE c.debtor_pm_id IS NOT NULL) AS pm_count
      FROM cases c
      GROUP BY c.bank_id
    ) sub
  );
END;
$$;

-- 7.6 create_debtor_pp
CREATE OR REPLACE FUNCTION create_debtor_pp(p_data json)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  INSERT INTO debtors_pp (
    first_name, last_name, id_type, id_number,
    phone_primary, phone_secondary, email,
    address_street, address_city, address_region,
    employer, occupation, notes, date_of_birth,
    address_work_street, address_work_city, address_work_region,
    alt_contact_name, alt_contact_relation, alt_contact_phone,
    photo_url, created_by
  )
  VALUES (
    p_data->>'first_name',
    p_data->>'last_name',
    p_data->>'id_type',
    p_data->>'id_number',
    p_data->>'phone_primary',
    p_data->>'phone_secondary',
    p_data->>'email',
    p_data->>'address_street',
    p_data->>'address_city',
    p_data->>'address_region',
    p_data->>'employer',
    p_data->>'occupation',
    p_data->>'notes',
    (p_data->>'date_of_birth')::date,
    p_data->>'address_work_street',
    p_data->>'address_work_city',
    p_data->>'address_work_region',
    p_data->>'alt_contact_name',
    p_data->>'alt_contact_relation',
    p_data->>'alt_contact_phone',
    p_data->>'photo_url',
    auth.uid()
  )
  RETURNING row_to_json(debtors_pp) INTO v_result;

  RETURN v_result;
END;
$$;

-- 7.7 create_debtor_pm
CREATE OR REPLACE FUNCTION create_debtor_pm(p_data json)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  INSERT INTO debtors_pm (
    company_name, trade_name, rc_number, nif,
    legal_rep_name, legal_rep_title, legal_rep_phone,
    phone_primary, phone_secondary, email, website,
    address_street, address_city, address_region,
    sector_activity, notes,
    alt_contact_name, alt_contact_relation, alt_contact_phone,
    created_by
  )
  VALUES (
    p_data->>'company_name',
    p_data->>'trade_name',
    p_data->>'rc_number',
    p_data->>'nif',
    p_data->>'legal_rep_name',
    p_data->>'legal_rep_title',
    p_data->>'legal_rep_phone',
    p_data->>'phone_primary',
    p_data->>'phone_secondary',
    p_data->>'email',
    p_data->>'website',
    p_data->>'address_street',
    p_data->>'address_city',
    p_data->>'address_region',
    p_data->>'sector_activity',
    p_data->>'notes',
    p_data->>'alt_contact_name',
    p_data->>'alt_contact_relation',
    p_data->>'alt_contact_phone',
    auth.uid()
  )
  RETURNING row_to_json(debtors_pm) INTO v_result;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- 8. IMPORTS
-- ============================================================================

-- 8.1 list_imports
CREATE OR REPLACE FUNCTION list_imports()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  RETURN (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', i.id,
        'bank_id', i.bank_id,
        'uploaded_by', i.uploaded_by,
        'file_path', i.file_path,
        'file_name', i.file_name,
        'status', i.status,
        'error_message', i.error_message,
        'total_rows', i.total_rows,
        'valid_rows', i.valid_rows,
        'error_rows', i.error_rows,
        'warning_rows', i.warning_rows,
        'created_at', i.created_at,
        'processed_at', i.processed_at,
        'approved_at', i.approved_at,
        'approved_by', i.approved_by,
        'bank', row_to_json(b)
      ) ORDER BY i.created_at DESC
    ), '[]'::json)
    FROM imports i
    LEFT JOIN banks b ON b.id = i.bank_id
  );
END;
$$;

-- 8.2 get_import
CREATE OR REPLACE FUNCTION get_import(p_import_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  RETURN (
    SELECT json_build_object(
      'id', i.id,
      'bank_id', i.bank_id,
      'uploaded_by', i.uploaded_by,
      'file_path', i.file_path,
      'file_name', i.file_name,
      'status', i.status,
      'error_message', i.error_message,
      'total_rows', i.total_rows,
      'valid_rows', i.valid_rows,
      'error_rows', i.error_rows,
      'warning_rows', i.warning_rows,
      'created_at', i.created_at,
      'processed_at', i.processed_at,
      'approved_at', i.approved_at,
      'approved_by', i.approved_by,
      'bank', row_to_json(b)
    )
    FROM imports i
    LEFT JOIN banks b ON b.id = i.bank_id
    WHERE i.id = p_import_id
  );
END;
$$;

-- 8.3 list_import_rows
CREATE OR REPLACE FUNCTION list_import_rows(p_import_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  RETURN (
    SELECT COALESCE(json_agg(row_to_json(r) ORDER BY r.row_number), '[]'::json)
    FROM import_rows r
    WHERE r.import_id = p_import_id
  );
END;
$$;

-- 8.4 create_import
CREATE OR REPLACE FUNCTION create_import(
  p_bank_id uuid,
  p_uploaded_by uuid,
  p_file_name varchar
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  INSERT INTO imports (bank_id, uploaded_by, file_path, file_name, status)
  VALUES (p_bank_id, p_uploaded_by, '', p_file_name, 'uploaded')
  RETURNING row_to_json(imports) INTO v_result;

  RETURN v_result;
END;
$$;

-- 8.5 delete_import
CREATE OR REPLACE FUNCTION delete_import(p_import_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  DELETE FROM imports WHERE id = p_import_id;
END;
$$;

-- 8.6 update_import_file_path
CREATE OR REPLACE FUNCTION update_import_file_path(p_import_id uuid, p_file_path text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  UPDATE imports SET file_path = p_file_path
  WHERE id = p_import_id;

  -- Retourner avec join banks
  SELECT json_build_object(
    'id', i.id,
    'bank_id', i.bank_id,
    'uploaded_by', i.uploaded_by,
    'file_path', i.file_path,
    'file_name', i.file_name,
    'status', i.status,
    'error_message', i.error_message,
    'total_rows', i.total_rows,
    'valid_rows', i.valid_rows,
    'error_rows', i.error_rows,
    'warning_rows', i.warning_rows,
    'created_at', i.created_at,
    'processed_at', i.processed_at,
    'approved_at', i.approved_at,
    'approved_by', i.approved_by,
    'bank', row_to_json(b)
  ) INTO v_result
  FROM imports i
  LEFT JOIN banks b ON b.id = i.bank_id
  WHERE i.id = p_import_id;

  RETURN v_result;
END;
$$;

-- 8.7 toggle_import_row_approval
CREATE OR REPLACE FUNCTION toggle_import_row_approval(p_row_id uuid, p_is_approved boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  UPDATE import_rows SET is_approved = p_is_approved WHERE id = p_row_id;
END;
$$;

-- 8.8 approve_all_valid_rows
CREATE OR REPLACE FUNCTION approve_all_valid_rows(p_import_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  UPDATE import_rows
  SET is_approved = true
  WHERE import_id = p_import_id
    AND (errors IS NULL OR errors = '[]'::jsonb);
END;
$$;

-- 8.9 update_import_row
CREATE OR REPLACE FUNCTION update_import_row(p_row_id uuid, p_proposed_json jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  UPDATE import_rows SET proposed_json = p_proposed_json WHERE id = p_row_id;
END;
$$;

-- 8.10 get_cases_by_import
CREATE OR REPLACE FUNCTION get_cases_by_import(p_import_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  RETURN (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', c.id,
        'reference', c.reference,
        'bank_reference', c.bank_reference,
        'bank_id', c.bank_id,
        'assigned_agent_id', c.assigned_agent_id,
        'debtor_pp_id', c.debtor_pp_id,
        'debtor_pm_id', c.debtor_pm_id,
        'status', c.status,
        'product_type', c.product_type,
        'contract_reference', c.contract_reference,
        'default_date', c.default_date,
        'amount_principal', c.amount_principal,
        'amount_interest', c.amount_interest,
        'amount_penalties', c.amount_penalties,
        'amount_fees', c.amount_fees,
        'notes', c.notes,
        'created_at', c.created_at,
        'updated_at', c.updated_at,
        'phase', c.phase,
        'total_paid', c.total_paid,
        'remaining_balance', c.remaining_balance,
        'has_guarantee', c.has_guarantee,
        'bank', json_build_object('id', b.id, 'name', b.name),
        'debtor_pp', CASE
          WHEN dpp.id IS NOT NULL THEN json_build_object('id', dpp.id, 'first_name', dpp.first_name, 'last_name', dpp.last_name)
          ELSE NULL
        END,
        'debtor_pm', CASE
          WHEN dpm.id IS NOT NULL THEN json_build_object('id', dpm.id, 'company_name', dpm.company_name)
          ELSE NULL
        END
      ) ORDER BY c.created_at ASC
    ), '[]'::json)
    FROM audit_logs al
    INNER JOIN cases c ON c.id = al.record_id
    LEFT JOIN banks b ON b.id = c.bank_id
    LEFT JOIN debtors_pp dpp ON dpp.id = c.debtor_pp_id
    LEFT JOIN debtors_pm dpm ON dpm.id = c.debtor_pm_id
    WHERE al.table_name = 'cases'
      AND al.operation = 'INSERT'
      AND al.new_data @> jsonb_build_object('source', 'import', 'import_id', p_import_id::text)
  );
END;
$$;

-- ============================================================================
-- 9. RAPPORTS
-- ============================================================================

-- 9.1 get_bank_report_cases
CREATE OR REPLACE FUNCTION get_bank_report_cases(p_bank_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_order), '[]'::json)
    FROM (
      SELECT json_build_object(
        'id', c.id,
        'reference', c.reference,
        'bank_reference', c.bank_reference,
        'bank_id', c.bank_id,
        'assigned_agent_id', c.assigned_agent_id,
        'debtor_pp_id', c.debtor_pp_id,
        'debtor_pm_id', c.debtor_pm_id,
        'status', c.status,
        'product_type', c.product_type,
        'contract_reference', c.contract_reference,
        'default_date', c.default_date,
        'amount_principal', c.amount_principal,
        'amount_interest', c.amount_interest,
        'amount_penalties', c.amount_penalties,
        'amount_fees', c.amount_fees,
        'closure_reason', c.closure_reason,
        'closure_notes', c.closure_notes,
        'closed_at', c.closed_at,
        'closed_by', c.closed_by,
        'notes', c.notes,
        'created_at', c.created_at,
        'updated_at', c.updated_at,
        'created_by', c.created_by,
        'phase', c.phase,
        'guarantee_type', c.guarantee_type,
        'guarantee_description', c.guarantee_description,
        'last_bank_payment_date', c.last_bank_payment_date,
        'last_bank_payment_amount', c.last_bank_payment_amount,
        'risk_level', c.risk_level,
        'internal_notes', c.internal_notes,
        'last_action_at', c.last_action_at,
        'last_action_type', c.last_action_type,
        'next_action_at', c.next_action_at,
        'next_action_type', c.next_action_type,
        'total_paid', c.total_paid,
        'remaining_balance', c.remaining_balance,
        'has_guarantee', c.has_guarantee,
        'bank', CASE WHEN b.id IS NOT NULL THEN row_to_json(b) ELSE NULL END,
        'debtor_pp', CASE WHEN dpp.id IS NOT NULL THEN row_to_json(dpp) ELSE NULL END,
        'debtor_pm', CASE WHEN dpm.id IS NOT NULL THEN row_to_json(dpm) ELSE NULL END,
        'assigned_agent', CASE WHEN ag.id IS NOT NULL THEN row_to_json(ag) ELSE NULL END
      ) AS row_order
      FROM cases c
      LEFT JOIN banks b ON b.id = c.bank_id
      LEFT JOIN debtors_pp dpp ON dpp.id = c.debtor_pp_id
      LEFT JOIN debtors_pm dpm ON dpm.id = c.debtor_pm_id
      LEFT JOIN agents ag ON ag.id = c.assigned_agent_id
      WHERE c.bank_id = p_bank_id
      ORDER BY c.created_at DESC
    ) sub
  );
END;
$$;

-- 9.2 get_bank_report_stats
CREATE OR REPLACE FUNCTION get_bank_report_stats(p_bank_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'totalCases', count(*),
      'byStatus', (
        SELECT COALESCE(json_object_agg(status, cnt), '{}'::json)
        FROM (
          SELECT status::text, count(*) AS cnt
          FROM cases WHERE bank_id = p_bank_id
          GROUP BY status
        ) s
      ),
      'totalAmount', COALESCE(SUM(
        ABS(COALESCE(amount_principal, 0)) +
        ABS(COALESCE(amount_interest, 0)) +
        ABS(COALESCE(amount_penalties, 0)) +
        ABS(COALESCE(amount_fees, 0))
      ), 0),
      'totalPrincipal', COALESCE(SUM(ABS(COALESCE(amount_principal, 0))), 0),
      'totalInterest', COALESCE(SUM(ABS(COALESCE(amount_interest, 0))), 0),
      'totalPenalties', COALESCE(SUM(ABS(COALESCE(amount_penalties, 0))), 0),
      'totalFees', COALESCE(SUM(ABS(COALESCE(amount_fees, 0))), 0),
      'totalPaid', COALESCE(SUM(COALESCE(total_paid, 0)), 0),
      'totalRemainingBalance', COALESCE(SUM(COALESCE(remaining_balance,
        ABS(COALESCE(amount_principal, 0)) +
        ABS(COALESCE(amount_interest, 0)) +
        ABS(COALESCE(amount_penalties, 0)) +
        ABS(COALESCE(amount_fees, 0))
      )), 0)
    )
    FROM cases
    WHERE bank_id = p_bank_id
  );
END;
$$;
