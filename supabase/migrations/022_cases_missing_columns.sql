-- ============================================================================
-- Migration 022 : Colonnes manquantes sur cases
-- Aligner la table cases avec le modèle TypeScript (Case / CreateCaseDTO)
-- ============================================================================

-- Phase de recouvrement
DO $$ BEGIN
  CREATE TYPE case_phase AS ENUM ('amicable', 'pre_legal', 'legal');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE cases ADD COLUMN IF NOT EXISTS phase case_phase NOT NULL DEFAULT 'amicable';

-- Garantie
ALTER TABLE cases ADD COLUMN IF NOT EXISTS guarantee_type VARCHAR(100);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS guarantee_description TEXT;

-- Dernière information de paiement côté banque
ALTER TABLE cases ADD COLUMN IF NOT EXISTS last_bank_payment_date DATE;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS last_bank_payment_amount NUMERIC(15,2);

-- Niveau de risque
ALTER TABLE cases ADD COLUMN IF NOT EXISTS risk_level VARCHAR(50);

-- Notes internes (visibles admin/agent uniquement)
ALTER TABLE cases ADD COLUMN IF NOT EXISTS internal_notes TEXT;
