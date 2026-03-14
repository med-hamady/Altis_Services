-- ============================================================================
-- MIGRATION 054 : RPC pour récupérer les case_ids par statut de proposition
-- Date : 2026-03-14
-- Raison : Le RLS sur proposals empêche les bank_users de voir les propositions
--          non-accepted. Cette RPC SECURITY DEFINER contourne ce blocage
--          avec un contrôle d'accès explicite.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_case_ids_by_proposal_status(p_proposal_status text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Accès : admin, agent (ses dossiers), bank_user (sa banque)
  IF is_admin() THEN
    RETURN (
      SELECT COALESCE(json_agg(DISTINCT p.case_id), '[]'::json)
      FROM proposals p
      WHERE p.status = p_proposal_status::proposal_status
    );
  ELSIF is_agent() THEN
    RETURN (
      SELECT COALESCE(json_agg(DISTINCT p.case_id), '[]'::json)
      FROM proposals p
      INNER JOIN cases c ON c.id = p.case_id
      WHERE p.status = p_proposal_status::proposal_status
        AND c.assigned_agent_id = auth.uid()
    );
  ELSIF is_bank_user() THEN
    RETURN (
      SELECT COALESCE(json_agg(DISTINCT p.case_id), '[]'::json)
      FROM proposals p
      INNER JOIN cases c ON c.id = p.case_id
      WHERE p.status = p_proposal_status::proposal_status
        AND c.bank_id = get_user_bank_id()
    );
  ELSE
    RAISE EXCEPTION 'Accès refusé';
  END IF;
END;
$$;
