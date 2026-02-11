-- ============================================================================
-- Migration 031 : Stocker total_paid et remaining_balance sur cases
-- Calculés par trigger à chaque changement de paiement
-- ============================================================================

-- 1) Ajouter les colonnes
ALTER TABLE cases ADD COLUMN IF NOT EXISTS total_paid NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS remaining_balance NUMERIC(15,2) NOT NULL DEFAULT 0;

-- 2) Backfill : calculer pour tous les dossiers existants
UPDATE cases SET
  total_paid = COALESCE((
    SELECT SUM(amount) FROM payments
    WHERE payments.case_id = cases.id AND payments.status = 'validated'
  ), 0),
  remaining_balance = ABS(
    COALESCE(amount_principal, 0) + COALESCE(amount_interest, 0)
    + COALESCE(amount_penalties, 0) + COALESCE(amount_fees, 0)
  ) - COALESCE((
    SELECT SUM(amount) FROM payments
    WHERE payments.case_id = cases.id AND payments.status = 'validated'
  ), 0);

-- 3) Backfill : clôturer les dossiers déjà entièrement payés
UPDATE cases SET
  status = 'closed',
  closure_reason = 'fully_paid',
  closed_at = now(),
  closed_by = COALESCE(
    (SELECT declared_by FROM payments
     WHERE payments.case_id = cases.id AND payments.status = 'validated'
     ORDER BY declared_at DESC LIMIT 1),
    created_by
  )
WHERE remaining_balance <= 0
  AND total_paid > 0
  AND status NOT IN ('closed');

-- 4) Recréer le trigger pour maintenir ces colonnes
CREATE OR REPLACE FUNCTION public.trg_after_payment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case_id uuid;
  v_total_due numeric;
  v_total_paid numeric;
  v_remaining numeric;
BEGIN
  v_case_id := COALESCE(NEW.case_id, OLD.case_id);

  -- Total dû (valeur absolue pour gérer les montants négatifs importés)
  SELECT ABS(
    COALESCE(amount_principal, 0) + COALESCE(amount_interest, 0)
    + COALESCE(amount_penalties, 0) + COALESCE(amount_fees, 0)
  )
  INTO v_total_due
  FROM cases WHERE id = v_case_id;

  -- Total payé (validé uniquement)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM payments
  WHERE case_id = v_case_id AND status = 'validated';

  v_remaining := v_total_due - v_total_paid;

  -- MAJ colonnes stockées + statut + clôture automatique si tout payé
  UPDATE cases SET
    total_paid = v_total_paid,
    remaining_balance = v_remaining,
    status = CASE
      WHEN v_total_paid >= v_total_due AND v_total_due > 0 THEN 'closed'::case_status
      WHEN v_total_paid > 0 THEN 'partial_payment'::case_status
      ELSE status
    END,
    -- Clôturer automatiquement si entièrement payé
    closure_reason = CASE
      WHEN v_total_paid >= v_total_due AND v_total_due > 0 THEN 'fully_paid'
      ELSE closure_reason
    END,
    closed_at = CASE
      WHEN v_total_paid >= v_total_due AND v_total_due > 0 THEN now()
      ELSE closed_at
    END,
    closed_by = CASE
      WHEN v_total_paid >= v_total_due AND v_total_due > 0 THEN NEW.declared_by
      ELSE closed_by
    END
  WHERE id = v_case_id
    AND status NOT IN ('closed');

  RETURN COALESCE(NEW, OLD);
END;
$$;
