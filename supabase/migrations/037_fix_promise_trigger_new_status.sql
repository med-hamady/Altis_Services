-- ============================================================================
-- Migration 037 : Corriger le trigger promesse pour inclure le statut 'new'
-- Si une promesse est créée alors que le dossier est encore 'new',
-- le statut doit passer à 'promise'
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trg_after_promise_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE cases SET
    status = CASE
      WHEN status IN ('new', 'in_progress', 'assigned') THEN 'promise'::case_status
      ELSE status
    END
  WHERE id = NEW.case_id;
  RETURN NEW;
END;
$$;
