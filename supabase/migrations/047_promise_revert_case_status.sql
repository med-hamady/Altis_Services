-- Migration 047: Revert case status to in_progress when a promise is broken or deleted
--
-- Logique métier :
--   - Quand une promesse passe à 'broken' → si plus aucune promesse 'pending' sur le dossier,
--     le dossier revient à 'in_progress' (réapparaît dans "À traiter")
--   - Quand une promesse 'pending' est supprimée → même logique
--   - 'rescheduled' : la promesse reste active (nouvelle date), le dossier reste à 'promise'
--   - 'kept' : géré par le flux de paiement, pas touché ici

-- ============================================================
-- 1. Fonction trigger
-- ============================================================

CREATE OR REPLACE FUNCTION trg_promise_revert_case_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case_id uuid;
  v_pending_count bigint;
BEGIN
  -- Détecter l'opération et valider les conditions
  IF TG_OP = 'DELETE' THEN
    -- N'agir que si la promesse supprimée était en attente
    IF OLD.status != 'pending' THEN
      RETURN OLD;
    END IF;
    v_case_id := OLD.case_id;

  ELSIF TG_OP = 'UPDATE' THEN
    -- N'agir que si le statut vient de passer à 'broken'
    IF NEW.status != 'broken' OR OLD.status = 'broken' THEN
      RETURN NEW;
    END IF;
    v_case_id := NEW.case_id;

  ELSE
    RETURN NEW;
  END IF;

  -- Compter les promesses encore en 'pending' sur ce dossier
  -- (après UPDATE la ligne courante a déjà status='broken', après DELETE elle est supprimée)
  SELECT count(*) INTO v_pending_count
  FROM promises
  WHERE case_id = v_case_id
    AND status = 'pending';

  -- Si plus aucune promesse active et que le dossier est à 'promise', on revient à 'in_progress'
  IF v_pending_count = 0 THEN
    UPDATE cases
    SET status = 'in_progress'
    WHERE id = v_case_id
      AND status = 'promise';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- ============================================================
-- 2. Trigger sur UPDATE (promesse marquée 'broken')
-- ============================================================

DROP TRIGGER IF EXISTS trg_on_promise_broken ON promises;
CREATE TRIGGER trg_on_promise_broken
  AFTER UPDATE ON promises
  FOR EACH ROW
  EXECUTE FUNCTION trg_promise_revert_case_status();

-- ============================================================
-- 3. Trigger sur DELETE (promesse supprimée)
-- ============================================================

DROP TRIGGER IF EXISTS trg_on_promise_deleted ON promises;
CREATE TRIGGER trg_on_promise_deleted
  AFTER DELETE ON promises
  FOR EACH ROW
  EXECUTE FUNCTION trg_promise_revert_case_status();
