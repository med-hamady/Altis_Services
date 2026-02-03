-- =============================================================================
-- Fix: Permettre au service_role (Edge Functions) d'insérer dans les tables
-- Le service_role bypass normalement le RLS, mais il faut s'assurer que
-- RLS est bien configuré pour ne pas bloquer le service_role
-- =============================================================================

-- Option 1: S'assurer que le service_role a les grants nécessaires
GRANT ALL ON debtors_pp TO service_role;
GRANT ALL ON debtors_pm TO service_role;
GRANT ALL ON cases TO service_role;
GRANT ALL ON audit_logs TO service_role;
GRANT ALL ON imports TO service_role;
GRANT ALL ON import_rows TO service_role;

-- Option 2: Ajouter des policies explicites pour service_role
-- (au cas où RLS bloque malgré les grants)

-- debtors_pp
DO $$ BEGIN
  CREATE POLICY "debtors_pp_service_all"
  ON debtors_pp FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- debtors_pm
DO $$ BEGIN
  CREATE POLICY "debtors_pm_service_all"
  ON debtors_pm FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- cases
DO $$ BEGIN
  CREATE POLICY "cases_service_all"
  ON cases FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- audit_logs
DO $$ BEGIN
  CREATE POLICY "audit_logs_service_all"
  ON audit_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
