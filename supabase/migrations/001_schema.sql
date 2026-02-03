-- =============================================================================
-- ALTIS SERVICES - Schéma de base de données v2.0
-- Architecture propre avec tables séparées par type d'entité
-- =============================================================================

-- =============================================================================
-- NETTOYAGE (si réexécution)
-- =============================================================================
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TYPES ÉNUMÉRÉS
-- =============================================================================

-- Statuts des dossiers (workflow linéaire)
CREATE TYPE case_status AS ENUM (
  'new',             -- Nouveau (vient d'être créé)
  'assigned',        -- Affecté à un agent
  'in_progress',     -- En cours de traitement
  'promise',         -- Promesse de paiement obtenue
  'partial_payment', -- Paiement partiel reçu
  'paid',            -- Intégralement payé
  'closed'           -- Clôturé (avec motif)
);

-- Priorité des dossiers
CREATE TYPE case_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Types d'action terrain
CREATE TYPE action_type AS ENUM (
  'call',      -- Appel téléphonique
  'visit',     -- Visite sur site
  'sms',       -- SMS
  'email',     -- Email
  'letter',    -- Courrier postal
  'meeting',   -- Rendez-vous
  'other'      -- Autre
);

-- Résultats d'action
CREATE TYPE action_result AS ENUM (
  'reached',       -- Contact établi
  'unreachable',   -- Injoignable
  'refused',       -- Refus de payer
  'promise',       -- Promesse obtenue
  'partial_payment', -- Paiement partiel effectué
  'full_payment',  -- Paiement intégral
  'dispute',       -- Contestation/Litige
  'callback',      -- À rappeler
  'wrong_number',  -- Mauvais numéro
  'other'          -- Autre
);

-- Statuts de paiement
CREATE TYPE payment_status AS ENUM (
  'pending',    -- En attente de validation
  'validated',  -- Validé par admin
  'rejected'    -- Rejeté par admin
);

-- Statuts de promesse
CREATE TYPE promise_status AS ENUM (
  'pending',     -- En attente (date non échue)
  'kept',        -- Promesse tenue
  'broken',      -- Promesse non tenue
  'rescheduled'  -- Reportée
);

-- Catégories de documents
CREATE TYPE document_category AS ENUM (
  'contract',       -- Contrat de prêt
  'statement',      -- Relevé de compte
  'id_card',        -- Pièce d'identité
  'payment_proof',  -- Justificatif de paiement
  'field_report',   -- Rapport de visite terrain
  'correspondence', -- Courrier/correspondance
  'legal',          -- Document juridique
  'other'           -- Autre
);

-- Visibilité des documents
CREATE TYPE document_visibility AS ENUM (
  'internal',   -- Admin uniquement
  'bank',       -- Admin + Banque concernée
  'agent'       -- Admin + Agent affecté
);

-- Motifs de clôture
CREATE TYPE closure_reason AS ENUM (
  'fully_paid',     -- Payé intégralement
  'negotiated',     -- Règlement négocié
  'unreachable',    -- Définitivement injoignable
  'disputed',       -- Litige non résolu
  'bankrupt',       -- Faillite/Insolvabilité
  'deceased',       -- Décès du débiteur
  'transferred',    -- Transféré à autre agence
  'cancelled'       -- Annulé par la banque
);

-- =============================================================================
-- TABLE: BANQUES (clients d'Altis)
-- =============================================================================
CREATE TABLE banks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identification
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,

  -- Coordonnées
  address TEXT,
  city VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(255),

  -- Statut
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Métadonnées
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Contraintes
  CONSTRAINT banks_code_format CHECK (code ~ '^[A-Z0-9_]+$'),
  CONSTRAINT banks_email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_banks_code ON banks(code);
CREATE INDEX idx_banks_active ON banks(is_active) WHERE is_active = true;

-- =============================================================================
-- TABLE: ADMINISTRATEURS (employés Altis avec accès complet)
-- =============================================================================
CREATE TABLE admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identification
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),

  -- Statut
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Métadonnées
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admins_email ON admins(email);
CREATE INDEX idx_admins_active ON admins(is_active) WHERE is_active = true;

-- =============================================================================
-- TABLE: AGENTS TERRAIN
-- =============================================================================
CREATE TABLE agents (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identification
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),

  -- Affectation géographique
  sector VARCHAR(100),
  zone VARCHAR(100),

  -- Statut
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Métadonnées
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agents_email ON agents(email);
CREATE INDEX idx_agents_active ON agents(is_active) WHERE is_active = true;
CREATE INDEX idx_agents_sector ON agents(sector) WHERE sector IS NOT NULL;

-- =============================================================================
-- TABLE: UTILISATEURS BANQUE (accès lecture seule à leur banque)
-- =============================================================================
CREATE TABLE bank_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identification
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),

  -- Rattachement banque (OBLIGATOIRE)
  bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE RESTRICT,

  -- Fonction dans la banque
  job_title VARCHAR(100),

  -- Statut
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Métadonnées
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bank_users_email ON bank_users(email);
CREATE INDEX idx_bank_users_bank ON bank_users(bank_id);
CREATE INDEX idx_bank_users_active ON bank_users(is_active) WHERE is_active = true;

-- =============================================================================
-- TABLE: CONTACTS BANQUE (contacts additionnels sans compte)
-- =============================================================================
CREATE TABLE bank_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,

  -- Identification
  full_name VARCHAR(255) NOT NULL,
  job_title VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(255),

  -- Contact principal?
  is_primary BOOLEAN NOT NULL DEFAULT false,

  -- Métadonnées
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bank_contacts_bank ON bank_contacts(bank_id);

-- =============================================================================
-- TABLE: DÉBITEURS PERSONNES PHYSIQUES (PP)
-- =============================================================================
CREATE TABLE debtors_pp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identité
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,

  -- Documents d'identité
  id_type VARCHAR(50), -- CIN, Passport, etc.
  id_number VARCHAR(100),

  -- Coordonnées
  phone_primary VARCHAR(50),
  phone_secondary VARCHAR(50),
  email VARCHAR(255),

  -- Adresse
  address_street TEXT,
  address_city VARCHAR(100),
  address_region VARCHAR(100),

  -- Informations supplémentaires
  employer VARCHAR(255),
  occupation VARCHAR(100),
  notes TEXT,

  -- Métadonnées
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID -- Référence à l'admin/agent qui a créé
);

CREATE INDEX idx_debtors_pp_name ON debtors_pp(last_name, first_name);
CREATE INDEX idx_debtors_pp_id_number ON debtors_pp(id_number) WHERE id_number IS NOT NULL;
CREATE INDEX idx_debtors_pp_phone ON debtors_pp(phone_primary) WHERE phone_primary IS NOT NULL;

-- =============================================================================
-- TABLE: DÉBITEURS PERSONNES MORALES (PM)
-- =============================================================================
CREATE TABLE debtors_pm (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identification entreprise
  company_name VARCHAR(255) NOT NULL,
  trade_name VARCHAR(255), -- Nom commercial si différent

  -- Registres légaux
  rc_number VARCHAR(100), -- Registre du commerce
  nif VARCHAR(100),       -- Numéro d'identification fiscale

  -- Représentant légal
  legal_rep_name VARCHAR(255),
  legal_rep_title VARCHAR(100),
  legal_rep_phone VARCHAR(50),

  -- Coordonnées entreprise
  phone_primary VARCHAR(50),
  phone_secondary VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),

  -- Siège social
  address_street TEXT,
  address_city VARCHAR(100),
  address_region VARCHAR(100),

  -- Informations supplémentaires
  sector_activity VARCHAR(100),
  notes TEXT,

  -- Métadonnées
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX idx_debtors_pm_name ON debtors_pm(company_name);
CREATE INDEX idx_debtors_pm_rc ON debtors_pm(rc_number) WHERE rc_number IS NOT NULL;
CREATE INDEX idx_debtors_pm_nif ON debtors_pm(nif) WHERE nif IS NOT NULL;

-- =============================================================================
-- TABLE: DOSSIERS DE RECOUVREMENT
-- =============================================================================
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Références
  reference VARCHAR(50) NOT NULL UNIQUE, -- Format: YYYY-XXXXXX
  bank_reference VARCHAR(100),           -- Référence côté banque

  -- Relations
  bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE RESTRICT,
  assigned_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,

  -- Débiteur (un seul type, mutuellement exclusif)
  debtor_pp_id UUID REFERENCES debtors_pp(id) ON DELETE RESTRICT,
  debtor_pm_id UUID REFERENCES debtors_pm(id) ON DELETE RESTRICT,

  -- Statut et priorité
  status case_status NOT NULL DEFAULT 'new',
  priority case_priority NOT NULL DEFAULT 'medium',

  -- Informations sur la dette
  product_type VARCHAR(100),      -- Type de produit bancaire
  contract_reference VARCHAR(100), -- Référence du contrat
  default_date DATE,              -- Date de défaut de paiement

  -- Montants (en MRU - Ouguiya)
  amount_principal NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (amount_principal >= 0),
  amount_interest NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (amount_interest >= 0),
  amount_penalties NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (amount_penalties >= 0),
  amount_fees NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (amount_fees >= 0),

  -- Clôture
  closure_reason closure_reason,
  closure_notes TEXT,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES admins(id),

  -- Notes
  notes TEXT,

  -- Métadonnées
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,

  -- Contraintes
  CONSTRAINT cases_one_debtor CHECK (
    (debtor_pp_id IS NOT NULL AND debtor_pm_id IS NULL) OR
    (debtor_pp_id IS NULL AND debtor_pm_id IS NOT NULL)
  ),
  CONSTRAINT cases_closure_complete CHECK (
    (status != 'closed') OR
    (closure_reason IS NOT NULL AND closed_at IS NOT NULL AND closed_by IS NOT NULL)
  )
);

-- Index critiques pour performance
CREATE INDEX idx_cases_bank ON cases(bank_id);
CREATE INDEX idx_cases_agent ON cases(assigned_agent_id) WHERE assigned_agent_id IS NOT NULL;
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_priority ON cases(priority);
CREATE INDEX idx_cases_debtor_pp ON cases(debtor_pp_id) WHERE debtor_pp_id IS NOT NULL;
CREATE INDEX idx_cases_debtor_pm ON cases(debtor_pm_id) WHERE debtor_pm_id IS NOT NULL;
CREATE INDEX idx_cases_created ON cases(created_at DESC);

-- Index composite pour requêtes fréquentes
CREATE INDEX idx_cases_bank_status ON cases(bank_id, status);
CREATE INDEX idx_cases_agent_status ON cases(assigned_agent_id, status) WHERE assigned_agent_id IS NOT NULL;

-- =============================================================================
-- TABLE: ACTIONS TERRAIN (journal d'activité)
-- =============================================================================
CREATE TABLE actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Action effectuée
  action_type action_type NOT NULL,
  action_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  result action_result NOT NULL,

  -- Compte-rendu
  notes TEXT,

  -- Prochaine action planifiée
  next_action_type action_type,
  next_action_date DATE,
  next_action_notes TEXT,

  -- Auteur (agent ou admin)
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_actions_case ON actions(case_id);
CREATE INDEX idx_actions_date ON actions(action_date DESC);
CREATE INDEX idx_actions_next ON actions(next_action_date) WHERE next_action_date IS NOT NULL;
CREATE INDEX idx_actions_created_by ON actions(created_by);

-- =============================================================================
-- TABLE: PROMESSES DE PAIEMENT
-- =============================================================================
CREATE TABLE promises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Détails de la promesse
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  payment_method VARCHAR(50),

  -- Statut
  status promise_status NOT NULL DEFAULT 'pending',
  status_changed_at TIMESTAMPTZ,
  status_changed_by UUID,
  status_notes TEXT,

  -- Auteur
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_promises_case ON promises(case_id);
CREATE INDEX idx_promises_due ON promises(due_date);
CREATE INDEX idx_promises_status ON promises(status);
CREATE INDEX idx_promises_pending ON promises(due_date) WHERE status = 'pending';

-- =============================================================================
-- TABLE: PAIEMENTS
-- =============================================================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Détails du paiement
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50),
  transaction_reference VARCHAR(100),

  -- Validation
  status payment_status NOT NULL DEFAULT 'pending',
  validated_by UUID REFERENCES admins(id),
  validated_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Qui a déclaré ce paiement
  declared_by UUID NOT NULL,
  declared_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_case ON payments(case_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_date ON payments(payment_date DESC);
CREATE INDEX idx_payments_pending ON payments(declared_at) WHERE status = 'pending';

-- =============================================================================
-- TABLE: DOCUMENTS
-- =============================================================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Fichier
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),

  -- Classification
  category document_category NOT NULL DEFAULT 'other',
  visibility document_visibility NOT NULL DEFAULT 'internal',
  description TEXT,

  -- Auteur
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_case ON documents(case_id);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_visibility ON documents(visibility);

-- =============================================================================
-- TABLE: PIÈCES JOINTES AUX ACTIONS
-- =============================================================================
CREATE TABLE action_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,

  -- Fichier
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),

  -- Métadonnées
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_action_attachments_action ON action_attachments(action_id);

-- =============================================================================
-- TABLE: LOGS D'AUDIT (insertion uniquement via trigger)
-- =============================================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Contexte
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),

  -- Données
  old_data JSONB,
  new_data JSONB,

  -- Auteur
  user_id UUID,
  user_type VARCHAR(20), -- 'admin', 'agent', 'bank_user', 'system'

  -- Métadonnées
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Partitionner par mois pour les performances (optionnel mais recommandé)
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_date ON audit_logs(created_at DESC);

-- =============================================================================
-- TABLE: HISTORIQUE DES CONTACTS (changements de coordonnées)
-- =============================================================================
CREATE TABLE contact_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Référence au débiteur
  debtor_type VARCHAR(2) NOT NULL CHECK (debtor_type IN ('pp', 'pm')),
  debtor_id UUID NOT NULL,

  -- Changement
  field_name VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT,

  -- Auteur
  changed_by UUID NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_history_debtor ON contact_history(debtor_type, debtor_id);

-- =============================================================================
-- VUE: Montant total d'un dossier
-- =============================================================================
CREATE VIEW case_totals AS
SELECT
  id,
  bank_id,
  amount_principal + amount_interest + amount_penalties + amount_fees AS total_amount,
  (
    SELECT COALESCE(SUM(amount), 0)
    FROM payments
    WHERE payments.case_id = cases.id AND payments.status = 'validated'
  ) AS total_paid
FROM cases;

-- =============================================================================
-- VUE: Solde restant d'un dossier
-- =============================================================================
CREATE VIEW case_balances AS
SELECT
  c.id AS case_id,
  c.bank_id,
  c.reference,
  c.status,
  ct.total_amount,
  ct.total_paid,
  ct.total_amount - ct.total_paid AS remaining_balance
FROM cases c
JOIN case_totals ct ON ct.id = c.id;

-- =============================================================================
-- PERMISSIONS GRANT (OBLIGATOIRE pour Supabase)
-- Sans ces permissions, les rôles anon/authenticated ne peuvent pas accéder aux tables
-- =============================================================================

-- Tables utilisateurs
GRANT ALL ON admins TO authenticated, anon, service_role;
GRANT ALL ON agents TO authenticated, anon, service_role;
GRANT ALL ON bank_users TO authenticated, anon, service_role;

-- Autres tables
GRANT ALL ON banks TO authenticated, anon, service_role;
GRANT ALL ON bank_contacts TO authenticated, anon, service_role;
GRANT ALL ON debtors_pp TO authenticated, anon, service_role;
GRANT ALL ON debtors_pm TO authenticated, anon, service_role;
GRANT ALL ON cases TO authenticated, anon, service_role;
GRANT ALL ON actions TO authenticated, anon, service_role;
GRANT ALL ON action_attachments TO authenticated, anon, service_role;
GRANT ALL ON promises TO authenticated, anon, service_role;
GRANT ALL ON payments TO authenticated, anon, service_role;
GRANT ALL ON documents TO authenticated, anon, service_role;
GRANT ALL ON audit_logs TO authenticated, anon, service_role;
GRANT ALL ON contact_history TO authenticated, anon, service_role;

-- Séquences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon, service_role;

-- Vues
GRANT SELECT ON case_totals TO authenticated, anon, service_role;
GRANT SELECT ON case_balances TO authenticated, anon, service_role;
