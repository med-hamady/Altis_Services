-- ============================================================================
-- MIGRATION : Supprimer sector/zone de agents et avatar_url de bank_users
-- Date : 2026-02-17
-- ============================================================================

-- 1. Supprimer les colonnes
ALTER TABLE agents DROP COLUMN IF EXISTS sector;
ALTER TABLE agents DROP COLUMN IF EXISTS zone;
ALTER TABLE bank_users DROP COLUMN IF EXISTS avatar_url;

-- 2. Recréer update_agent sans p_sector
CREATE OR REPLACE FUNCTION update_agent(
  p_id uuid,
  p_full_name varchar DEFAULT NULL,
  p_phone varchar DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  UPDATE agents SET
    full_name = COALESCE(p_full_name, full_name),
    phone = CASE WHEN p_phone IS NOT NULL THEN p_phone ELSE phone END,
    is_active = COALESCE(p_is_active, is_active),
    updated_at = now()
  WHERE id = p_id
  RETURNING row_to_json(agents) INTO v_result;

  RETURN v_result;
END;
$$;

-- 3. Recréer update_bank_user_profile sans avatar_url
CREATE OR REPLACE FUNCTION update_bank_user_profile(p_user_id uuid, p_data json)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT (is_admin() OR auth.uid() = p_user_id) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  UPDATE bank_users SET
    full_name = CASE WHEN p_data ? 'full_name' THEN p_data->>'full_name' ELSE full_name END,
    phone = CASE WHEN p_data ? 'phone' THEN p_data->>'phone' ELSE phone END,
    job_title = CASE WHEN p_data ? 'job_title' THEN p_data->>'job_title' ELSE job_title END,
    updated_at = now()
  WHERE id = p_user_id
  RETURNING row_to_json(bank_users) INTO v_result;

  RETURN v_result;
END;
$$;
