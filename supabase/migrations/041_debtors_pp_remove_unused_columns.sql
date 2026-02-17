-- ============================================================================
-- MIGRATION : Supprimer les colonnes inutilisées de debtors_pp
-- Date : 2026-02-17
-- Colonnes supprimées : alt_contact_name, alt_contact_relation, alt_contact_phone,
--   address_work_region, address_work_city, address_work_street, date_of_birth, created_by
-- ============================================================================

-- 1. Supprimer les colonnes
ALTER TABLE debtors_pp DROP COLUMN IF EXISTS alt_contact_name;
ALTER TABLE debtors_pp DROP COLUMN IF EXISTS alt_contact_relation;
ALTER TABLE debtors_pp DROP COLUMN IF EXISTS alt_contact_phone;
ALTER TABLE debtors_pp DROP COLUMN IF EXISTS address_work_street;
ALTER TABLE debtors_pp DROP COLUMN IF EXISTS address_work_city;
ALTER TABLE debtors_pp DROP COLUMN IF EXISTS address_work_region;
ALTER TABLE debtors_pp DROP COLUMN IF EXISTS date_of_birth;
ALTER TABLE debtors_pp DROP COLUMN IF EXISTS created_by;

-- 2. Recréer la fonction create_debtor_pp sans ces colonnes
CREATE OR REPLACE FUNCTION create_debtor_pp(p_data json)
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

  INSERT INTO debtors_pp (
    first_name, last_name, id_type, id_number,
    phone_primary, phone_secondary, email,
    address_street, address_city, address_region,
    employer, occupation, notes, photo_url
  )
  VALUES (
    p_data->>'first_name',
    p_data->>'last_name',
    p_data->>'id_type',
    p_data->>'id_number',
    p_data->>'phone_primary',
    p_data->>'phone_secondary',
    p_data->>'email',
    p_data->>'address_street',
    p_data->>'address_city',
    p_data->>'address_region',
    p_data->>'employer',
    p_data->>'occupation',
    p_data->>'notes',
    p_data->>'photo_url'
  )
  RETURNING row_to_json(debtors_pp) INTO v_result;

  RETURN v_result;
END;
$$;
