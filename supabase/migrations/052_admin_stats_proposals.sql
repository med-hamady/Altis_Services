-- ============================================================================
-- MIGRATION 052 : Ajouter compteurs propositions au dashboard admin
-- Date : 2026-03-14
-- ============================================================================

CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_cases bigint;
  v_cases_in_progress bigint;
  v_active_banks bigint;
  v_active_agents bigint;
  v_cases_with_guarantee bigint;
  v_proposals_pending bigint;
  v_proposals_accepted bigint;
  v_proposals_countered bigint;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  SELECT count(*) INTO v_total_cases FROM cases;
  SELECT count(*) INTO v_cases_in_progress FROM cases WHERE status != 'closed';
  SELECT count(*) INTO v_active_banks FROM banks WHERE is_active = true;
  SELECT count(*) INTO v_active_agents FROM agents WHERE is_active = true;
  SELECT count(*) INTO v_cases_with_guarantee FROM cases WHERE has_guarantee = true;
  SELECT count(*) INTO v_proposals_pending FROM proposals WHERE status = 'pending';
  SELECT count(*) INTO v_proposals_accepted FROM proposals WHERE status = 'accepted';
  SELECT count(*) INTO v_proposals_countered FROM proposals WHERE status = 'countered';

  RETURN json_build_object(
    'totalCases', v_total_cases,
    'casesInProgress', v_cases_in_progress,
    'activeBanks', v_active_banks,
    'activeAgents', v_active_agents,
    'casesWithGuarantee', v_cases_with_guarantee,
    'proposalsPending', v_proposals_pending,
    'proposalsAccepted', v_proposals_accepted,
    'proposalsCountered', v_proposals_countered
  );
END;
$$;
