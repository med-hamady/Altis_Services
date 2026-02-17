# Fonctions RPC - Code Source Complet

> Document auto-genere a partir de Supabase
> Derniere mise a jour : 2026-02-17

**Total : 75 fonctions** (15 anciennes + 59 nouvelles + 1 helper)

---

## Table des matieres

### A. Fonctions d'authentification et helpers RLS (9)
is_admin, is_agent, is_bank_user, get_user_type, get_user_bank_id, get_bank_user_bank_id, get_agent_bank_ids, agent_has_case, case_belongs_to_user_bank

### B. Generation de reference (1)
generate_case_reference

### C. Administration auth (2)
change_user_password, delete_auth_user

### D. Case extra info (3)
create_case_extra_info, get_case_extra_info, delete_case_extra_info

### E. Profils et notifications (2) — NOUVEAU
get_user_profile, get_admin_emails

### F. Gestion des utilisateurs (9) — NOUVEAU
list_admins, create_admin, update_admin, list_agents, create_agent, update_agent, list_bank_users, create_bank_user, update_bank_user

### G. Dashboard stats (5) — NOUVEAU
get_admin_stats, get_agent_stats, get_bank_user_stats, get_recent_actions, get_upcoming_promises

### H. Dossiers / Cases (7) — NOUVEAU
_build_case_json (helper), list_cases, list_archived_cases, create_case, get_case_detail, assign_agent, update_case

### I. Details dossier (10) — NOUVEAU
list_case_actions, list_case_promises, list_case_payments, list_case_documents, create_action, create_promise, update_promise_status, delete_promise, create_payment, validate_payment

### J. Banques (8) — NOUVEAU
list_banks, get_bank, create_bank, update_bank, delete_bank, update_bank_profile, update_bank_user_profile, toggle_bank_status

### K. Debiteurs (7) — NOUVEAU
list_debtors_pp, list_debtors_pm, list_debtors_pp_by_bank, list_debtors_pm_by_bank, get_debtor_counts_by_bank, create_debtor_pp, create_debtor_pm

### L. Imports (10) — NOUVEAU
list_imports, get_import, list_import_rows, create_import, delete_import, update_import_file_path, toggle_import_row_approval, approve_all_valid_rows, update_import_row, get_cases_by_import

### M. Rapports (2) — NOUVEAU
get_bank_report_cases, get_bank_report_stats

---

## A. Fonctions d'authentification et helpers RLS

### is_admin

- **Arguments** : aucun
- **Retour** : boolean
- **Langage** : sql

```sql
SELECT EXISTS (
  SELECT 1 FROM public.admins
  WHERE id = auth.uid()
  AND is_active = true
);
```

---

### is_agent

- **Arguments** : aucun
- **Retour** : boolean
- **Langage** : sql

```sql
SELECT EXISTS (
  SELECT 1 FROM public.agents
  WHERE id = auth.uid()
  AND is_active = true
);
```

---

### is_bank_user

- **Arguments** : aucun
- **Retour** : boolean
- **Langage** : sql

```sql
SELECT EXISTS (
  SELECT 1 FROM public.bank_users
  WHERE id = auth.uid()
  AND is_active = true
);
```

---

### get_user_type

- **Arguments** : aucun
- **Retour** : text
- **Langage** : sql

```sql
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid() AND is_active = true) THEN 'admin'
    WHEN EXISTS (SELECT 1 FROM public.agents WHERE id = auth.uid() AND is_active = true) THEN 'agent'
    WHEN EXISTS (SELECT 1 FROM public.bank_users WHERE id = auth.uid() AND is_active = true) THEN 'bank_user'
    ELSE NULL
  END;
```

---

### get_user_bank_id

- **Arguments** : aucun
- **Retour** : uuid
- **Langage** : sql

```sql
SELECT bank_id FROM public.bank_users
WHERE id = auth.uid()
AND is_active = true
LIMIT 1;
```

---

### get_bank_user_bank_id

- **Arguments** : aucun
- **Retour** : uuid
- **Langage** : sql

```sql
SELECT bank_id FROM public.bank_users
WHERE id = auth.uid()
AND is_active = true;
```

---

### get_agent_bank_ids

- **Arguments** : aucun
- **Retour** : SETOF uuid
- **Langage** : sql

```sql
SELECT DISTINCT bank_id
FROM public.cases
WHERE assigned_agent_id = auth.uid();
```

---

### agent_has_case

- **Arguments** : p_case_id uuid
- **Retour** : boolean
- **Langage** : sql

```sql
SELECT EXISTS (
  SELECT 1 FROM public.cases
  WHERE id = p_case_id
  AND assigned_agent_id = auth.uid()
);
```

---

### case_belongs_to_user_bank

- **Arguments** : p_case_id uuid
- **Retour** : boolean
- **Langage** : sql

```sql
SELECT EXISTS (
  SELECT 1 FROM public.cases c
  JOIN public.bank_users bu ON bu.bank_id = c.bank_id
  WHERE c.id = p_case_id
  AND bu.id = auth.uid()
  AND bu.is_active = true
);
```

---

## B. Generation de reference

### generate_case_reference

- **Arguments** : aucun
- **Retour** : text
- **Langage** : plpgsql

```sql
DECLARE
  v_year TEXT;
  v_sequence INTEGER;
  v_reference TEXT;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference FROM 6) AS INTEGER)), 0) + 1
  INTO v_sequence FROM public.cases WHERE reference LIKE v_year || '-%';
  v_reference := v_year || '-' || LPAD(v_sequence::TEXT, 6, '0');
  RETURN v_reference;
END;
```

---

## C. Administration auth

### change_user_password

- **Arguments** : target_user_id uuid, new_password text
- **Retour** : void
- **Langage** : plpgsql
- **Securite** : SECURITY DEFINER

```sql
DECLARE
  caller_id uuid;
  is_caller_admin boolean;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL THEN RAISE EXCEPTION 'Non authentifie'; END IF;

  SELECT EXISTS(SELECT 1 FROM public.admins WHERE id = caller_id AND is_active = true) INTO is_caller_admin;
  IF NOT is_caller_admin THEN RAISE EXCEPTION 'Acces refuse : seuls les administrateurs peuvent modifier les mots de passe'; END IF;

  IF length(new_password) < 6 THEN RAISE EXCEPTION 'Le mot de passe doit contenir au moins 6 caracteres'; END IF;

  UPDATE auth.users SET encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')) WHERE id = target_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Utilisateur non trouve'; END IF;
END;
```

---

### delete_auth_user

- **Arguments** : target_user_id uuid
- **Retour** : void
- **Langage** : plpgsql
- **Securite** : SECURITY DEFINER

```sql
DECLARE
  caller_id uuid;
  is_caller_admin boolean;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL THEN RAISE EXCEPTION 'Non authentifie'; END IF;

  SELECT EXISTS(SELECT 1 FROM public.admins WHERE id = caller_id AND is_active = true) INTO is_caller_admin;
  IF NOT is_caller_admin THEN RAISE EXCEPTION 'Acces refuse'; END IF;
  IF target_user_id = caller_id THEN RAISE EXCEPTION 'Vous ne pouvez pas supprimer votre propre compte'; END IF;

  DELETE FROM public.agents WHERE id = target_user_id;
  DELETE FROM public.bank_users WHERE id = target_user_id;
  DELETE FROM public.admins WHERE id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Utilisateur non trouve'; END IF;
END;
```

---

## D. Case extra info

### create_case_extra_info

- **Arguments** : p_case_id uuid, p_label text, p_value text
- **Retour** : case_extra_info
- **Langage** : plpgsql

```sql
DECLARE
  v_row public.case_extra_info;
BEGIN
  INSERT INTO public.case_extra_info (case_id, label, value, created_by)
  VALUES (p_case_id, p_label, p_value, auth.uid())
  RETURNING * INTO v_row;
  RETURN v_row;
END;
```

---

### get_case_extra_info

- **Arguments** : p_case_id uuid
- **Retour** : SETOF case_extra_info
- **Langage** : plpgsql

```sql
BEGIN
  RETURN QUERY SELECT * FROM public.case_extra_info WHERE case_id = p_case_id ORDER BY created_at DESC;
END;
```

---

### delete_case_extra_info

- **Arguments** : p_id uuid
- **Retour** : void
- **Langage** : plpgsql

```sql
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid() AND is_active = true) THEN
    RAISE EXCEPTION 'Acces refuse : admin uniquement';
  END IF;
  DELETE FROM public.case_extra_info WHERE id = p_id;
END;
```

---

## E. Profils et notifications (NOUVEAU)

### get_user_profile

- **Arguments** : p_user_id uuid
- **Retour** : json
- **Langage** : plpgsql
- **Securite** : SECURITY DEFINER
- **Tables** : admins, agents, bank_users, banks

Cherche le profil dans les 3 tables (admins → agents → bank_users). Retourne `{userType, profile}` ou NULL.

```sql
DECLARE v_result json;
BEGIN
  -- 1. admins
  SELECT json_build_object('userType', 'admin', 'profile', row_to_json(a)) INTO v_result FROM admins a WHERE a.id = p_user_id;
  IF v_result IS NOT NULL THEN RETURN v_result; END IF;

  -- 2. agents
  SELECT json_build_object('userType', 'agent', 'profile', row_to_json(ag)) INTO v_result FROM agents ag WHERE ag.id = p_user_id;
  IF v_result IS NOT NULL THEN RETURN v_result; END IF;

  -- 3. bank_users (avec join banks)
  SELECT json_build_object('userType', 'bank_user', 'profile', json_build_object(
    'id', bu.id, 'email', bu.email, 'full_name', bu.full_name, 'phone', bu.phone,
    'bank_id', bu.bank_id, 'job_title', bu.job_title, 'is_active', bu.is_active,
    'created_at', bu.created_at, 'updated_at', bu.updated_at, 'avatar_url', bu.avatar_url,
    'username', bu.username, 'bank', row_to_json(b)
  )) INTO v_result FROM bank_users bu LEFT JOIN banks b ON b.id = bu.bank_id WHERE bu.id = p_user_id;

  RETURN v_result;
END;
```

---

### get_admin_emails

- **Arguments** : aucun
- **Retour** : json
- **Langage** : plpgsql
- **Securite** : SECURITY DEFINER
- **Tables** : admins

```sql
BEGIN
  RETURN (SELECT COALESCE(json_agg(json_build_object('email', a.email)), '[]'::json) FROM admins a WHERE a.is_active = true);
END;
```

---

## F. Gestion des utilisateurs (NOUVEAU)

### list_admins

- **Arguments** : aucun
- **Retour** : json (tableau)
- **Securite** : SECURITY DEFINER
- **Acces** : admin uniquement

```sql
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Acces refuse : admin requis'; END IF;
  RETURN (SELECT COALESCE(json_agg(row_to_json(a) ORDER BY a.full_name), '[]'::json) FROM admins a);
END;
```

---

### create_admin

- **Arguments** : p_id uuid, p_email varchar, p_full_name varchar, p_phone varchar DEFAULT NULL, p_username varchar DEFAULT NULL
- **Retour** : json
- **Securite** : SECURITY DEFINER
- **Acces** : admin uniquement

INSERT INTO admins puis RETURNING row_to_json.

---

### update_admin

- **Arguments** : p_id uuid, p_full_name varchar DEFAULT NULL, p_phone varchar DEFAULT NULL, p_is_active boolean DEFAULT NULL
- **Retour** : json
- **Securite** : SECURITY DEFINER
- **Acces** : admin uniquement

UPDATE admins SET ... WHERE id = p_id RETURNING row_to_json.

---

### list_agents

- **Arguments** : aucun
- **Retour** : json (tableau)
- **Securite** : SECURITY DEFINER
- **Acces** : admin uniquement

Meme pattern que list_admins, sur la table agents.

---

### create_agent

- **Arguments** : p_id uuid, p_email varchar, p_full_name varchar, p_phone varchar DEFAULT NULL, p_username varchar DEFAULT NULL
- **Retour** : json
- **Securite** : SECURITY DEFINER
- **Acces** : admin uniquement

---

### update_agent

- **Arguments** : p_id uuid, p_full_name varchar DEFAULT NULL, p_phone varchar DEFAULT NULL, p_is_active boolean DEFAULT NULL
- **Retour** : json
- **Securite** : SECURITY DEFINER
- **Acces** : admin uniquement

---

### list_bank_users

- **Arguments** : aucun
- **Retour** : json (tableau avec join banks)
- **Securite** : SECURITY DEFINER
- **Acces** : admin uniquement

SELECT avec LEFT JOIN banks, retourne json_agg avec bank imbrique.

---

### create_bank_user

- **Arguments** : p_id uuid, p_email varchar, p_full_name varchar, p_bank_id uuid, p_phone varchar DEFAULT NULL, p_job_title varchar DEFAULT NULL, p_username varchar DEFAULT NULL
- **Retour** : json (avec bank imbrique)
- **Securite** : SECURITY DEFINER
- **Acces** : admin uniquement

---

### update_bank_user

- **Arguments** : p_id uuid, p_full_name varchar DEFAULT NULL, p_phone varchar DEFAULT NULL, p_job_title varchar DEFAULT NULL, p_is_active boolean DEFAULT NULL
- **Retour** : json (avec bank imbrique)
- **Securite** : SECURITY DEFINER
- **Acces** : admin uniquement

---

## G. Dashboard stats (NOUVEAU)

### get_admin_stats

- **Arguments** : aucun
- **Retour** : json `{totalCases, casesInProgress, activeBanks, activeAgents, casesWithGuarantee}`
- **Securite** : SECURITY DEFINER
- **Acces** : admin uniquement
- **Tables** : cases, banks, agents

5 requetes COUNT(*) sur cases, banks, agents.

---

### get_agent_stats

- **Arguments** : p_agent_id uuid
- **Retour** : json `{myCases, casesToProcess, upcomingPromises, closedThisMonth}`
- **Securite** : SECURITY DEFINER
- **Acces** : admin ou agent concerne
- **Tables** : cases, promises

4 requetes COUNT(*) filtrees par assigned_agent_id.

---

### get_bank_user_stats

- **Arguments** : p_bank_id uuid
- **Retour** : json `{totalCases, casesInRecovery, recoveryRate, amountRecovered}`
- **Securite** : SECURITY DEFINER
- **Acces** : admin ou bank_user de cette banque
- **Tables** : cases, payments

Calcule les totaux dus, recouvres, taux de recouvrement et montant recouvre ce mois.

---

### get_recent_actions

- **Arguments** : p_user_id uuid, p_role text
- **Retour** : json (tableau)
- **Securite** : SECURITY DEFINER
- **Tables** : actions, cases, debtors_pp, debtors_pm

10 dernieres actions avec reference dossier et nom debiteur. Filtre par role (agent/bank_user/admin).

---

### get_upcoming_promises

- **Arguments** : p_user_id uuid, p_role text
- **Retour** : json (tableau)
- **Securite** : SECURITY DEFINER
- **Tables** : promises, cases, debtors_pp, debtors_pm

Promesses pending des 7 prochains jours. Filtre par role.

---

## H. Dossiers / Cases (NOUVEAU)

### _build_case_json (helper interne)

- **Arguments** : p_case_id uuid
- **Retour** : json
- **Securite** : SECURITY DEFINER
- **Tables** : cases, banks, debtors_pp, debtors_pm, agents

Construit l'objet JSON complet d'un dossier avec toutes ses relations (bank, debtor_pp, debtor_pm, assigned_agent).

---

### list_cases

- **Arguments** : p_user_id uuid, p_role text, p_bank_id uuid DEFAULT NULL
- **Retour** : json (tableau)
- **Securite** : SECURITY DEFINER
- **Tables** : cases + joins

Dossiers actifs (status != 'closed'), filtres par role. Retourne avec bank, debtor_pp, debtor_pm, assigned_agent.

---

### list_archived_cases

- **Arguments** : p_user_id uuid, p_role text, p_bank_id uuid DEFAULT NULL
- **Retour** : json (tableau)
- **Securite** : SECURITY DEFINER
- **Tables** : cases + joins

Dossiers clos (status = 'closed'), filtres par role. Sans colonnes supprimées par migration 042 (bank_reference, product_type, contract_reference, guarantee_type, guarantee_description, last_bank_payment_date, last_bank_payment_amount, risk_level, internal_notes).

---

### create_case

- **Arguments** : p_data json
- **Retour** : json (dossier complet avec joins)
- **Securite** : SECURITY DEFINER
- **Acces** : admin uniquement
- **Tables** : cases

INSERT depuis JSON (bank_id, debtor_pp_id, debtor_pm_id, default_date, amount_principal/interest/penalties/fees, notes, phase), utilise generate_case_reference() si pas de reference. Retourne via _build_case_json.

---

### get_case_detail

- **Arguments** : p_case_id uuid
- **Retour** : json (dossier complet avec joins)
- **Securite** : SECURITY DEFINER
- **Acces** : admin, agent assigne, ou bank_user de la meme banque

Verifie l'acces puis retourne via _build_case_json.

---

### assign_agent

- **Arguments** : p_case_id uuid, p_agent_id uuid
- **Retour** : json
- **Securite** : SECURITY DEFINER
- **Acces** : admin uniquement

UPDATE assigned_agent_id + status (assigned/new). Retourne via _build_case_json.

---

### update_case

- **Arguments** : p_case_id uuid, p_data json
- **Retour** : json
- **Securite** : SECURITY DEFINER
- **Acces** : admin ou agent assigne

UPDATE conditionnel (phase, default_date, amount_principal/interest/penalties/fees, notes) via `p_data ? 'field'` pour ne modifier que les champs fournis.

---

## I. Details dossier (NOUVEAU)

### list_case_actions

- **Arguments** : p_case_id uuid
- **Retour** : json (tableau)
- **Securite** : SECURITY DEFINER
- **Tables** : actions

ORDER BY action_date DESC.

---

### list_case_promises

- **Arguments** : p_case_id uuid
- **Retour** : json (tableau)
- **Securite** : SECURITY DEFINER
- **Tables** : promises

ORDER BY due_date DESC.

---

### list_case_payments

- **Arguments** : p_case_id uuid
- **Retour** : json (tableau)
- **Securite** : SECURITY DEFINER
- **Tables** : payments

ORDER BY payment_date DESC.

---

### list_case_documents

- **Arguments** : p_case_id uuid
- **Retour** : json (tableau)
- **Securite** : SECURITY DEFINER
- **Tables** : documents

ORDER BY uploaded_at DESC.

---

### create_action

- **Arguments** : p_case_id uuid, p_action_type action_type, p_action_date timestamptz, p_result action_result, p_notes text, p_next_action_type action_type, p_next_action_date date, p_next_action_notes text
- **Retour** : json
- **Securite** : SECURITY DEFINER
- **Acces** : admin ou agent

INSERT INTO actions avec created_by = auth.uid().

---

### create_promise

- **Arguments** : p_case_id uuid, p_amount numeric, p_due_date date, p_notes text
- **Retour** : json
- **Securite** : SECURITY DEFINER
- **Acces** : admin ou agent

INSERT INTO promises avec created_by = auth.uid().

---

### update_promise_status

- **Arguments** : p_promise_id uuid, p_status promise_status, p_status_notes text, p_new_due_date date
- **Retour** : json
- **Securite** : SECURITY DEFINER
- **Acces** : admin ou agent

UPDATE status, status_changed_at/by. Si rescheduled, met a jour due_date.

---

### delete_promise

- **Arguments** : p_promise_id uuid
- **Retour** : void
- **Securite** : SECURITY DEFINER
- **Acces** : admin uniquement

---

### create_payment

- **Arguments** : p_case_id uuid, p_amount numeric, p_payment_date date, p_payment_method varchar, p_transaction_reference varchar, p_receipt_path text, p_is_admin boolean
- **Retour** : json
- **Securite** : SECURITY DEFINER
- **Acces** : admin ou agent

Si p_is_admin=true et appelant est admin : status='validated' directement.

---

### validate_payment

- **Arguments** : p_payment_id uuid, p_approved boolean, p_rejection_reason text
- **Retour** : json
- **Securite** : SECURITY DEFINER
- **Acces** : admin uniquement

UPDATE status = 'validated' ou 'rejected' avec validated_by/at.

---

## J. Banques (NOUVEAU)

### list_banks

- **Arguments** : aucun
- **Retour** : json (tableau)
- **Securite** : SECURITY DEFINER
- **Tables** : banks

ORDER BY name. Accessible a tout utilisateur authentifie.

---

### get_bank

- **Arguments** : p_bank_id uuid
- **Retour** : json
- **Securite** : SECURITY DEFINER

---

### create_bank

- **Arguments** : p_data json
- **Retour** : json
- **Securite** : SECURITY DEFINER
- **Acces** : admin uniquement

INSERT avec code, name, address, city, phone, email, is_active, logo_url.

---

### update_bank

- **Arguments** : p_bank_id uuid, p_data json
- **Retour** : json
- **Securite** : SECURITY DEFINER
- **Acces** : admin uniquement

UPDATE conditionnel via `p_data ? 'field'`.

---

### delete_bank

- **Arguments** : p_bank_id uuid
- **Retour** : void
- **Securite** : SECURITY DEFINER
- **Acces** : admin uniquement

---

### update_bank_profile

- **Arguments** : p_bank_id uuid, p_data json
- **Retour** : json
- **Securite** : SECURITY DEFINER
- **Acces** : admin ou bank_user de cette banque

Champs modifiables : name, address, city, phone, email, logo_url.

---

### update_bank_user_profile

- **Arguments** : p_user_id uuid, p_data json
- **Retour** : json
- **Securite** : SECURITY DEFINER
- **Acces** : admin ou l'utilisateur lui-meme

Champs modifiables : full_name, phone, job_title.

---

### toggle_bank_status

- **Arguments** : p_bank_id uuid, p_is_active boolean
- **Retour** : json
- **Securite** : SECURITY DEFINER
- **Acces** : admin uniquement

---

## K. Debiteurs (NOUVEAU)

### list_debtors_pp

- **Arguments** : aucun
- **Retour** : json (tableau)
- **Securite** : SECURITY DEFINER
- **Tables** : debtors_pp

ORDER BY last_name.

---

### list_debtors_pm

- **Arguments** : aucun
- **Retour** : json (tableau)
- **Securite** : SECURITY DEFINER
- **Tables** : debtors_pm

ORDER BY company_name.

---

### list_debtors_pp_by_bank

- **Arguments** : p_bank_id uuid
- **Retour** : json (tableau)
- **Securite** : SECURITY DEFINER
- **Tables** : debtors_pp, cases

Debiteurs PP lies a une banque via les dossiers (SELECT DISTINCT debtor_pp_id FROM cases WHERE bank_id).

---

### list_debtors_pm_by_bank

- **Arguments** : p_bank_id uuid
- **Retour** : json (tableau)
- **Securite** : SECURITY DEFINER
- **Tables** : debtors_pm, cases

Debiteurs PM lies a une banque via les dossiers.

---

### get_debtor_counts_by_bank

- **Arguments** : aucun
- **Retour** : json (objet {bank_id: {pp, pm}})
- **Securite** : SECURITY DEFINER
- **Tables** : cases

COUNT DISTINCT debtor_pp_id/debtor_pm_id GROUP BY bank_id.

---

### create_debtor_pp

- **Arguments** : p_data json
- **Retour** : json
- **Securite** : SECURITY DEFINER
- **Acces** : admin uniquement

INSERT les champs de debtors_pp depuis JSON (first_name, last_name, id_type, id_number, phone_primary, phone_secondary, email, address_street, address_city, address_region, employer, occupation, notes, photo_url).

---

### create_debtor_pm

- **Arguments** : p_data json
- **Retour** : json
- **Securite** : SECURITY DEFINER
- **Acces** : admin uniquement

INSERT tous les champs de debtors_pm depuis JSON, created_by = auth.uid().

---

## L. Imports (NOUVEAU)

### list_imports

- **Arguments** : aucun
- **Retour** : json (tableau avec bank imbrique)
- **Securite** : SECURITY DEFINER
- **Acces** : admin uniquement
- **Tables** : imports, banks

ORDER BY created_at DESC.

---

### get_import

- **Arguments** : p_import_id uuid
- **Retour** : json (avec bank imbrique)
- **Securite** : SECURITY DEFINER
- **Acces** : admin uniquement

---

### list_import_rows

- **Arguments** : p_import_id uuid
- **Retour** : json (tableau)
- **Securite** : SECURITY DEFINER
- **Acces** : admin uniquement
- **Tables** : import_rows

ORDER BY row_number.

---

### create_import

- **Arguments** : p_bank_id uuid, p_uploaded_by uuid, p_file_name varchar
- **Retour** : json
- **Securite** : SECURITY DEFINER
- **Acces** : admin uniquement

INSERT avec file_path vide et status='uploaded'.

---

### delete_import

- **Arguments** : p_import_id uuid
- **Retour** : void
- **Securite** : SECURITY DEFINER
- **Acces** : admin uniquement

---

### update_import_file_path

- **Arguments** : p_import_id uuid, p_file_path text
- **Retour** : json (avec bank imbrique)
- **Securite** : SECURITY DEFINER
- **Acces** : admin uniquement

UPDATE file_path puis retourne l'import complet avec join banks.

---

### toggle_import_row_approval

- **Arguments** : p_row_id uuid, p_is_approved boolean
- **Retour** : void
- **Securite** : SECURITY DEFINER
- **Acces** : admin uniquement

---

### approve_all_valid_rows

- **Arguments** : p_import_id uuid
- **Retour** : void
- **Securite** : SECURITY DEFINER
- **Acces** : admin uniquement

UPDATE is_approved = true WHERE errors IS NULL OR errors = '[]'.

---

### update_import_row

- **Arguments** : p_row_id uuid, p_proposed_json jsonb
- **Retour** : void
- **Securite** : SECURITY DEFINER
- **Acces** : admin uniquement

---

### get_cases_by_import

- **Arguments** : p_import_id uuid
- **Retour** : json (tableau)
- **Securite** : SECURITY DEFINER
- **Acces** : admin uniquement
- **Tables** : audit_logs, cases, banks, debtors_pp, debtors_pm

Trouve les dossiers crees par un import via audit_logs (new_data @> {source: 'import', import_id}).

---

## M. Rapports (NOUVEAU)

### get_bank_report_cases

- **Arguments** : p_bank_id uuid
- **Retour** : json (tableau complet avec joins)
- **Securite** : SECURITY DEFINER
- **Tables** : cases, banks, debtors_pp, debtors_pm, agents

Tous les dossiers d'une banque avec toutes les relations, ORDER BY created_at DESC.

---

### get_bank_report_stats

- **Arguments** : p_bank_id uuid
- **Retour** : json `{totalCases, byStatus, totalAmount, totalPrincipal, totalInterest, totalPenalties, totalFees, totalPaid, totalRemainingBalance}`
- **Securite** : SECURITY DEFINER
- **Tables** : cases

Statistiques financieres completes d'une banque.
