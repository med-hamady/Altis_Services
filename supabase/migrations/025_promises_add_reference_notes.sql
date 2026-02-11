-- =============================================================================
-- Ajouter les colonnes reference et notes à la table promises
-- =============================================================================

ALTER TABLE promises ADD COLUMN IF NOT EXISTS reference VARCHAR(100);
ALTER TABLE promises ADD COLUMN IF NOT EXISTS notes TEXT;
