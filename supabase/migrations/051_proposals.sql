-- ============================================================================
-- MIGRATION 051 : Fonctionnalite "Propositions" de paiement
-- Date : 2026-03-13
-- Description : Tables, enums, RLS, index, fonctions RPC pour les propositions
-- ============================================================================

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

CREATE TYPE proposal_type AS ENUM ('monthly', 'one_time', 'schedule');
CREATE TYPE proposal_status AS ENUM ('pending', 'accepted', 'rejected', 'countered', 'expired');

-- ============================================================================
-- 2. TABLE proposals
-- ============================================================================

CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,

  -- Type et montants
  type proposal_type NOT NULL,
  amount NUMERIC(15,2),
  monthly_amount NUMERIC(15,2),
  start_date DATE,
  end_date DATE,
  duration_months INTEGER,

  -- Statut et decision
  status proposal_status NOT NULL DEFAULT 'pending',
  decision_by UUID,
  decision_at TIMESTAMPTZ,
  decision_note TEXT,

  -- Lignage (contre-propositions)
  parent_proposal_id UUID REFERENCES proposals(id),

  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposals_case ON proposals(case_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_parent ON proposals(parent_proposal_id);

-- ============================================================================
-- 3. TABLE proposal_items (echeances)
-- ============================================================================

CREATE TABLE proposal_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE INDEX idx_proposal_items_proposal ON proposal_items(proposal_id);

-- ============================================================================
-- 4. ALTER promises : ajouter proposal_id
-- ============================================================================

ALTER TABLE promises ADD COLUMN IF NOT EXISTS proposal_id UUID REFERENCES proposals(id);
CREATE INDEX IF NOT EXISTS idx_promises_proposal ON promises(proposal_id);

-- ============================================================================
-- 5. RLS sur proposals
-- ============================================================================

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Admin : acces complet
CREATE POLICY proposals_admin_all ON proposals
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Agent : SELECT sur ses dossiers
CREATE POLICY proposals_agent_select ON proposals
  FOR SELECT TO authenticated
  USING (is_agent() AND agent_has_case(case_id));

-- Agent : INSERT sur ses dossiers
CREATE POLICY proposals_agent_insert ON proposals
  FOR INSERT TO authenticated
  WITH CHECK (is_agent() AND agent_has_case(case_id) AND created_by = auth.uid());

-- Agent : UPDATE sur ses dossiers (pour contre-proposition workflow)
CREATE POLICY proposals_agent_update ON proposals
  FOR UPDATE TO authenticated
  USING (is_agent() AND agent_has_case(case_id))
  WITH CHECK (is_agent() AND agent_has_case(case_id));

-- Bank user : SELECT uniquement propositions acceptees de sa banque
CREATE POLICY proposals_bankuser_select ON proposals
  FOR SELECT TO authenticated
  USING (is_bank_user() AND case_belongs_to_user_bank(case_id) AND status = 'accepted');

-- ============================================================================
-- 6. RLS sur proposal_items
-- ============================================================================

ALTER TABLE proposal_items ENABLE ROW LEVEL SECURITY;

-- Admin : acces complet
CREATE POLICY proposal_items_admin_all ON proposal_items
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Agent : SELECT
CREATE POLICY proposal_items_agent_select ON proposal_items
  FOR SELECT TO authenticated
  USING (is_agent() AND EXISTS (
    SELECT 1 FROM proposals p WHERE p.id = proposal_id AND agent_has_case(p.case_id)
  ));

-- Agent : INSERT
CREATE POLICY proposal_items_agent_insert ON proposal_items
  FOR INSERT TO authenticated
  WITH CHECK (is_agent() AND EXISTS (
    SELECT 1 FROM proposals p WHERE p.id = proposal_id AND agent_has_case(p.case_id)
  ));

-- Bank user : SELECT accepted uniquement
CREATE POLICY proposal_items_bankuser_select ON proposal_items
  FOR SELECT TO authenticated
  USING (is_bank_user() AND EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_id
    AND case_belongs_to_user_bank(p.case_id)
    AND p.status = 'accepted'
  ));

-- ============================================================================
-- 7. FONCTIONS RPC
-- ============================================================================

-- 7.1 create_proposal
CREATE OR REPLACE FUNCTION create_proposal(
  p_case_id UUID,
  p_type proposal_type,
  p_amount NUMERIC DEFAULT NULL,
  p_monthly_amount NUMERIC DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_duration_months INTEGER DEFAULT NULL,
  p_due_date DATE DEFAULT NULL,
  p_items JSON DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal_id UUID;
  v_computed_amount NUMERIC;
  v_end_date DATE;
  v_item JSON;
  v_sort INTEGER := 0;
  v_result JSON;
BEGIN
  -- Permission
  IF NOT (is_admin() OR is_agent()) THEN
    RAISE EXCEPTION 'Acces refuse';
  END IF;

  IF p_type = 'one_time' THEN
    -- Paiement unique
    IF p_amount IS NULL OR p_amount <= 0 THEN
      RAISE EXCEPTION 'Montant requis et doit etre positif';
    END IF;
    IF p_due_date IS NULL THEN
      RAISE EXCEPTION 'Date d echeance requise';
    END IF;

    INSERT INTO proposals (case_id, created_by, type, amount, start_date, end_date, notes)
    VALUES (p_case_id, auth.uid(), 'one_time', p_amount, p_due_date, p_due_date, p_notes)
    RETURNING id INTO v_proposal_id;

    -- Creer 1 item
    INSERT INTO proposal_items (proposal_id, due_date, amount, sort_order)
    VALUES (v_proposal_id, p_due_date, p_amount, 0);

  ELSIF p_type = 'monthly' THEN
    -- Mensualites
    IF p_monthly_amount IS NULL OR p_monthly_amount <= 0 THEN
      RAISE EXCEPTION 'Montant mensuel requis et doit etre positif';
    END IF;
    IF p_start_date IS NULL THEN
      RAISE EXCEPTION 'Date de debut requise';
    END IF;
    IF p_duration_months IS NULL OR p_duration_months < 1 THEN
      RAISE EXCEPTION 'Duree en mois requise (minimum 1)';
    END IF;

    v_computed_amount := p_monthly_amount * p_duration_months;
    v_end_date := p_start_date + (p_duration_months - 1) * INTERVAL '1 month';

    INSERT INTO proposals (case_id, created_by, type, amount, monthly_amount, start_date, end_date, duration_months, notes)
    VALUES (p_case_id, auth.uid(), 'monthly', v_computed_amount, p_monthly_amount, p_start_date, v_end_date::date, p_duration_months, p_notes)
    RETURNING id INTO v_proposal_id;

    -- Creer N items mensuels
    FOR i IN 0..(p_duration_months - 1) LOOP
      INSERT INTO proposal_items (proposal_id, due_date, amount, sort_order)
      VALUES (v_proposal_id, (p_start_date + i * INTERVAL '1 month')::date, p_monthly_amount, i);
    END LOOP;

  ELSIF p_type = 'schedule' THEN
    -- Echeancier personnalise
    IF p_items IS NULL THEN
      RAISE EXCEPTION 'Liste d echeances requise';
    END IF;

    v_computed_amount := 0;

    INSERT INTO proposals (case_id, created_by, type, amount, notes)
    VALUES (p_case_id, auth.uid(), 'schedule', 0, p_notes)
    RETURNING id INTO v_proposal_id;

    FOR v_item IN SELECT * FROM json_array_elements(p_items)
    LOOP
      INSERT INTO proposal_items (proposal_id, due_date, amount, sort_order, notes)
      VALUES (
        v_proposal_id,
        (v_item->>'due_date')::date,
        (v_item->>'amount')::numeric,
        v_sort,
        v_item->>'notes'
      );
      v_computed_amount := v_computed_amount + (v_item->>'amount')::numeric;
      v_sort := v_sort + 1;
    END LOOP;

    -- Mettre a jour le montant total et les dates
    UPDATE proposals
    SET amount = v_computed_amount,
        start_date = (SELECT MIN(due_date) FROM proposal_items WHERE proposal_id = v_proposal_id),
        end_date = (SELECT MAX(due_date) FROM proposal_items WHERE proposal_id = v_proposal_id)
    WHERE id = v_proposal_id;

  END IF;

  -- Retourner la proposition avec ses items
  SELECT json_build_object(
    'id', pr.id,
    'case_id', pr.case_id,
    'created_by', pr.created_by,
    'type', pr.type,
    'amount', pr.amount,
    'monthly_amount', pr.monthly_amount,
    'start_date', pr.start_date,
    'end_date', pr.end_date,
    'duration_months', pr.duration_months,
    'status', pr.status,
    'parent_proposal_id', pr.parent_proposal_id,
    'notes', pr.notes,
    'created_at', pr.created_at,
    'items', COALESCE((
      SELECT json_agg(json_build_object(
        'id', pi.id,
        'due_date', pi.due_date,
        'amount', pi.amount,
        'sort_order', pi.sort_order,
        'notes', pi.notes
      ) ORDER BY pi.sort_order)
      FROM proposal_items pi WHERE pi.proposal_id = pr.id
    ), '[]'::json)
  ) INTO v_result
  FROM proposals pr
  WHERE pr.id = v_proposal_id;

  RETURN v_result;
END;
$$;

-- 7.2 list_case_proposals
CREATE OR REPLACE FUNCTION list_case_proposals(p_case_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', pr.id,
        'case_id', pr.case_id,
        'created_by', pr.created_by,
        'type', pr.type,
        'amount', pr.amount,
        'monthly_amount', pr.monthly_amount,
        'start_date', pr.start_date,
        'end_date', pr.end_date,
        'duration_months', pr.duration_months,
        'status', pr.status,
        'decision_by', pr.decision_by,
        'decision_at', pr.decision_at,
        'decision_note', pr.decision_note,
        'parent_proposal_id', pr.parent_proposal_id,
        'notes', pr.notes,
        'created_at', pr.created_at,
        'creator_name', COALESCE(
          (SELECT a.full_name FROM admins a WHERE a.id = pr.created_by),
          (SELECT ag.full_name FROM agents ag WHERE ag.id = pr.created_by),
          'Inconnu'
        ),
        'items', COALESCE((
          SELECT json_agg(json_build_object(
            'id', pi.id,
            'proposal_id', pi.proposal_id,
            'due_date', pi.due_date,
            'amount', pi.amount,
            'sort_order', pi.sort_order,
            'notes', pi.notes
          ) ORDER BY pi.sort_order)
          FROM proposal_items pi WHERE pi.proposal_id = pr.id
        ), '[]'::json)
      ) ORDER BY pr.created_at DESC
    ), '[]'::json)
    FROM proposals pr
    WHERE pr.case_id = p_case_id
  );
END;
$$;

-- 7.3 accept_proposal : accepter et generer les promesses
CREATE OR REPLACE FUNCTION accept_proposal(
  p_proposal_id UUID,
  p_decision_note TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal RECORD;
  v_item RECORD;
  v_result JSON;
BEGIN
  -- Admin uniquement
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Seul un administrateur peut accepter une proposition';
  END IF;

  -- Charger la proposition
  SELECT * INTO v_proposal FROM proposals WHERE id = p_proposal_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposition introuvable';
  END IF;
  IF v_proposal.status != 'pending' THEN
    RAISE EXCEPTION 'Seule une proposition en attente peut etre acceptee';
  END IF;

  -- Mettre a jour le statut
  UPDATE proposals
  SET status = 'accepted',
      decision_by = auth.uid(),
      decision_at = now(),
      decision_note = p_decision_note
  WHERE id = p_proposal_id;

  -- Generer les promesses a partir des items
  FOR v_item IN
    SELECT * FROM proposal_items WHERE proposal_id = p_proposal_id ORDER BY sort_order
  LOOP
    INSERT INTO promises (case_id, amount, due_date, notes, created_by, proposal_id)
    VALUES (
      v_proposal.case_id,
      v_item.amount,
      v_item.due_date,
      COALESCE(v_item.notes, 'Generee depuis proposition'),
      auth.uid(),
      p_proposal_id
    );
  END LOOP;
  -- Note : le trigger trg_after_promise_insert gere automatiquement
  -- la transition du case.status vers 'promise'

  -- Retourner la proposition mise a jour
  SELECT json_build_object(
    'id', pr.id,
    'case_id', pr.case_id,
    'status', pr.status,
    'decision_by', pr.decision_by,
    'decision_at', pr.decision_at,
    'decision_note', pr.decision_note
  ) INTO v_result
  FROM proposals pr
  WHERE pr.id = p_proposal_id;

  RETURN v_result;
END;
$$;

-- 7.4 reject_proposal
CREATE OR REPLACE FUNCTION reject_proposal(
  p_proposal_id UUID,
  p_decision_note TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal RECORD;
  v_result JSON;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Seul un administrateur peut rejeter une proposition';
  END IF;

  IF p_decision_note IS NULL OR trim(p_decision_note) = '' THEN
    RAISE EXCEPTION 'Le motif de rejet est obligatoire';
  END IF;

  SELECT * INTO v_proposal FROM proposals WHERE id = p_proposal_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposition introuvable';
  END IF;
  IF v_proposal.status != 'pending' THEN
    RAISE EXCEPTION 'Seule une proposition en attente peut etre rejetee';
  END IF;

  UPDATE proposals
  SET status = 'rejected',
      decision_by = auth.uid(),
      decision_at = now(),
      decision_note = p_decision_note
  WHERE id = p_proposal_id
  RETURNING row_to_json(proposals) INTO v_result;

  RETURN v_result;
END;
$$;

-- 7.5 counter_proposal : creer une contre-proposition
CREATE OR REPLACE FUNCTION counter_proposal(
  p_parent_proposal_id UUID,
  p_type proposal_type,
  p_amount NUMERIC DEFAULT NULL,
  p_monthly_amount NUMERIC DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_duration_months INTEGER DEFAULT NULL,
  p_due_date DATE DEFAULT NULL,
  p_items JSON DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent RECORD;
  v_new_proposal JSON;
  v_new_id UUID;
BEGIN
  IF NOT (is_admin() OR is_agent()) THEN
    RAISE EXCEPTION 'Acces refuse';
  END IF;

  -- Charger la proposition parente
  SELECT * INTO v_parent FROM proposals WHERE id = p_parent_proposal_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposition parente introuvable';
  END IF;
  IF v_parent.status != 'pending' THEN
    RAISE EXCEPTION 'Seule une proposition en attente peut etre contre-proposee';
  END IF;

  -- Marquer l ancienne comme countered
  UPDATE proposals
  SET status = 'countered',
      decision_by = auth.uid(),
      decision_at = now(),
      decision_note = 'Contre-proposition creee'
  WHERE id = p_parent_proposal_id;

  -- Creer la nouvelle proposition
  v_new_proposal := create_proposal(
    v_parent.case_id,
    p_type,
    p_amount,
    p_monthly_amount,
    p_start_date,
    p_duration_months,
    p_due_date,
    p_items,
    p_notes
  );

  v_new_id := (v_new_proposal->>'id')::UUID;

  -- Lier a la proposition parente
  UPDATE proposals SET parent_proposal_id = p_parent_proposal_id WHERE id = v_new_id;

  -- Retourner la nouvelle proposition avec le parent_proposal_id mis a jour
  RETURN (
    SELECT json_build_object(
      'id', pr.id,
      'case_id', pr.case_id,
      'created_by', pr.created_by,
      'type', pr.type,
      'amount', pr.amount,
      'monthly_amount', pr.monthly_amount,
      'start_date', pr.start_date,
      'end_date', pr.end_date,
      'duration_months', pr.duration_months,
      'status', pr.status,
      'parent_proposal_id', pr.parent_proposal_id,
      'notes', pr.notes,
      'created_at', pr.created_at,
      'items', COALESCE((
        SELECT json_agg(json_build_object(
          'id', pi.id,
          'due_date', pi.due_date,
          'amount', pi.amount,
          'sort_order', pi.sort_order,
          'notes', pi.notes
        ) ORDER BY pi.sort_order)
        FROM proposal_items pi WHERE pi.proposal_id = pr.id
      ), '[]'::json)
    )
    FROM proposals pr
    WHERE pr.id = v_new_id
  );
END;
$$;

-- 7.6 delete_proposal
CREATE OR REPLACE FUNCTION delete_proposal(p_proposal_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal RECORD;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Seul un administrateur peut supprimer une proposition';
  END IF;

  SELECT * INTO v_proposal FROM proposals WHERE id = p_proposal_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposition introuvable';
  END IF;
  IF v_proposal.status != 'pending' THEN
    RAISE EXCEPTION 'Seule une proposition en attente peut etre supprimee';
  END IF;

  -- CASCADE supprime les proposal_items
  DELETE FROM proposals WHERE id = p_proposal_id;
END;
$$;

-- ============================================================================
-- 8. GRANTS
-- ============================================================================

GRANT ALL ON proposals TO authenticated;
GRANT ALL ON proposal_items TO authenticated;
