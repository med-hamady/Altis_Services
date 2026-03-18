-- =============================================================================
-- FIX: update_case_status_on_payment — ajouter ABS() sur v_total_amount
-- Bug: amount_principal peut être négatif (imports), rendant v_total_amount
-- négatif et la condition v_total_paid >= v_total_amount toujours vraie,
-- ce qui passait le dossier à 'paid' au lieu de 'partial_payment'.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_case_status_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_amount NUMERIC(15,2);
  v_total_paid NUMERIC(15,2);
  v_current_status case_status;
BEGIN
  -- Seulement si le paiement vient d'être validé
  IF NEW.status = 'validated' AND (OLD.status IS NULL OR OLD.status != 'validated') THEN

    -- Récupérer le statut actuel et les montants
    SELECT
      c.status,
      ABS(c.amount_principal + c.amount_interest + c.amount_penalties + c.amount_fees),
      COALESCE((
        SELECT SUM(amount)
        FROM public.payments
        WHERE case_id = c.id AND status = 'validated'
      ), 0)
    INTO v_current_status, v_total_amount, v_total_paid
    FROM public.cases c
    WHERE c.id = NEW.case_id;

    -- Ne pas modifier si déjà clôturé
    IF v_current_status != 'closed' THEN
      IF v_total_paid >= v_total_amount THEN
        UPDATE public.cases
        SET status = 'paid', updated_at = now()
        WHERE id = NEW.case_id;
      ELSIF v_total_paid > 0 THEN
        UPDATE public.cases
        SET status = 'partial_payment', updated_at = now()
        WHERE id = NEW.case_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
