-- ============================================================================
-- MIGRATION 053 : Enrichir stats banque (garanties + propositions) + fix precision taux
-- Date : 2026-03-14
-- ============================================================================

CREATE OR REPLACE FUNCTION get_bank_user_stats(p_bank_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_cases bigint;
  v_total_due numeric;
  v_total_recovered numeric;
  v_amount_recovered_this_month numeric;
  v_recovery_rate numeric;
  v_first_day_of_month date;
  v_cases_with_guarantee bigint;
  v_proposals_pending bigint;
  v_proposals_accepted bigint;
  v_proposals_countered bigint;
BEGIN
  IF NOT (is_admin() OR (is_bank_user() AND get_user_bank_id() = p_bank_id)) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  v_first_day_of_month := date_trunc('month', current_date)::date;

  SELECT count(*) INTO v_total_cases
  FROM cases WHERE bank_id = p_bank_id;

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

  -- Taux de recouvrement (2 decimales)
  IF v_total_due > 0 THEN
    v_recovery_rate := ROUND((v_total_recovered / v_total_due) * 100, 2);
  ELSE
    v_recovery_rate := 0;
  END IF;

  -- Dossiers avec garantie
  SELECT count(*) INTO v_cases_with_guarantee
  FROM cases WHERE bank_id = p_bank_id AND has_guarantee = true;

  -- Propositions liées aux dossiers de cette banque
  SELECT count(*) INTO v_proposals_pending
  FROM proposals p
  INNER JOIN cases c ON c.id = p.case_id
  WHERE c.bank_id = p_bank_id AND p.status = 'pending';

  SELECT count(*) INTO v_proposals_accepted
  FROM proposals p
  INNER JOIN cases c ON c.id = p.case_id
  WHERE c.bank_id = p_bank_id AND p.status = 'accepted';

  SELECT count(*) INTO v_proposals_countered
  FROM proposals p
  INNER JOIN cases c ON c.id = p.case_id
  WHERE c.bank_id = p_bank_id AND p.status = 'countered';

  RETURN json_build_object(
    'totalCases', v_total_cases,
    'recoveryRate', v_recovery_rate,
    'amountRecovered', v_amount_recovered_this_month,
    'casesWithGuarantee', v_cases_with_guarantee,
    'proposalsPending', v_proposals_pending,
    'proposalsAccepted', v_proposals_accepted,
    'proposalsCountered', v_proposals_countered
  );
END;
$$;
