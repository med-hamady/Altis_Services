-- =============================================================================
-- ALTIS SERVICES - Forcer l'ouverture SELECT sur toutes les tables
-- Exécuter chaque bloc séparément si nécessaire
-- =============================================================================

-- Vérifier les politiques actuelles
SELECT tablename, policyname, cmd, qual FROM pg_policies
WHERE schemaname = 'public' ORDER BY tablename, policyname;
