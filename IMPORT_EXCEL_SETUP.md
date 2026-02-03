# Import Excel - Guide d'installation

## Architecture

```
Frontend (React)                    Supabase
┌──────────────┐     ┌──────────────────────────────┐
│ ImportsPage  │────>│ Storage: bucket "imports"     │
│ (upload .xlsx│     │ Tables: imports, import_rows  │
│  + analyser) │     │                               │
└──────┬───────┘     │ Edge Functions:               │
       │             │  ├─ process-import            │
       │             │  │  (parse Excel + OpenAI)    │
       │             │  └─ finalize-import           │
       v             │     (créer cases + debtors)   │
┌──────────────┐     │                               │
│ PreviewPage  │     │ Secrets:                      │
│ (review +    │     │  └─ OPENAI_API_KEY            │
│  approve +   │     └──────────────────────────────┘
│  inline edit)│
└──────────────┘
```

## Prérequis

- Supabase CLI installé (`npm install -g supabase`)
- Projet Supabase lié (`supabase link`)
- Clé API OpenAI (avec permission Responses: Write)

## Installation

### 1. Migration SQL

Exécuter la migration pour créer les tables, RLS et le bucket storage :

```bash
supabase db push
```

Ou manuellement dans le SQL Editor de Supabase Dashboard :
- Copier le contenu de `supabase/migrations/023_imports_tables.sql`

### 2. Secret OpenAI

Stocker la clé OpenAI dans les secrets des Edge Functions :

```bash
supabase secrets set OPENAI_API_KEY=sk-votre-cle-openai
```

**Important** : La clé n'est JAMAIS exposée au frontend. Elle est uniquement
accessible dans les Edge Functions via `Deno.env.get("OPENAI_API_KEY")`.

### 3. Déployer les Edge Functions

```bash
supabase functions deploy process-import
supabase functions deploy finalize-import
```

### 4. Vérification

```bash
# Vérifier que les functions sont déployées
supabase functions list

# Vérifier que le secret est configuré
supabase secrets list
```

## Format du fichier Excel

Le fichier Excel doit contenir une feuille nommée **DOSSIERS** (ou la première feuille sera utilisée).

### Colonnes supportées

| Colonne Excel | Champ interne | Obligatoire |
|---|---|---|
| nom / debtor_name / raison_sociale | debtor_name | Oui |
| prenom / first_name | debtor_first_name | Non (PP) |
| type_debiteur / debtor_type | debtor_type | Non (défaut: PP) |
| telephone / phone_1 / tel_1 | phone_1 | Oui |
| telephone_2 / phone_2 | phone_2 | Non |
| email | email | Non |
| reference_contrat / contract_ref | contract_ref | Oui |
| date_defaut / default_date | default_date | Non |
| montant_principal / principal | amount_principal | Non |
| montant_interets / interets | amount_interest | Non |
| montant_penalites / penalites | amount_penalties | Non |
| montant_frais / frais | amount_fees | Non |
| montant_total / total | total_due | Non (calculé si vide) |
| devise / currency | currency | Non (défaut: MRU) |
| priorite / priority | priority | Non (défaut: medium) |
| reference_banque / ref_banque | bank_reference | Non |
| adresse / address | address | Non |
| ville / city | city | Non |
| region | region | Non |
| id_type / type_identite | id_type | Non |
| id_number / numero_identite | id_number | Non |
| type_produit / product_type | product_type | Non |
| employeur / employer | employer | Non |
| profession / occupation | occupation | Non |
| registre_commerce / rc_number | rc_number | Non (PM) |
| nif | nif | Non (PM) |
| representant_legal / legal_rep_name | legal_rep_name | Non (PM) |
| tel_representant / legal_rep_phone | legal_rep_phone | Non (PM) |
| notes | notes | Non |

### Noms de colonnes

Le système est tolérant :
- Insensible à la casse (`Nom` = `nom` = `NOM`)
- Supporte les accents (`référence` = `reference`)
- Supporte les underscores et espaces (`ref contrat` = `ref_contrat`)

## Workflow utilisateur

1. **Admin** navigue vers **Import Excel** dans la sidebar
2. Sélectionne la **banque** concernée
3. Upload le fichier **.xlsx**
4. Clique **Analyser** → le fichier est envoyé à Supabase Storage puis traité par l'Edge Function `process-import`
5. Redirigé vers la page **Preview Import** :
   - Voit les lignes classées : valides / warnings / erreurs
   - Peut **éditer inline** les champs clés (nom, téléphone, montants, etc.)
   - Coche les lignes à approuver (ou "Approuver toutes les valides")
6. Clique **Valider & créer dossiers** → l'Edge Function `finalize-import` crée les débiteurs et dossiers

## Rôle d'OpenAI

L'IA intervient **uniquement** pour :
- Normaliser les téléphones (+222XXXXXXXX)
- Normaliser les dates (YYYY-MM-DD)
- Standardiser le type de débiteur (PP/PM)
- Signaler des anomalies (email invalide, doublon probable)

**L'IA ne peut pas** :
- Inventer des données manquantes
- Modifier les montants
- Créer des dossiers directement

Si OpenAI est indisponible, le système utilise un fallback déterministe (normalisation par code) et ajoute un warning "IA indisponible".

## Sécurité

- Clé OpenAI stockée dans les **Edge Function Secrets** (jamais dans le frontend)
- Bucket Storage `imports` : **admin only** (RLS)
- Tables `imports` et `import_rows` : **admin only** (RLS)
- Les Edge Functions utilisent le **service_role** pour accéder aux données
- Validation des données côté serveur (Edge Function) avant toute création
