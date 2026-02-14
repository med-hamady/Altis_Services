-- ============================================================================
-- Migration 033 : Trigger pour calculer remaining_balance à l'INSERT/UPDATE de cases
-- Corrige le bug où remaining_balance restait à 0 pour les nouveaux dossiers
-- ============================================================================

-- 1) Fonction trigger sur cases INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.trg_cases_compute_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_due numeric;
  v_total_paid numeric;
BEGIN
  -- Total dû (valeur absolue pour gérer les montants négatifs importés)
  v_total_due := ABS(
    COALESCE(NEW.amount_principal, 0) + COALESCE(NEW.amount_interest, 0)
    + COALESCE(NEW.amount_penalties, 0) + COALESCE(NEW.amount_fees, 0)
  );

  -- Total payé (validé uniquement)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM payments
  WHERE case_id = NEW.id AND status = 'validated';

  NEW.remaining_balance := v_total_due - v_total_paid;
  NEW.total_paid := v_total_paid;

  RETURN NEW;
END;
$$;

-- 2) Trigger BEFORE INSERT pour initialiser remaining_balance
DROP TRIGGER IF EXISTS trg_cases_balance_insert ON cases;
CREATE TRIGGER trg_cases_balance_insert
  BEFORE INSERT ON cases
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_cases_compute_balance();

-- 3) Trigger BEFORE UPDATE des colonnes montants pour recalculer
DROP TRIGGER IF EXISTS trg_cases_balance_update ON cases;
CREATE TRIGGER trg_cases_balance_update
  BEFORE UPDATE OF amount_principal, amount_interest, amount_penalties, amount_fees ON cases
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_cases_compute_balance();

-- 4) Backfill : recalculer pour tous les dossiers existants
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
