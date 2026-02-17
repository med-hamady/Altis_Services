-- ============================================================================
-- MIGRATION : Supprimer les colonnes inutilisées de la table cases
-- Date : 2026-02-17
-- Colonnes supprimées : bank_reference, product_type, contract_reference,
--   guarantee_type, guarantee_description, last_bank_payment_date,
--   last_bank_payment_amount, risk_level, internal_notes
-- ============================================================================

-- 1. Supprimer les colonnes
ALTER TABLE cases DROP COLUMN IF EXISTS bank_reference;
ALTER TABLE cases DROP COLUMN IF EXISTS product_type;
ALTER TABLE cases DROP COLUMN IF EXISTS contract_reference;
ALTER TABLE cases DROP COLUMN IF EXISTS guarantee_type;
ALTER TABLE cases DROP COLUMN IF EXISTS guarantee_description;
ALTER TABLE cases DROP COLUMN IF EXISTS last_bank_payment_date;
ALTER TABLE cases DROP COLUMN IF EXISTS last_bank_payment_amount;
ALTER TABLE cases DROP COLUMN IF EXISTS risk_level;
ALTER TABLE cases DROP COLUMN IF EXISTS internal_notes;

-- 2. Recréer _build_case_json sans ces colonnes
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

-- 3. Recréer create_case sans ces colonnes
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
    reference, bank_id, assigned_agent_id,
    debtor_pp_id, debtor_pm_id,
    default_date, amount_principal, amount_interest, amount_penalties,
    amount_fees, notes, phase, created_by
  )
  VALUES (
    COALESCE(p_data->>'reference', generate_case_reference()),
    (p_data->>'bank_id')::uuid,
    (p_data->>'assigned_agent_id')::uuid,
    (p_data->>'debtor_pp_id')::uuid,
    (p_data->>'debtor_pm_id')::uuid,
    (p_data->>'default_date')::date,
    COALESCE((p_data->>'amount_principal')::numeric, 0),
    COALESCE((p_data->>'amount_interest')::numeric, 0),
    COALESCE((p_data->>'amount_penalties')::numeric, 0),
    COALESCE((p_data->>'amount_fees')::numeric, 0),
    p_data->>'notes',
    COALESCE((p_data->>'phase')::case_phase, 'amicable'),
    auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN _build_case_json(v_id);
END;
$$;

-- 4. Recréer update_case sans ces colonnes
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
    amount_principal = CASE WHEN p_data ? 'amount_principal' THEN (p_data->>'amount_principal')::numeric ELSE amount_principal END,
    amount_interest = CASE WHEN p_data ? 'amount_interest' THEN (p_data->>'amount_interest')::numeric ELSE amount_interest END,
    amount_penalties = CASE WHEN p_data ? 'amount_penalties' THEN (p_data->>'amount_penalties')::numeric ELSE amount_penalties END,
    amount_fees = CASE WHEN p_data ? 'amount_fees' THEN (p_data->>'amount_fees')::numeric ELSE amount_fees END,
    notes = CASE WHEN p_data ? 'notes' THEN p_data->>'notes' ELSE notes END,
    updated_at = now()
  WHERE id = p_case_id;

  RETURN _build_case_json(p_case_id);
END;
$$;
