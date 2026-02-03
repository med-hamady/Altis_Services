-- ============================================================================
-- Migration 020 : Triggers pour mise à jour automatique des dossiers
-- - Après insert action => last_action_at/type, next_action_at/type
-- - Après insert/update payment (validated) => recalcul solde, statut
-- ============================================================================

-- 1) Ajouter les colonnes de suivi sur cases (si absentes)
ALTER TABLE cases ADD COLUMN IF NOT EXISTS last_action_at timestamptz;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS last_action_type text;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS next_action_at timestamptz;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS next_action_type text;

-- 2) Trigger : après insertion d'une action, MAJ du dossier
CREATE OR REPLACE FUNCTION public.trg_after_action_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE cases SET
    last_action_at = NEW.action_date::timestamptz,
    last_action_type = NEW.action_type::text,
    next_action_at = CASE WHEN NEW.next_action_date IS NOT NULL
                      THEN NEW.next_action_date::timestamptz
                      ELSE NULL END,
    next_action_type = CASE WHEN NEW.next_action_type IS NOT NULL
                        THEN NEW.next_action_type::text
                        ELSE NULL END,
    -- Passer automatiquement de "assigned" à "in_progress" à la première action
    status = CASE
      WHEN status IN ('new', 'assigned') THEN 'in_progress'::case_status
      ELSE status
    END
  WHERE id = NEW.case_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_action_insert ON actions;
CREATE TRIGGER trg_action_insert
  AFTER INSERT ON actions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_after_action_insert();

-- 3) Trigger : après insertion de promesse, MAJ statut dossier
CREATE OR REPLACE FUNCTION public.trg_after_promise_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE cases SET
    status = CASE
      WHEN status IN ('in_progress', 'assigned') THEN 'promise'::case_status
      ELSE status
    END
  WHERE id = NEW.case_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promise_insert ON promises;
CREATE TRIGGER trg_promise_insert
  AFTER INSERT ON promises
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_after_promise_insert();

-- 4) Trigger : après insertion/update paiement, recalcul et MAJ statut
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
BEGIN
  -- Déterminer le case_id
  v_case_id := COALESCE(NEW.case_id, OLD.case_id);

  -- Calculer le total dû
  SELECT COALESCE(amount_principal, 0) + COALESCE(amount_interest, 0)
       + COALESCE(amount_penalties, 0) + COALESCE(amount_fees, 0)
  INTO v_total_due
  FROM cases WHERE id = v_case_id;

  -- Calculer le total payé (validé uniquement)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM payments
  WHERE case_id = v_case_id AND status = 'validated';

  -- MAJ statut du dossier en fonction des paiements
  UPDATE cases SET
    status = CASE
      WHEN v_total_paid >= v_total_due THEN 'paid'::case_status
      WHEN v_total_paid > 0 THEN 'partial_payment'::case_status
      ELSE status
    END
  WHERE id = v_case_id
    AND status NOT IN ('closed', 'paid');

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_change ON payments;
CREATE TRIGGER trg_payment_change
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_after_payment_change();

-- 5) Créer le bucket storage pour les justificatifs (si absent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('case_documents', 'case_documents', false)
ON CONFLICT (id) DO NOTHING;

-- Politique storage : authentifiés peuvent upload
CREATE POLICY "auth_upload_case_docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'case_documents');

-- Politique storage : authentifiés peuvent lire
CREATE POLICY "auth_read_case_docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'case_documents');
