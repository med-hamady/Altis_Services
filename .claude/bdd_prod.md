# Base de Donnees Production - Altis Services

> Document auto-genere a partir de Supabase
> Derniere mise a jour : 2026-03-14

---

## Tables et Architecture

### 1. action_attachments
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| action_id | uuid | NO | - |
| file_name | varchar(255) | NO | - |
| file_path | text | NO | - |
| file_size | int4 | YES | - |
| mime_type | varchar(100) | YES | - |
| uploaded_at | timestamptz | NO | now() |

### 2. actions
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| case_id | uuid | NO | - |
| action_type | action_type (enum) | NO | - |
| action_date | timestamptz | NO | now() |
| result | action_result (enum) | NO | - |
| notes | text | YES | - |
| next_action_type | action_type (enum) | YES | - |
| next_action_date | date | YES | - |
| next_action_notes | text | YES | - |
| created_by | uuid | NO | - |
| created_at | timestamptz | NO | now() |

### 3. admins
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | - |
| email | varchar(255) | NO | - |
| full_name | varchar(255) | NO | - |
| phone | varchar(50) | YES | - |
| is_active | bool | NO | true |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |
| username | varchar(50) | YES | - |

### 4. agents
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | - |
| email | varchar(255) | NO | - |
| full_name | varchar(255) | NO | - |
| phone | varchar(50) | YES | - |
| is_active | bool | NO | true |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |
| username | varchar(50) | YES | - |

### 5. audit_logs
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| table_name | varchar(100) | NO | - |
| record_id | uuid | NO | - |
| operation | varchar(10) | NO | - |
| old_data | jsonb | YES | - |
| new_data | jsonb | YES | - |
| user_id | uuid | YES | - |
| user_type | varchar(20) | YES | - |
| created_at | timestamptz | NO | now() |
| ip_address | inet | YES | - |
| user_agent | text | YES | - |

### 6. bank_contacts
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| bank_id | uuid | NO | - |
| full_name | varchar(255) | NO | - |
| job_title | varchar(100) | YES | - |
| phone | varchar(50) | YES | - |
| email | varchar(255) | YES | - |
| is_primary | bool | NO | false |
| created_at | timestamptz | NO | now() |

### 7. bank_users
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | - |
| email | varchar(255) | NO | - |
| full_name | varchar(255) | NO | - |
| phone | varchar(50) | YES | - |
| bank_id | uuid | NO | - |
| job_title | varchar(100) | YES | - |
| is_active | bool | NO | true |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |
| username | varchar(50) | YES | - |

### 8. banks
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| code | varchar(20) | NO | - |
| name | varchar(255) | NO | - |
| address | text | YES | - |
| city | varchar(100) | YES | - |
| phone | varchar(50) | YES | - |
| email | varchar(255) | YES | - |
| is_active | bool | NO | true |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |
| logo_url | text | YES | - |

### 9. case_extra_info
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| case_id | uuid | NO | - |
| label | text | NO | - |
| value | text | NO | - |
| created_by | uuid | YES | - |
| created_at | timestamptz | NO | now() |

### 10. cases
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| reference | varchar(50) | NO | - |
| bank_id | uuid | NO | - |
| assigned_agent_id | uuid | YES | - |
| debtor_pp_id | uuid | YES | - |
| debtor_pm_id | uuid | YES | - |
| status | case_status (enum) | NO | 'new' |
| default_date | date | YES | - |
| amount_principal | numeric | NO | 0 |
| amount_interest | numeric | NO | 0 |
| amount_penalties | numeric | NO | 0 |
| amount_fees | numeric | NO | 0 |
| closure_reason | closure_reason (enum) | YES | - |
| closure_notes | text | YES | - |
| closed_at | timestamptz | YES | - |
| closed_by | uuid | YES | - |
| notes | text | YES | - |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |
| created_by | uuid | YES | - |
| phase | case_phase (enum) | NO | 'amicable' |
| last_action_at | timestamptz | YES | - |
| last_action_type | text | YES | - |
| next_action_at | timestamptz | YES | - |
| next_action_type | text | YES | - |
| total_paid | numeric | NO | 0 |
| remaining_balance | numeric | NO | 0 |
| has_guarantee | bool | NO | false |

### 11. contact_history
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| debtor_type | varchar(2) | NO | - |
| debtor_id | uuid | NO | - |
| field_name | varchar(50) | NO | - |
| old_value | text | YES | - |
| new_value | text | YES | - |
| changed_by | uuid | NO | - |
| changed_at | timestamptz | NO | now() |

### 12. debtors_pm
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| company_name | varchar(255) | NO | - |
| trade_name | varchar(255) | YES | - |
| rc_number | varchar(100) | YES | - |
| nif | varchar(100) | YES | - |
| legal_rep_name | varchar(255) | YES | - |
| legal_rep_title | varchar(100) | YES | - |
| legal_rep_phone | varchar(50) | YES | - |
| phone_primary | varchar(50) | YES | - |
| phone_secondary | varchar(50) | YES | - |
| email | varchar(255) | YES | - |
| website | varchar(255) | YES | - |
| address_street | text | YES | - |
| address_city | varchar(100) | YES | - |
| address_region | varchar(100) | YES | - |
| sector_activity | varchar(100) | YES | - |
| notes | text | YES | - |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |
| created_by | uuid | YES | - |
| alt_contact_name | varchar(255) | YES | - |
| alt_contact_relation | varchar(100) | YES | - |
| alt_contact_phone | varchar(50) | YES | - |

### 13. debtors_pp
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| first_name | varchar(100) | NO | - |
| last_name | varchar(100) | NO | - |
| id_type | varchar(50) | YES | - |
| id_number | varchar(100) | YES | - |
| phone_primary | varchar(50) | YES | - |
| phone_secondary | varchar(50) | YES | - |
| email | varchar(255) | YES | - |
| address_street | text | YES | - |
| address_city | varchar(100) | YES | - |
| address_region | varchar(100) | YES | - |
| employer | varchar(255) | YES | - |
| occupation | varchar(100) | YES | - |
| notes | text | YES | - |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |
| photo_url | text | YES | - |

### 14. documents
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| case_id | uuid | NO | - |
| file_name | varchar(255) | NO | - |
| file_path | text | NO | - |
| file_size | int4 | YES | - |
| mime_type | varchar(100) | YES | - |
| category | document_category (enum) | NO | 'other' |
| visibility | document_visibility (enum) | NO | 'internal' |
| description | text | YES | - |
| uploaded_by | uuid | NO | - |
| uploaded_at | timestamptz | NO | now() |

### 15. import_rows
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| import_id | uuid | NO | - |
| row_number | int4 | NO | - |
| raw_json | jsonb | NO | '{}' |
| proposed_json | jsonb | NO | '{}' |
| errors | jsonb | YES | '[]' |
| warnings | jsonb | YES | '[]' |
| confidence | jsonb | YES | '{}' |
| is_approved | bool | NO | false |
| created_at | timestamptz | NO | now() |

### 16. imports
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| bank_id | uuid | NO | - |
| uploaded_by | uuid | NO | - |
| file_path | text | NO | - |
| file_name | varchar(255) | YES | - |
| status | import_status (enum) | NO | 'uploaded' |
| error_message | text | YES | - |
| total_rows | int4 | YES | 0 |
| valid_rows | int4 | YES | 0 |
| error_rows | int4 | YES | 0 |
| warning_rows | int4 | YES | 0 |
| created_at | timestamptz | NO | now() |
| processed_at | timestamptz | YES | - |
| approved_at | timestamptz | YES | - |
| approved_by | uuid | YES | - |

### 17. payments
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| case_id | uuid | NO | - |
| amount | numeric | NO | - |
| payment_date | date | NO | - |
| payment_method | varchar(50) | YES | - |
| transaction_reference | varchar(100) | YES | - |
| status | payment_status (enum) | NO | 'pending' |
| validated_by | uuid | YES | - |
| validated_at | timestamptz | YES | - |
| rejection_reason | text | YES | - |
| declared_by | uuid | NO | - |
| declared_at | timestamptz | NO | now() |
| receipt_path | text | YES | - |

### 18. promises
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| case_id | uuid | NO | - |
| amount | numeric | NO | - |
| due_date | date | NO | - |
| status | promise_status (enum) | NO | 'pending' |
| status_changed_at | timestamptz | YES | - |
| status_changed_by | uuid | YES | - |
| status_notes | text | YES | - |
| created_by | uuid | NO | - |
| created_at | timestamptz | NO | now() |
| notes | text | YES | - |

### 19. proposals
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| case_id | uuid | NO | FK → cases(id) ON DELETE CASCADE |
| created_by | uuid | NO | - |
| type | proposal_type (enum) | NO | - |
| amount | numeric(15,2) | YES | - |
| monthly_amount | numeric(15,2) | YES | - |
| start_date | date | YES | - |
| end_date | date | YES | - |
| duration_months | int4 | YES | - |
| status | proposal_status (enum) | NO | 'pending' |
| decision_by | uuid | YES | - |
| decision_at | timestamptz | YES | - |
| decision_note | text | YES | - |
| parent_proposal_id | uuid | YES | FK → proposals(id) |
| notes | text | YES | - |
| created_at | timestamptz | NO | now() |

### 20. proposal_items
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| proposal_id | uuid | NO | FK → proposals(id) ON DELETE CASCADE |
| due_date | date | NO | - |
| amount | numeric(15,2) | NO | CHECK > 0 |
| sort_order | int4 | NO | 0 |
| notes | text | YES | - |

### 21. action_notifications
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| action_id | uuid | NO | - |
| case_id | uuid | NO | - |
| agent_id | uuid | NO | - |
| notification_type | varchar(20) | NO | 'email' |
| sent_at | timestamptz | NO | now() |

> **Note** : promises.proposal_id (uuid, nullable, FK → proposals(id)) ajoute par migration 051

---

## Contraintes (PK, FK, Unique)

### Cles Primaires (PK)

| Table | Contrainte | Colonne |
|-------|-----------|---------|
| action_attachments | action_attachments_pkey | id |
| actions | actions_pkey | id |
| admins | admins_pkey | id |
| agents | agents_pkey | id |
| audit_logs | audit_logs_pkey | id |
| bank_contacts | bank_contacts_pkey | id |
| bank_users | bank_users_pkey | id |
| banks | banks_pkey | id |
| case_extra_info | case_extra_info_pkey | id |
| cases | cases_pkey | id |
| contact_history | contact_history_pkey | id |
| debtors_pm | debtors_pm_pkey | id |
| debtors_pp | debtors_pp_pkey | id |
| documents | documents_pkey | id |
| import_rows | import_rows_pkey | id |
| imports | imports_pkey | id |
| payments | payments_pkey | id |
| promises | promises_pkey | id |
| proposals | proposals_pkey | id |
| proposal_items | proposal_items_pkey | id |
| action_notifications | action_notifications_pkey | id |

### Cles Etrangeres (FK)

| Table | Contrainte | Colonne | Table cible | Colonne cible |
|-------|-----------|---------|-------------|---------------|
| action_attachments | action_attachments_action_id_fkey | action_id | actions | id |
| actions | actions_case_id_fkey | case_id | cases | id |
| admins | admins_id_fkey | id | auth.users | id |
| agents | agents_id_fkey | id | auth.users | id |
| bank_contacts | bank_contacts_bank_id_fkey | bank_id | banks | id |
| bank_users | bank_users_id_fkey | id | auth.users | id |
| bank_users | bank_users_bank_id_fkey | bank_id | banks | id |
| case_extra_info | case_extra_info_case_id_fkey | case_id | cases | id |
| case_extra_info | case_extra_info_created_by_fkey | created_by | auth.users | id |
| cases | cases_bank_id_fkey | bank_id | banks | id |
| cases | cases_assigned_agent_id_fkey | assigned_agent_id | agents | id |
| cases | cases_debtor_pp_id_fkey | debtor_pp_id | debtors_pp | id |
| cases | cases_debtor_pm_id_fkey | debtor_pm_id | debtors_pm | id |
| cases | cases_closed_by_fkey | closed_by | admins | id |
| documents | documents_case_id_fkey | case_id | cases | id |
| import_rows | import_rows_import_id_fkey | import_id | imports | id |
| imports | imports_bank_id_fkey | bank_id | banks | id |
| payments | payments_case_id_fkey | case_id | cases | id |
| payments | payments_validated_by_fkey | validated_by | admins | id |
| promises | promises_case_id_fkey | case_id | cases | id |
| promises | promises_proposal_id_fkey | proposal_id | proposals | id |
| proposals | proposals_case_id_fkey | case_id | cases | id |
| proposals | proposals_parent_proposal_id_fkey | parent_proposal_id | proposals | id |
| proposal_items | proposal_items_proposal_id_fkey | proposal_id | proposals | id |
| action_notifications | action_notifications_action_id_fkey | action_id | actions | id |
| action_notifications | action_notifications_case_id_fkey | case_id | cases | id |

### Contraintes Unique

| Table | Contrainte | Colonne |
|-------|-----------|---------|
| admins | admins_email_key | email |
| admins | admins_username_key | username |
| agents | agents_email_key | email |
| agents | agents_username_key | username |
| bank_users | bank_users_email_key | email |
| bank_users | bank_users_username_key | username |
| banks | banks_code_key | code |
| cases | cases_reference_key | reference |
| action_notifications | action_notifications_action_id_key | action_id |

## RLS - Row Level Security

### Statut RLS par table

> **Toutes les tables ont RLS active (rls_enabled = true, rls_forced = false)**

Tables avec RLS : action_attachments, action_notifications, actions, admins, agents, audit_logs, bank_contacts, bank_users, banks, case_extra_info, cases, contact_history, debtors_pm, debtors_pp, documents, import_rows, imports, payments, promises, proposals, proposal_items

### Politiques RLS

#### action_attachments
| Policy | Cmd | Roles | Condition (qual) | With Check |
|--------|-----|-------|-------------------|------------|
| action_attachments_select | SELECT | authenticated | true | - |
| action_attachments_insert | INSERT | authenticated | - | is_admin() OR is_agent() |
| action_attachments_update | UPDATE | authenticated | is_admin() | - |
| action_attachments_delete | DELETE | authenticated | is_admin() | - |

#### action_notifications
| Policy | Cmd | Roles | Condition (qual) | With Check |
|--------|-----|-------|-------------------|------------|
| action_notifications_admin_select | SELECT | authenticated | EXISTS (SELECT 1 FROM admins WHERE id = auth.uid() AND is_active) | - |
| action_notifications_service_insert | INSERT | authenticated, service_role | - | true |

#### actions
| Policy | Cmd | Roles | Condition (qual) | With Check |
|--------|-----|-------|-------------------|------------|
| actions_select | SELECT | authenticated | true | - |
| actions_insert | INSERT | authenticated | - | is_admin() OR is_agent() |
| actions_update | UPDATE | authenticated | is_admin() | - |
| actions_delete | DELETE | authenticated | is_admin() | - |

#### admins
| Policy | Cmd | Roles | Condition (qual) | With Check |
|--------|-----|-------|-------------------|------------|
| admins_select | SELECT | authenticated | true | - |
| admins_insert | INSERT | authenticated | - | true |
| admins_update | UPDATE | authenticated | id = auth.uid() OR is_admin() | - |
| admins_delete | DELETE | authenticated | false | - |

#### agents
| Policy | Cmd | Roles | Condition (qual) | With Check |
|--------|-----|-------|-------------------|------------|
| agents_select | SELECT | authenticated | true | - |
| agents_insert | INSERT | authenticated | - | true |
| agents_update | UPDATE | authenticated | id = auth.uid() OR is_admin() | - |
| agents_delete | DELETE | authenticated | false | - |

#### audit_logs
| Policy | Cmd | Roles | Condition (qual) | With Check |
|--------|-----|-------|-------------------|------------|
| audit_logs_select | SELECT | authenticated | is_admin() | - |
| audit_logs_service_all | ALL | service_role | true | true |

#### bank_contacts
| Policy | Cmd | Roles | Condition (qual) | With Check |
|--------|-----|-------|-------------------|------------|
| bank_contacts_select | SELECT | authenticated | true | - |
| bank_contacts_insert | INSERT | authenticated | - | is_admin() |
| bank_contacts_update | UPDATE | authenticated | is_admin() | - |
| bank_contacts_delete | DELETE | authenticated | is_admin() | - |

#### bank_users
| Policy | Cmd | Roles | Condition (qual) | With Check |
|--------|-----|-------|-------------------|------------|
| bank_users_select | SELECT | authenticated | true | - |
| bank_users_insert | INSERT | authenticated | - | true |
| bank_users_update | UPDATE | authenticated | id = auth.uid() OR is_admin() | - |
| bank_users_delete | DELETE | authenticated | false | - |

#### banks
| Policy | Cmd | Roles | Condition (qual) | With Check |
|--------|-----|-------|-------------------|------------|
| banks_select | SELECT | authenticated | true | - |
| banks_insert | INSERT | authenticated | - | is_admin() |
| banks_update | UPDATE | authenticated | is_admin() | - |
| banks_bankuser_update | UPDATE | authenticated | is_bank_user() AND id = get_bank_user_bank_id() | - |
| banks_delete | DELETE | authenticated | is_admin() | - |

#### case_extra_info
| Policy | Cmd | Roles | Condition (qual) | With Check |
|--------|-----|-------|-------------------|------------|
| case_extra_info_select | SELECT | authenticated | true | - |
| case_extra_info_insert | INSERT | authenticated | - | true |
| case_extra_info_delete | DELETE | authenticated | EXISTS(SELECT 1 FROM admins WHERE id=auth.uid() AND is_active=true) | - |

#### cases
| Policy | Cmd | Roles | Condition (qual) | With Check |
|--------|-----|-------|-------------------|------------|
| cases_select | SELECT | authenticated | is_admin() OR (is_agent() AND assigned_agent_id=auth.uid()) OR bank_id=get_user_bank_id() | - |
| cases_insert | INSERT | authenticated | - | is_admin() |
| cases_update | UPDATE | authenticated | is_admin() OR (is_agent() AND assigned_agent_id=auth.uid()) | - |
| cases_delete | DELETE | authenticated | is_admin() | - |
| cases_service_all | ALL | service_role | true | true |

#### contact_history
| Policy | Cmd | Roles | Condition (qual) | With Check |
|--------|-----|-------|-------------------|------------|
| contact_history_select | SELECT | authenticated | is_admin() | - |

#### debtors_pm
| Policy | Cmd | Roles | Condition (qual) | With Check |
|--------|-----|-------|-------------------|------------|
| debtors_pm_select | SELECT | authenticated | true | - |
| debtors_pm_insert | INSERT | authenticated | - | is_admin() |
| debtors_pm_update | UPDATE | authenticated | is_admin() | - |
| debtors_pm_delete | DELETE | authenticated | is_admin() | - |
| debtors_pm_service_all | ALL | service_role | true | true |

#### debtors_pp
| Policy | Cmd | Roles | Condition (qual) | With Check |
|--------|-----|-------|-------------------|------------|
| debtors_pp_select | SELECT | authenticated | true | - |
| debtors_pp_insert | INSERT | authenticated | - | is_admin() |
| debtors_pp_update | UPDATE | authenticated | is_admin() | - |
| debtors_pp_delete | DELETE | authenticated | is_admin() | - |
| debtors_pp_service_all | ALL | service_role | true | true |

#### documents
| Policy | Cmd | Roles | Condition (qual) | With Check |
|--------|-----|-------|-------------------|------------|
| documents_select | SELECT | authenticated | true | - |
| documents_insert | INSERT | authenticated | - | is_admin() OR is_agent() |
| documents_update | UPDATE | authenticated | is_admin() | - |
| documents_delete | DELETE | authenticated | is_admin() | - |

#### import_rows
| Policy | Cmd | Roles | Condition (qual) | With Check |
|--------|-----|-------|-------------------|------------|
| import_rows_admin_all | ALL | authenticated | is_admin() | is_admin() |
| import_rows_service_all | ALL | service_role | true | true |

#### imports
| Policy | Cmd | Roles | Condition (qual) | With Check |
|--------|-----|-------|-------------------|------------|
| imports_admin_all | ALL | authenticated | is_admin() | is_admin() |
| imports_service_all | ALL | service_role | true | true |

#### payments
| Policy | Cmd | Roles | Condition (qual) | With Check |
|--------|-----|-------|-------------------|------------|
| payments_select | SELECT | authenticated | true | - |
| payments_insert | INSERT | authenticated | - | is_admin() OR is_agent() |
| payments_update | UPDATE | authenticated | is_admin() | - |
| payments_delete | DELETE | authenticated | is_admin() | - |

#### promises
| Policy | Cmd | Roles | Condition (qual) | With Check |
|--------|-----|-------|-------------------|------------|
| promises_select | SELECT | authenticated | true | - |
| promises_insert | INSERT | authenticated | - | is_admin() OR is_agent() |
| promises_update | UPDATE | authenticated | is_admin() | - |
| promises_delete | DELETE | authenticated | is_admin() | - |

#### proposals
| Policy | Cmd | Roles | Condition (qual) | With Check |
|--------|-----|-------|-------------------|------------|
| proposals_admin_all | ALL | authenticated | is_admin() | is_admin() |
| proposals_agent_select | SELECT | authenticated | is_agent() AND agent_has_case(case_id) | - |
| proposals_agent_insert | INSERT | authenticated | - | is_agent() AND agent_has_case(case_id) AND created_by = auth.uid() |
| proposals_agent_update | UPDATE | authenticated | is_agent() AND agent_has_case(case_id) | is_agent() AND agent_has_case(case_id) |
| proposals_bankuser_select | SELECT | authenticated | is_bank_user() AND case_belongs_to_user_bank(case_id) AND status = 'accepted' | - |

#### proposal_items
| Policy | Cmd | Roles | Condition (qual) | With Check |
|--------|-----|-------|-------------------|------------|
| proposal_items_admin_all | ALL | authenticated | is_admin() | is_admin() |
| proposal_items_agent_select | SELECT | authenticated | is_agent() AND EXISTS(proposals p: agent_has_case(p.case_id)) | - |
| proposal_items_agent_insert | INSERT | authenticated | - | is_agent() AND EXISTS(proposals p: agent_has_case(p.case_id)) |
| proposal_items_bankuser_select | SELECT | authenticated | is_bank_user() AND EXISTS(proposals p: status='accepted' AND case_belongs_to_user_bank) | - |

---

## Index

### action_attachments
| Index | Definition |
|-------|-----------|
| action_attachments_pkey | UNIQUE btree (id) |
| idx_action_attachments_action | btree (action_id) |

### actions
| Index | Definition |
|-------|-----------|
| actions_pkey | UNIQUE btree (id) |
| idx_actions_case | btree (case_id) |
| idx_actions_created_by | btree (created_by) |
| idx_actions_date | btree (action_date DESC) |
| idx_actions_next | btree (next_action_date) WHERE next_action_date IS NOT NULL |

### admins
| Index | Definition |
|-------|-----------|
| admins_pkey | UNIQUE btree (id) |
| admins_email_key | UNIQUE btree (email) |
| admins_username_key | UNIQUE btree (username) |
| idx_admins_active | btree (is_active) WHERE is_active = true |
| idx_admins_email | btree (email) |

### agents
| Index | Definition |
|-------|-----------|
| agents_pkey | UNIQUE btree (id) |
| agents_email_key | UNIQUE btree (email) |
| agents_username_key | UNIQUE btree (username) |
| idx_agents_active | btree (is_active) WHERE is_active = true |
| idx_agents_email | btree (email) |

### audit_logs
| Index | Definition |
|-------|-----------|
| audit_logs_pkey | UNIQUE btree (id) |
| idx_audit_logs_date | btree (created_at DESC) |
| idx_audit_logs_table_record | btree (table_name, record_id) |
| idx_audit_logs_user | btree (user_id) WHERE user_id IS NOT NULL |

### bank_contacts
| Index | Definition |
|-------|-----------|
| bank_contacts_pkey | UNIQUE btree (id) |
| idx_bank_contacts_bank | btree (bank_id) |

### bank_users
| Index | Definition |
|-------|-----------|
| bank_users_pkey | UNIQUE btree (id) |
| bank_users_email_key | UNIQUE btree (email) |
| bank_users_username_key | UNIQUE btree (username) |
| idx_bank_users_active | btree (is_active) WHERE is_active = true |
| idx_bank_users_bank | btree (bank_id) |
| idx_bank_users_email | btree (email) |

### banks
| Index | Definition |
|-------|-----------|
| banks_pkey | UNIQUE btree (id) |
| banks_code_key | UNIQUE btree (code) |
| idx_banks_active | btree (is_active) WHERE is_active = true |
| idx_banks_code | btree (code) |

### case_extra_info
| Index | Definition |
|-------|-----------|
| case_extra_info_pkey | UNIQUE btree (id) |
| idx_case_extra_info_case_id | btree (case_id) |

### cases
| Index | Definition |
|-------|-----------|
| cases_pkey | UNIQUE btree (id) |
| cases_reference_key | UNIQUE btree (reference) |
| idx_cases_agent | btree (assigned_agent_id) WHERE assigned_agent_id IS NOT NULL |
| idx_cases_agent_status | btree (assigned_agent_id, status) WHERE assigned_agent_id IS NOT NULL |
| idx_cases_bank | btree (bank_id) |
| idx_cases_bank_status | btree (bank_id, status) |
| idx_cases_created | btree (created_at DESC) |
| idx_cases_debtor_pm | btree (debtor_pm_id) WHERE debtor_pm_id IS NOT NULL |
| idx_cases_debtor_pp | btree (debtor_pp_id) WHERE debtor_pp_id IS NOT NULL |
| idx_cases_has_guarantee | btree (has_guarantee) |
| idx_cases_status | btree (status) |

### contact_history
| Index | Definition |
|-------|-----------|
| contact_history_pkey | UNIQUE btree (id) |
| idx_contact_history_debtor | btree (debtor_type, debtor_id) |

### debtors_pm
| Index | Definition |
|-------|-----------|
| debtors_pm_pkey | UNIQUE btree (id) |
| idx_debtors_pm_name | btree (company_name) |
| idx_debtors_pm_nif | btree (nif) WHERE nif IS NOT NULL |
| idx_debtors_pm_rc | btree (rc_number) WHERE rc_number IS NOT NULL |

### debtors_pp
| Index | Definition |
|-------|-----------|
| debtors_pp_pkey | UNIQUE btree (id) |
| idx_debtors_pp_id_number | btree (id_number) WHERE id_number IS NOT NULL |
| idx_debtors_pp_name | btree (last_name, first_name) |
| idx_debtors_pp_phone | btree (phone_primary) WHERE phone_primary IS NOT NULL |

### documents
| Index | Definition |
|-------|-----------|
| documents_pkey | UNIQUE btree (id) |
| idx_documents_case | btree (case_id) |
| idx_documents_category | btree (category) |
| idx_documents_visibility | btree (visibility) |

### import_rows
| Index | Definition |
|-------|-----------|
| import_rows_pkey | UNIQUE btree (id) |
| idx_import_rows_import | btree (import_id) |
| idx_import_rows_approved | btree (import_id, is_approved) |

### imports
| Index | Definition |
|-------|-----------|
| imports_pkey | UNIQUE btree (id) |
| idx_imports_bank | btree (bank_id) |
| idx_imports_created | btree (created_at DESC) |
| idx_imports_status | btree (status) |
| idx_imports_uploaded_by | btree (uploaded_by) |

### payments
| Index | Definition |
|-------|-----------|
| payments_pkey | UNIQUE btree (id) |
| idx_payments_case | btree (case_id) |
| idx_payments_date | btree (payment_date DESC) |
| idx_payments_pending | btree (declared_at) WHERE status = 'pending' |
| idx_payments_status | btree (status) |

### promises
| Index | Definition |
|-------|-----------|
| promises_pkey | UNIQUE btree (id) |
| idx_promises_case | btree (case_id) |
| idx_promises_due | btree (due_date) |
| idx_promises_pending | btree (due_date) WHERE status = 'pending' |
| idx_promises_proposal | btree (proposal_id) |
| idx_promises_status | btree (status) |

### proposals
| Index | Definition |
|-------|-----------|
| proposals_pkey | UNIQUE btree (id) |
| idx_proposals_case | btree (case_id) |
| idx_proposals_status | btree (status) |
| idx_proposals_parent | btree (parent_proposal_id) |

### proposal_items
| Index | Definition |
|-------|-----------|
| proposal_items_pkey | UNIQUE btree (id) |
| idx_proposal_items_proposal | btree (proposal_id) |

### action_notifications
| Index | Definition |
|-------|-----------|
| action_notifications_pkey | UNIQUE btree (id) |
| action_notifications_action_id_key | UNIQUE btree (action_id) |
| idx_action_notifications_action_id | btree (action_id) |

---

## Enums / Types personnalises

### action_result
`reached` | `unreachable` | `refused` | `promise` | `partial_payment` | `full_payment` | `dispute` | `callback` | `wrong_number` | `other`

### action_type
`call` | `visit` | `sms` | `email` | `letter` | `meeting` | `other`

### case_phase
`amicable` | `pre_legal` | `legal`

### case_status
`new` | `assigned` | `in_progress` | `promise` | `partial_payment` | `paid` | `closed`

### closure_reason
`fully_paid` | `negotiated` | `unreachable` | `disputed` | `bankrupt` | `deceased` | `transferred` | `cancelled`

### document_category
`contract` | `statement` | `id_card` | `payment_proof` | `field_report` | `correspondence` | `legal` | `other`

### document_visibility
`internal` | `bank` | `agent`

### import_status
`uploaded` | `processing` | `ready_for_review` | `approved` | `rejected` | `failed`

### payment_status
`pending` | `validated` | `rejected`

### promise_status
`pending` | `kept` | `broken` | `rescheduled`

### proposal_type
`monthly` | `one_time` | `schedule`

### proposal_status
`pending` | `accepted` | `rejected` | `countered` | `expired`

---

## Fonctions RPC (84 fonctions)

### Helpers d'authentification (6 fonctions)
| Fonction | Retour | Description |
|----------|--------|-------------|
| `is_admin()` | boolean | Verifie si l'utilisateur courant est un admin actif |
| `is_agent()` | boolean | Verifie si l'utilisateur courant est un agent actif |
| `is_bank_user()` | boolean | Verifie si l'utilisateur courant est un bank_user actif |
| `get_user_bank_id()` | uuid | Retourne le bank_id du bank_user courant |
| `get_bank_user_bank_id()` | uuid | Alias de get_user_bank_id (compatibilite RLS) |
| `get_user_type(p_user_id uuid)` | text | Retourne le type d'utilisateur ('admin', 'agent', 'bank_user') |

### Gestion des mots de passe et utilisateurs (2 fonctions)
| Fonction | Parametres | Description |
|----------|-----------|-------------|
| `change_user_password` | p_user_id uuid, p_new_password text | Change le mot de passe d'un utilisateur (admin only) |
| `delete_auth_user` | p_user_id uuid | Supprime un utilisateur de auth.users (admin only) |

### Authentification / Profil (1 fonction)
| Fonction | Parametres | Retour | Description |
|----------|-----------|--------|-------------|
| `get_user_profile` | p_user_id uuid | json | Cherche dans admins, agents, bank_users et retourne profil + user_type |

### Gestion des utilisateurs (9 fonctions)
| Fonction | Parametres | Description |
|----------|-----------|-------------|
| `list_admins` | - | Liste tous les admins tries par full_name |
| `create_admin` | p_data json | Cree un profil admin |
| `update_admin` | p_user_id uuid, p_data json | Met a jour un profil admin |
| `list_agents` | - | Liste tous les agents tries par full_name |
| `create_agent` | p_data json | Cree un profil agent |
| `update_agent` | p_user_id uuid, p_data json | Met a jour un profil agent |
| `list_bank_users` | - | Liste tous les bank_users avec nom de banque |
| `create_bank_user` | p_data json | Cree un profil bank_user |
| `update_bank_user` | p_user_id uuid, p_data json | Met a jour un profil bank_user |

### Dashboard / Statistiques (6 fonctions)
| Fonction | Parametres | Retour | Description |
|----------|-----------|--------|-------------|
| `get_admin_stats` | - | json | Stats admin : total dossiers, actifs, banques, agents, garanties, propositions (pending/accepted/countered) |
| `get_agent_stats` | p_agent_id uuid | json | Stats agent : mes dossiers, a traiter, promesses a venir, clos ce mois |
| `get_bank_user_stats` | p_bank_id uuid | json | Stats banque : total, taux recouvrement (2 dec), montant recouvre, garanties, propositions (pending/accepted/countered) |
| `get_case_ids_by_proposal_status` | p_proposal_status text | json | Liste des case_id ayant une proposition du statut donne (filtre par role) |
| `get_recent_actions` | p_user_id uuid, p_role text | json[] | 15 dernieres actions avec infos dossier/debiteur |
| `get_upcoming_promises` | p_user_id uuid, p_role text | json[] | Promesses a venir 7 jours avec infos dossier/debiteur |

### Gestion des dossiers (5 fonctions)
| Fonction | Parametres | Description |
|----------|-----------|-------------|
| `list_cases` | p_user_id uuid, p_role text, p_bank_id uuid | Liste dossiers actifs filtre par role |
| `list_archived_cases` | p_user_id uuid, p_role text, p_bank_id uuid | Liste dossiers archives filtre par role |
| `create_case` | p_data json | Cree un dossier (admin only) |
| `get_case_detail` | p_case_id uuid | Detail complet d'un dossier avec joins |
| `update_case` | p_case_id uuid, p_data json | Met a jour les champs d'un dossier |

### Actions sur les dossiers (3 fonctions)
| Fonction | Parametres | Description |
|----------|-----------|-------------|
| `assign_agent` | p_case_id uuid, p_agent_id uuid | Assigne/retire un agent d'un dossier |
| `create_action` | p_case_id, p_action_type, p_action_date, p_result, p_notes, p_next_* | Cree une action sur un dossier |
| `update_action` | p_action_id, p_action_type, p_action_date, p_result, p_notes, p_next_* | Modifie une action (admin: toutes ; agent: les siennes) |

### Promesses (4 fonctions)
| Fonction | Parametres | Description |
|----------|-----------|-------------|
| `list_case_promises` | p_case_id uuid | Liste les promesses d'un dossier |
| `create_promise` | p_case_id, p_amount, p_due_date, p_notes | Cree une promesse |
| `update_promise_status` | p_promise_id, p_status, p_status_notes, p_new_due_date | Met a jour le statut |
| `delete_promise` | p_promise_id uuid | Supprime une promesse |

### Propositions (6 fonctions)
| Fonction | Parametres | Description |
|----------|-----------|-------------|
| `list_case_proposals` | p_case_id uuid | Liste les propositions avec items et nom createur |
| `create_proposal` | p_case_id, p_type, p_amount, p_monthly_amount, p_start_date, p_duration_months, p_due_date, p_items json, p_notes | Cree une proposition avec items auto-generes |
| `accept_proposal` | p_proposal_id, p_decision_note | Accepte et genere les promesses (admin) |
| `reject_proposal` | p_proposal_id, p_decision_note | Rejette avec motif obligatoire (admin) |
| `counter_proposal` | p_parent_proposal_id + params create_proposal | Contre-proposition (marque ancienne countered) |
| `delete_proposal` | p_proposal_id uuid | Supprime une proposition pending (admin) |

### Paiements (3 fonctions)
| Fonction | Parametres | Description |
|----------|-----------|-------------|
| `list_case_payments` | p_case_id uuid | Liste les paiements d'un dossier |
| `create_payment` | p_case_id, p_amount, p_payment_date, p_payment_method, p_transaction_reference, p_receipt_path, p_is_admin | Declare un paiement |
| `validate_payment` | p_payment_id, p_approved, p_rejection_reason | Valide ou rejette un paiement |

### Documents et Actions (2 fonctions)
| Fonction | Parametres | Description |
|----------|-----------|-------------|
| `list_case_actions` | p_case_id uuid | Liste les actions d'un dossier |
| `list_case_documents` | p_case_id uuid | Liste les documents d'un dossier |

### Banques (8 fonctions)
| Fonction | Parametres | Description |
|----------|-----------|-------------|
| `list_banks` | - | Liste toutes les banques |
| `get_bank` | p_bank_id uuid | Detail d'une banque |
| `create_bank` | p_data json | Cree une banque |
| `update_bank` | p_bank_id uuid, p_data jsonb | Met a jour une banque |
| `delete_bank` | p_bank_id uuid | Supprime une banque |
| `update_bank_profile` | p_bank_id uuid, p_data json | Modifie profil banque (bank_user) |
| `update_bank_user_profile` | p_user_id uuid, p_data json | Modifie profil bank_user |
| `toggle_bank_status` | p_bank_id uuid, p_is_active boolean | Active/desactive une banque |

### Debiteurs (7 fonctions)
| Fonction | Parametres | Description |
|----------|-----------|-------------|
| `list_debtors_pp` | - | Liste tous les debiteurs PP |
| `list_debtors_pm` | - | Liste tous les debiteurs PM |
| `list_debtors_pp_by_bank` | p_bank_id uuid | Debiteurs PP lies a une banque |
| `list_debtors_pm_by_bank` | p_bank_id uuid | Debiteurs PM lies a une banque |
| `get_debtor_counts_by_bank` | - | Comptages PP/PM par banque |
| `create_debtor_pp` | p_data json | Cree un debiteur PP |
| `create_debtor_pm` | p_data json | Cree un debiteur PM |

### Imports (8 fonctions)
| Fonction | Parametres | Description |
|----------|-----------|-------------|
| `list_imports` | - | Liste tous les imports avec nom banque |
| `get_import` | p_import_id uuid | Detail d'un import |
| `list_import_rows` | p_import_id uuid | Lignes d'un import |
| `create_import` | p_bank_id, p_file_path, p_file_name | Cree un enregistrement import |
| `delete_import` | p_import_id uuid | Supprime un import |
| `update_import_file_path` | p_import_id uuid, p_file_path text | Met a jour le file_path |
| `toggle_import_row_approval` | p_row_id uuid, p_approved boolean | Approuve/desapprouve une ligne |
| `approve_all_valid_rows` | p_import_id uuid | Approuve toutes les lignes sans erreur |

### Imports (suite) (2 fonctions)
| Fonction | Parametres | Description |
|----------|-----------|-------------|
| `update_import_row` | p_row_id uuid, p_proposed_json jsonb | Met a jour le proposed_json |
| `get_cases_by_import` | p_import_id uuid | Dossiers crees par un import |

### Rapports (2 fonctions)
| Fonction | Parametres | Description |
|----------|-----------|-------------|
| `get_bank_report_cases` | p_bank_id uuid | Dossiers d'une banque pour rapport PDF |
| `get_bank_report_stats` | p_bank_id uuid | Stats financieres d'une banque |

### Informations complementaires (3 fonctions)
| Fonction | Parametres | Description |
|----------|-----------|-------------|
| `get_case_extra_info` | p_case_id uuid | Infos complementaires d'un dossier |
| `create_case_extra_info` | p_case_id uuid, p_label text, p_value text | Ajoute une info complementaire |
| `delete_case_extra_info` | p_id uuid | Supprime une info complementaire |

### Notifications (3 fonctions)
| Fonction | Parametres | Description |
|----------|-----------|-------------|
| `get_admin_emails` | - | Emails des admins actifs (pour notifications) |
| `get_pending_action_notifications` | - | Actions planifiees du jour/en retard non encore notifiees |
| `mark_action_notification_sent` | p_action_id uuid, p_case_id uuid, p_agent_id uuid | Marque une action comme notifiee |

### Helpers internes (1 fonction)
| Fonction | Parametres | Description |
|----------|-----------|-------------|
| `_build_case_json` | p_case cases | Construit le JSON complet d'un dossier avec joins |

> **Code source complet** : voir `.claude/rpc_functions_code.md`
