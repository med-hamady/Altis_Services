-- ============================================================================
-- MIGRATION : Supprimer payment_method et reference de la table promises
-- Date : 2026-02-17
-- Description : Ces champs ne sont pas pertinents pour les promesses de paiement
-- ============================================================================

-- 1. Supprimer les colonnes
ALTER TABLE promises DROP COLUMN IF EXISTS payment_method;
ALTER TABLE promises DROP COLUMN IF EXISTS reference;

-- 2. Recréer la fonction create_promise sans ces paramètres
CREATE OR REPLACE FUNCTION create_promise(
  p_case_id uuid,
  p_amount numeric,
  p_due_date date,
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

  INSERT INTO promises (case_id, amount, due_date, notes, created_by)
  VALUES (p_case_id, p_amount, p_due_date, p_notes, auth.uid())
  RETURNING row_to_json(promises) INTO v_result;

  RETURN v_result;
END;
$$;
