-- =============================================================================
-- Migration 049: Système de notification par email pour les actions planifiées
-- Envoie un rappel à l'agent quand la date d'une action planifiée arrive
-- =============================================================================

SET search_path TO public;

-- Table pour tracer les notifications envoyées (éviter les doublons)
CREATE TABLE IF NOT EXISTS action_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL,
  notification_type varchar(20) NOT NULL DEFAULT 'email',
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(action_id)
);

CREATE INDEX IF NOT EXISTS idx_action_notifications_action_id ON action_notifications(action_id);

ALTER TABLE action_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "action_notifications_admin_select"
  ON action_notifications FOR SELECT
  USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid() AND is_active = true));

CREATE POLICY "action_notifications_service_insert"
  ON action_notifications FOR INSERT
  WITH CHECK (true);

GRANT SELECT, INSERT ON action_notifications TO authenticated;
GRANT SELECT, INSERT ON action_notifications TO service_role;

-- =============================================================================
-- Fonction RPC : get_pending_action_notifications
-- =============================================================================
CREATE OR REPLACE FUNCTION get_pending_action_notifications()
RETURNS TABLE (
  action_id uuid,
  case_id uuid,
  case_reference varchar,
  agent_id uuid,
  agent_email varchar,
  agent_full_name varchar,
  debtor_name text,
  bank_name varchar,
  next_action_type text,
  next_action_date date,
  next_action_notes text,
  remaining_balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id AS action_id,
    a.case_id,
    c.reference AS case_reference,
    c.assigned_agent_id AS agent_id,
    ag.email AS agent_email,
    ag.full_name AS agent_full_name,
    COALESCE(dpp.full_name, dpm.company_name, 'Inconnu') AS debtor_name,
    b.name AS bank_name,
    a.next_action_type::text,
    a.next_action_date,
    a.next_action_notes,
    c.remaining_balance
  FROM actions a
  JOIN cases c ON c.id = a.case_id
  JOIN agents ag ON ag.id = c.assigned_agent_id
  JOIN banks b ON b.id = c.bank_id
  LEFT JOIN debtors_pp dpp ON dpp.id = c.debtor_pp_id
  LEFT JOIN debtors_pm dpm ON dpm.id = c.debtor_pm_id
  WHERE a.next_action_date IS NOT NULL
    AND a.next_action_date <= CURRENT_DATE
    AND c.status NOT IN ('closed', 'paid')
    AND ag.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM action_notifications an WHERE an.action_id = a.id
    )
  ORDER BY a.next_action_date ASC, a.next_action_type ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_pending_action_notifications() TO service_role;

-- =============================================================================
-- Fonction RPC : mark_action_notification_sent
-- =============================================================================
CREATE OR REPLACE FUNCTION mark_action_notification_sent(
  p_action_id uuid,
  p_case_id uuid,
  p_agent_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO action_notifications (action_id, case_id, agent_id, notification_type)
  VALUES (p_action_id, p_case_id, p_agent_id, 'email')
  ON CONFLICT (action_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION mark_action_notification_sent(uuid, uuid, uuid) TO service_role;
