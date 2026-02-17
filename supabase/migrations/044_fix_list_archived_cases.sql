-- ============================================================================
-- MIGRATION : Corriger list_archived_cases après suppression de colonnes
-- Date : 2026-02-17
-- Raison : La migration 042 a supprimé des colonnes de la table cases mais
--   n'a pas recréé list_archived_cases qui les référençait encore.
-- ============================================================================

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
