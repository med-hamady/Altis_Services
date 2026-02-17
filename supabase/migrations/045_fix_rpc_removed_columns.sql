-- ============================================================================
-- MIGRATION : Adapter toutes les fonctions RPC aux colonnes supprimées
-- Date : 2026-02-17
-- Colonnes supprimées depuis les migrations 040-043 :
--   cases      : bank_reference, product_type, contract_reference,
--                guarantee_type, guarantee_description, last_bank_payment_date,
--                last_bank_payment_amount, risk_level, internal_notes
--   bank_users : avatar_url
--   promises   : payment_method, reference
-- ============================================================================


-- ============================================================================
-- 1. list_cases
-- ============================================================================
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
        'bank_id', c.bank_id,
        'assigned_agent_id', c.assigned_agent_id,
        'debtor_pp_id', c.debtor_pp_id,
        'debtor_pm_id', c.debtor_pm_id,
        'status', c.status,
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


-- ============================================================================
-- 2. get_user_profile (retire avatar_url de la section bank_users)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_profile(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  -- 1. admins
  SELECT json_build_object('userType', 'admin', 'profile', row_to_json(a))
  INTO v_result FROM admins a WHERE a.id = p_user_id;
  IF v_result IS NOT NULL THEN RETURN v_result; END IF;

  -- 2. agents
  SELECT json_build_object('userType', 'agent', 'profile', row_to_json(ag))
  INTO v_result FROM agents ag WHERE ag.id = p_user_id;
  IF v_result IS NOT NULL THEN RETURN v_result; END IF;

  -- 3. bank_users (avec join banks)
  SELECT json_build_object('userType', 'bank_user', 'profile', json_build_object(
    'id', bu.id,
    'email', bu.email,
    'full_name', bu.full_name,
    'phone', bu.phone,
    'bank_id', bu.bank_id,
    'job_title', bu.job_title,
    'is_active', bu.is_active,
    'created_at', bu.created_at,
    'updated_at', bu.updated_at,
    'username', bu.username,
    'bank', row_to_json(b)
  )) INTO v_result
  FROM bank_users bu
  LEFT JOIN banks b ON b.id = bu.bank_id
  WHERE bu.id = p_user_id;

  RETURN v_result;
END;
$$;


-- ============================================================================
-- 3. list_bank_users (retire avatar_url)
-- ============================================================================
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
        'username', bu.username,
        'bank', row_to_json(b)
      ) ORDER BY bu.full_name
    ), '[]'::json)
    FROM bank_users bu
    LEFT JOIN banks b ON b.id = bu.bank_id
  );
END;
$$;


-- ============================================================================
-- 4. create_bank_user (retire avatar_url du SELECT de retour)
-- ============================================================================
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

  INSERT INTO bank_users (id, email, full_name, bank_id, phone, job_title, username)
  VALUES (p_id, p_email, p_full_name, p_bank_id, p_phone, p_job_title, p_username);

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
-- 5. update_bank_user (retire avatar_url du SELECT de retour)
-- ============================================================================
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
-- 6. get_upcoming_promises (retire payment_method)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_upcoming_promises(p_user_id uuid, p_role text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (is_admin() OR is_agent() OR is_bank_user()) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  RETURN (
    SELECT COALESCE(json_agg(row_order), '[]'::json)
    FROM (
      SELECT json_build_object(
        'id', p.id,
        'amount', p.amount,
        'due_date', p.due_date,
        'status', p.status,
        'case_id', p.case_id,
        'case_reference', c.reference,
        'debtor_name', COALESCE(
          dpm.company_name,
          CASE WHEN dpp.first_name IS NOT NULL
            THEN dpp.first_name || ' ' || dpp.last_name
            ELSE 'Inconnu'
          END
        )
      ) AS row_order
      FROM promises p
      JOIN cases c ON c.id = p.case_id
      LEFT JOIN debtors_pp dpp ON dpp.id = c.debtor_pp_id
      LEFT JOIN debtors_pm dpm ON dpm.id = c.debtor_pm_id
      WHERE p.status = 'pending'
        AND p.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
        AND CASE
          WHEN p_role = 'agent' THEN c.assigned_agent_id = p_user_id
          WHEN p_role = 'bank_user' THEN c.bank_id = (
            SELECT bank_id FROM bank_users WHERE id = p_user_id LIMIT 1
          )
          ELSE true
        END
      ORDER BY p.due_date ASC
    ) sub
  );
END;
$$;


-- ============================================================================
-- 7. get_cases_by_import (retire bank_reference, product_type, contract_reference)
-- ============================================================================
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
        'bank_id', c.bank_id,
        'assigned_agent_id', c.assigned_agent_id,
        'debtor_pp_id', c.debtor_pp_id,
        'debtor_pm_id', c.debtor_pm_id,
        'status', c.status,
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
          WHEN dpp.id IS NOT NULL THEN json_build_object(
            'id', dpp.id, 'first_name', dpp.first_name, 'last_name', dpp.last_name
          )
          ELSE NULL
        END,
        'debtor_pm', CASE
          WHEN dpm.id IS NOT NULL THEN json_build_object(
            'id', dpm.id, 'company_name', dpm.company_name
          )
          ELSE NULL
        END
      ) ORDER BY c.created_at ASC
    ), '[]'::json)
    FROM cases c
    LEFT JOIN banks b ON b.id = c.bank_id
    LEFT JOIN debtors_pp dpp ON dpp.id = c.debtor_pp_id
    LEFT JOIN debtors_pm dpm ON dpm.id = c.debtor_pm_id
    WHERE c.id IN (
      SELECT case_id FROM import_rows WHERE import_id = p_import_id AND case_id IS NOT NULL
    )
  );
END;
$$;


-- ============================================================================
-- 8. get_bank_report_cases (retire les 9 colonnes cases supprimées)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_bank_report_cases(p_bank_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (is_admin() OR (is_bank_user() AND get_user_bank_id() = p_bank_id)) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  RETURN (
    SELECT COALESCE(json_agg(row_order), '[]'::json)
    FROM (
      SELECT json_build_object(
        'id', c.id,
        'reference', c.reference,
        'bank_id', c.bank_id,
        'assigned_agent_id', c.assigned_agent_id,
        'debtor_pp_id', c.debtor_pp_id,
        'debtor_pm_id', c.debtor_pm_id,
        'status', c.status,
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
