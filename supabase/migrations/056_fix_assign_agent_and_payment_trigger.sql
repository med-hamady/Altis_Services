-- ============================================================================
-- Migration 056 : Correction assign_agent + trigger update_case_status_on_payment
--
-- Bug 1 : assign_agent réinitialise le statut à 'assigned' même si le dossier
--         a déjà un statut plus avancé (partial_payment, in_progress, etc.)
--         → le statut ne doit changer que si le dossier est encore en 'new'
--
-- Bug 2 : update_case_status_on_payment calcule v_total_amount sans ABS(),
--         rendant la valeur négative quand amount_principal < 0 (imports),
--         ce qui passe le dossier à 'paid' au lieu de 'partial_payment'
--
-- Correction données : remettre le dossier 1f82b5b1-... à 'partial_payment'
--                      (statut écrasé à 'assigned' par un assign_agent post-paiement)
-- ============================================================================


-- ============================================================================
-- 1) Corriger la fonction assign_agent
--    Ne passer à 'assigned' que si le dossier est encore en 'new'
--    Préserver tout statut plus avancé (in_progress, promise, partial_payment…)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.assign_agent(p_case_id uuid, p_agent_id uuid)
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
    status = CASE
      WHEN p_agent_id IS NULL   THEN 'new'::case_status      -- désaffectation → retour à new
      WHEN status = 'new'       THEN 'assigned'::case_status  -- première affectation
      ELSE status                                              -- préserver les statuts avancés
    END,
    updated_at = now()
  WHERE id = p_case_id;

  RETURN _build_case_json(p_case_id);
END;
$$;


-- ============================================================================
-- 2) Corriger le trigger update_case_status_on_payment (ABS sur v_total_amount)
--    Supersède la migration 055 si elle n'a pas encore été appliquée
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_case_status_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_amount NUMERIC(15,2);
  v_total_paid   NUMERIC(15,2);
  v_current_status case_status;
BEGIN
  -- Seulement si le paiement vient d'être validé
  IF NEW.status = 'validated' AND (OLD.status IS NULL OR OLD.status != 'validated') THEN

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


-- ============================================================================
-- 3) Corriger l'état du dossier 2026-976040
--    Paiement validé de 20 000 MRU sur un dossier de 1 964 683,70 MRU
--    → statut doit être 'partial_payment', pas 'assigned'
-- ============================================================================
UPDATE public.cases
SET
  status     = 'partial_payment',
  updated_at = now()
WHERE id = '1f82b5b1-55ca-4cdf-85ce-70e9c55cdf4c'
  AND status = 'assigned';
