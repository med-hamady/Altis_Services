-- =============================================================================
-- ALTIS SERVICES - Données de démonstration
-- Script pour peupler la base avec des données de test
-- =============================================================================

-- Note: Exécutez ce script APRÈS avoir créé votre admin initial
-- Les UUIDs sont générés aléatoirement - ils seront différents à chaque exécution

-- =============================================================================
-- 1. BANQUES
-- =============================================================================

INSERT INTO banks (name, code, address, phone, email, is_active)
VALUES
  ('Banque Mauritanienne pour le Commerce International', 'BMCI', 'Avenue Gamal Abdel Nasser, Nouakchott', '+222 45 25 26 72', 'contact@bmci.mr', true),
  ('Générale Banque de Mauritanie', 'GBM', 'Ilot K, Tevragh-Zeina, Nouakchott', '+222 45 29 23 92', 'info@gbm.mr', true),
  ('Banque Nationale de Mauritanie', 'BNM', 'Avenue Kennedy, Nouakchott', '+222 45 25 26 18', 'contact@bnm.mr', true);

-- =============================================================================
-- 2. CONTACTS BANCAIRES
-- =============================================================================

INSERT INTO bank_contacts (bank_id, full_name, job_title, phone, email, is_primary)
SELECT
  b.id,
  CASE
    WHEN b.code = 'BMCI' THEN 'Mohamed Ould Ahmed'
    WHEN b.code = 'GBM' THEN 'Fatimetou Mint Abdel'
    WHEN b.code = 'BNM' THEN 'Cheikh Ould Moctar'
  END,
  'Responsable Recouvrement',
  CASE
    WHEN b.code = 'BMCI' THEN '+222 46 12 34 56'
    WHEN b.code = 'GBM' THEN '+222 46 23 45 67'
    WHEN b.code = 'BNM' THEN '+222 46 34 56 78'
  END,
  CASE
    WHEN b.code = 'BMCI' THEN 'mohamed.ahmed@bmci.mr'
    WHEN b.code = 'GBM' THEN 'fatimetou.abdel@gbm.mr'
    WHEN b.code = 'BNM' THEN 'cheikh.moctar@bnm.mr'
  END,
  true
FROM banks b;

-- =============================================================================
-- 3. AGENTS (à créer manuellement dans auth.users d'abord)
-- =============================================================================

-- Instructions pour créer les agents:
-- 1. Créer les utilisateurs dans Supabase Auth UI avec ces emails:
--    - agent1@altis.mr (mot de passe au choix)
--    - agent2@altis.mr (mot de passe au choix)
-- 2. Copier leurs UUIDs
-- 3. Remplacer les UUIDs ci-dessous par ceux copiés
-- 4. Décommenter et exécuter

/*
INSERT INTO agents (id, email, full_name, phone, sector, is_active)
VALUES
  ('REMPLACER-PAR-UUID-AGENT-1', 'agent1@altis.mr', 'Abdoulaye Sow', '+222 47 11 22 33', 'Tevragh-Zeina', true),
  ('REMPLACER-PAR-UUID-AGENT-2', 'agent2@altis.mr', 'Mariem Mint Salem', '+222 47 44 55 66', 'Ksar', true);
*/

-- =============================================================================
-- 4. UTILISATEURS BANQUE (à créer manuellement dans auth.users d'abord)
-- =============================================================================

-- Instructions similaires aux agents ci-dessus
-- Email: bmci.user@altis.mr

/*
INSERT INTO bank_users (id, bank_id, email, full_name, phone, is_active)
SELECT
  'REMPLACER-PAR-UUID-BANK-USER',
  b.id,
  'bmci.user@altis.mr',
  'Hassan Ould Mohamed (BMCI)',
  '+222 46 77 88 99',
  true
FROM banks b
WHERE b.code = 'BMCI';
*/

-- =============================================================================
-- 5. DÉBITEURS PERSONNES PHYSIQUES
-- =============================================================================

INSERT INTO debtors_pp (first_name, last_name, id_number, phone_primary, phone_secondary, email, address_street, address_city, occupation)
VALUES
  ('Amadou', 'Diallo', '1234567890123', '+222 22 11 22 33', '+222 22 44 55 66', 'amadou.diallo@email.mr', 'Cité Plage, Lot 45', 'Nouakchott', 'Commerçant'),
  ('Aissata', 'Ba', '2345678901234', '+222 22 77 88 99', NULL, NULL, 'Tevragh-Zeina, Villa 12', 'Nouakchott', 'Fonctionnaire'),
  ('Ousmane', 'Sy', '3456789012345', '+222 22 33 44 55', '+222 22 66 77 88', 'ousmane.sy@email.mr', 'Ksar, Rue 15', 'Nouakchott', 'Entrepreneur'),
  ('Mariama', 'Sow', '4567890123456', '+222 22 99 00 11', NULL, NULL, 'Arafat, Ilot C', 'Nouakchott', 'Commerçante'),
  ('Mohamed', 'Kane', '5678901234567', '+222 22 55 66 77', '+222 22 88 99 00', NULL, 'Sebkha, Lot 28', 'Nouakchott', 'Transporteur');

-- =============================================================================
-- 6. DÉBITEURS PERSONNES MORALES
-- =============================================================================

INSERT INTO debtors_pm (company_name, rc_number, nif, phone_primary, email, address_street, address_city, sector_activity, legal_rep_name, legal_rep_title)
VALUES
  ('SARL Import-Export Sahara', 'RC2023001234', 'NIF123456789', '+222 45 11 22 33', 'contact@sahara-ie.mr', 'Zone Industrielle, Parcelle 42', 'Nouakchott', 'Import-Export', 'Ahmed Ould Cheikh', 'Gérant'),
  ('Société Mauritanienne de Construction', 'RC2022005678', 'NIF987654321', '+222 45 44 55 66', 'info@smconstruction.mr', 'Route de Rosso, Km 8', 'Nouakchott', 'BTP', 'Fatima Mint Abdallah', 'Directrice Générale'),
  ('SARL Tech Nouakchott', 'RC2023009876', 'NIF456789123', '+222 45 77 88 99', 'contact@technkt.mr', 'Tevragh-Zeina, Immeuble Alpha', 'Nouakchott', 'Informatique', 'Mamadou Diop', 'Gérant');

-- =============================================================================
-- 7. DOSSIERS (Exemples avec différents statuts)
-- =============================================================================

-- Dossiers BMCI - Personnes Physiques
INSERT INTO cases (
  bank_id,
  debtor_pp_id,
  reference,
  contract_reference,
  default_date,
  amount_principal,
  amount_interest,
  amount_penalties,
  amount_fees,
  status,
  priority,
  notes
)
SELECT
  b.id,
  d.id,
  CONCAT('BMCI-2024-', LPAD((ROW_NUMBER() OVER ())::text, 4, '0')),
  CONCAT('CT-', LPAD((ROW_NUMBER() OVER ())::text, 6, '0')),
  CURRENT_DATE - INTERVAL '6 months',
  CASE
    WHEN d.last_name = 'Diallo' THEN 250000.00
    WHEN d.last_name = 'Ba' THEN 180000.00
    ELSE 150000.00
  END,
  CASE
    WHEN d.last_name = 'Diallo' THEN 25000.00
    WHEN d.last_name = 'Ba' THEN 18000.00
    ELSE 15000.00
  END,
  CASE
    WHEN d.last_name = 'Diallo' THEN 5000.00
    ELSE 0.00
  END,
  2500.00,
  CASE
    WHEN d.last_name = 'Diallo' THEN 'new'
    WHEN d.last_name = 'Ba' THEN 'in_progress'
    ELSE 'new'
  END::case_status,
  CASE
    WHEN d.last_name = 'Diallo' THEN 'high'
    ELSE 'medium'
  END::case_priority,
  CASE
    WHEN d.last_name = 'Diallo' THEN 'Client historique - Priorité haute'
    WHEN d.last_name = 'Ba' THEN 'Promesse de paiement en cours'
    ELSE NULL
  END
FROM banks b
CROSS JOIN debtors_pp d
WHERE b.code = 'BMCI'
  AND d.last_name IN ('Diallo', 'Ba', 'Sy')
LIMIT 3;

-- Dossiers GBM - Personnes Morales
INSERT INTO cases (
  bank_id,
  debtor_pm_id,
  reference,
  contract_reference,
  default_date,
  amount_principal,
  amount_interest,
  amount_penalties,
  amount_fees,
  status,
  priority,
  notes
)
SELECT
  b.id,
  d.id,
  CONCAT('GBM-2024-', LPAD((ROW_NUMBER() OVER ())::text, 4, '0')),
  CONCAT('CT-', LPAD((ROW_NUMBER() OVER ())::text, 6, '0')),
  CURRENT_DATE - INTERVAL '8 months',
  CASE
    WHEN d.company_name LIKE '%Sahara%' THEN 1500000.00
    WHEN d.company_name LIKE '%Construction%' THEN 2800000.00
    ELSE 950000.00
  END,
  CASE
    WHEN d.company_name LIKE '%Sahara%' THEN 180000.00
    WHEN d.company_name LIKE '%Construction%' THEN 336000.00
    ELSE 114000.00
  END,
  CASE
    WHEN d.company_name LIKE '%Construction%' THEN 50000.00
    ELSE 0.00
  END,
  5000.00,
  CASE
    WHEN d.company_name LIKE '%Sahara%' THEN 'new'
    WHEN d.company_name LIKE '%Construction%' THEN 'in_progress'
    ELSE 'new'
  END::case_status,
  CASE
    WHEN d.company_name LIKE '%Construction%' THEN 'urgent'
    ELSE 'high'
  END::case_priority,
  CASE
    WHEN d.company_name LIKE '%Construction%' THEN 'Dossier transmis au contentieux'
    ELSE NULL
  END
FROM banks b
CROSS JOIN debtors_pm d
WHERE b.code = 'GBM';

-- Dossiers BNM - Mix PP et PM
INSERT INTO cases (
  bank_id,
  debtor_pp_id,
  reference,
  contract_reference,
  default_date,
  amount_principal,
  amount_interest,
  amount_penalties,
  amount_fees,
  status,
  priority
)
SELECT
  b.id,
  d.id,
  CONCAT('BNM-2024-', LPAD((ROW_NUMBER() OVER ())::text, 4, '0')),
  CONCAT('CT-', LPAD((ROW_NUMBER() OVER ())::text, 6, '0')),
  CURRENT_DATE - INTERVAL '4 months',
  320000.00,
  32000.00,
  0.00,
  2500.00,
  'new'::case_status,
  'medium'::case_priority
FROM banks b
CROSS JOIN debtors_pp d
WHERE b.code = 'BNM'
  AND d.last_name IN ('Sow', 'Kane')
LIMIT 2;

-- =============================================================================
-- 8. STATISTIQUES GÉNÉRÉES
-- =============================================================================

-- Vérifier les données insérées
SELECT
  'Banques' as table_name,
  COUNT(*) as count
FROM banks
UNION ALL
SELECT 'Débiteurs PP', COUNT(*) FROM debtors_pp
UNION ALL
SELECT 'Débiteurs PM', COUNT(*) FROM debtors_pm
UNION ALL
SELECT 'Dossiers', COUNT(*) FROM cases
UNION ALL
SELECT 'Agents', COUNT(*) FROM agents
UNION ALL
SELECT 'Utilisateurs Banque', COUNT(*) FROM bank_users;

-- Résumé par banque
SELECT
  b.name as banque,
  COUNT(c.id) as nb_dossiers,
  SUM(c.amount_principal + c.amount_interest + c.amount_penalties + c.amount_fees) as montant_total,
  COUNT(CASE WHEN c.status = 'new' THEN 1 END) as nouveaux,
  COUNT(CASE WHEN c.status = 'in_progress' THEN 1 END) as en_cours,
  COUNT(CASE WHEN c.status = 'closed' THEN 1 END) as clotures
FROM banks b
LEFT JOIN cases c ON c.bank_id = b.id
GROUP BY b.id, b.name
ORDER BY b.name;
