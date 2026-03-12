-- ============================================================================
-- MIGRATION 048: Supprimer l'ancienne surcharge de create_promise
-- L'ancienne signature (avec p_payment_method, p_reference) entre en conflit
-- avec la nouvelle (migration 040) car PostgreSQL ne peut pas choisir entre les deux.
-- ============================================================================

DROP FUNCTION IF EXISTS create_promise(uuid, numeric, date, varchar, varchar, text);
