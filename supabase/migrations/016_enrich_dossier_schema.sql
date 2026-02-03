-- =============================================================================
-- ALTIS SERVICES - Enrichissement du schéma Dossier
-- Ajout des champs manquants identifiés dans le dossier de recouvrement type
-- + Correction des enums pour cohérence SQL ↔ TypeScript
-- =============================================================================

-- =============================================================================
-- ÉTAPE 1 : Nouvel enum - Phase de recouvrement
-- =============================================================================

CREATE TYPE case_phase AS ENUM ('amicable', 'pre_legal', 'legal');

-- =============================================================================
-- ÉTAPE 2 : Enrichissement de debtors_pp (Personne Physique)
-- =============================================================================

-- Date de naissance
ALTER TABLE debtors_pp ADD COLUMN date_of_birth DATE;

-- Adresse professionnelle (séparée de l'adresse domicile)
ALTER TABLE debtors_pp ADD COLUMN address_work_street TEXT;
ALTER TABLE debtors_pp ADD COLUMN address_work_city VARCHAR(100);
ALTER TABLE debtors_pp ADD COLUMN address_work_region VARCHAR(100);

-- Contact alternatif (ex: frère, voisin, etc.)
ALTER TABLE debtors_pp ADD COLUMN alt_contact_name VARCHAR(255);
ALTER TABLE debtors_pp ADD COLUMN alt_contact_relation VARCHAR(100);
ALTER TABLE debtors_pp ADD COLUMN alt_contact_phone VARCHAR(50);

-- =============================================================================
-- ÉTAPE 3 : Enrichissement de debtors_pm (Personne Morale)
-- =============================================================================

-- Contact alternatif
ALTER TABLE debtors_pm ADD COLUMN alt_contact_name VARCHAR(255);
ALTER TABLE debtors_pm ADD COLUMN alt_contact_relation VARCHAR(100);
ALTER TABLE debtors_pm ADD COLUMN alt_contact_phone VARCHAR(50);

-- =============================================================================
-- ÉTAPE 4 : Enrichissement de cases (Dossiers)
-- =============================================================================

-- Phase de recouvrement (amiable, pré-contentieux, judiciaire)
ALTER TABLE cases ADD COLUMN phase case_phase NOT NULL DEFAULT 'amicable';

-- Garantie
ALTER TABLE cases ADD COLUMN guarantee_type VARCHAR(100);
ALTER TABLE cases ADD COLUMN guarantee_description TEXT;

-- Dernier paiement connu (côté banque, avant transfert à Altis)
ALTER TABLE cases ADD COLUMN last_bank_payment_date DATE;
ALTER TABLE cases ADD COLUMN last_bank_payment_amount NUMERIC(15,2) CHECK (last_bank_payment_amount >= 0);

-- Niveau de risque
ALTER TABLE cases ADD COLUMN risk_level VARCHAR(50);

-- Notes internes admin (séparées des notes générales)
ALTER TABLE cases ADD COLUMN internal_notes TEXT;

-- =============================================================================
-- ÉTAPE 5 : Enrichissement de promises
-- =============================================================================

-- Référence lisible (ex: P-001)
ALTER TABLE promises ADD COLUMN reference VARCHAR(50);

-- =============================================================================
-- VÉRIFICATION
-- =============================================================================

SELECT 'Migration 016 appliquée avec succès' AS status;
