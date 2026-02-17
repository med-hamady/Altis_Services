# Triggers - Code Source Complet

> Document auto-genere a partir de Supabase
> Derniere mise a jour : 2026-02-17

---

## Recapitulatif des Triggers

| Table | Trigger | Timing | Event | Fonction |
|-------|---------|--------|-------|----------|
| actions | trg_action_insert | AFTER | INSERT | trg_after_action_insert() |
| admins | tr_admins_audit | AFTER | INSERT, UPDATE, DELETE | audit_trigger_function() |
| admins | tr_admins_updated_at | BEFORE | UPDATE | update_updated_at_column() |
| agents | tr_agents_audit | AFTER | INSERT, UPDATE, DELETE | audit_trigger_function() |
| agents | tr_agents_updated_at | BEFORE | UPDATE | update_updated_at_column() |
| bank_users | tr_bank_users_audit | AFTER | INSERT, UPDATE, DELETE | audit_trigger_function() |
| bank_users | tr_bank_users_updated_at | BEFORE | UPDATE | update_updated_at_column() |
| banks | tr_banks_audit | AFTER | INSERT, UPDATE, DELETE | audit_trigger_function() |
| banks | tr_banks_updated_at | BEFORE | UPDATE | update_updated_at_column() |
| cases | tr_cases_audit | AFTER | INSERT, UPDATE, DELETE | audit_trigger_function() |
| cases | tr_cases_set_reference | BEFORE | INSERT | set_case_reference() |
| cases | tr_cases_updated_at | BEFORE | UPDATE | update_updated_at_column() |
| cases | trg_cases_balance_insert | BEFORE | INSERT | trg_cases_compute_balance() |
| cases | trg_cases_balance_update | BEFORE | UPDATE | trg_cases_compute_balance() |
| cases | trg_update_has_guarantee | BEFORE | INSERT, UPDATE | update_has_guarantee() |
| debtors_pm | tr_debtors_pm_contact_history | AFTER | UPDATE | track_contact_changes() |
| debtors_pm | tr_debtors_pm_updated_at | BEFORE | UPDATE | update_updated_at_column() |
| debtors_pp | tr_debtors_pp_contact_history | AFTER | UPDATE | track_contact_changes() |
| debtors_pp | tr_debtors_pp_updated_at | BEFORE | UPDATE | update_updated_at_column() |
| payments | tr_payments_audit | AFTER | INSERT, UPDATE, DELETE | audit_trigger_function() |
| payments | tr_payments_update_case_status | AFTER | INSERT, UPDATE | update_case_status_on_payment() |
| payments | trg_payment_change | AFTER | INSERT, UPDATE | trg_after_payment_change() |
| promises | trg_promise_insert | AFTER | INSERT | trg_after_promise_insert() |

---

## Fonctions Trigger - Code Source

### 1. handle_new_user

- **Schema** : auth (sur auth.users)
- **Evenement** : AFTER INSERT
- **Langage** : plpgsql

```sql
DECLARE
  v_role TEXT;
BEGIN
  -- Recuperer le role depuis les metadonnees (si specifie)
  v_role := NEW.raw_user_meta_data->>'role';

  -- Par defaut, ne rien creer (l'admin creera le profil manuellement)
  IF v_role = 'admin' THEN
    INSERT INTO public.admins (id, email, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
  ELSIF v_role = 'agent' THEN
    INSERT INTO public.agents (id, email, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
  END IF;
  -- bank_user necessite un bank_id, donc doit etre cree manuellement

  RETURN NEW;
END;
```

---

### 2. set_case_reference

- **Table** : cases
- **Trigger** : tr_cases_set_reference
- **Evenement** : BEFORE INSERT
- **Langage** : plpgsql

```sql
BEGIN
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    NEW.reference := public.generate_case_reference();
  END IF;
  RETURN NEW;
END;
```

---

### 3. audit_trigger_function

- **Tables** : admins, agents, bank_users, banks, cases, payments
- **Triggers** : tr_*_audit
- **Evenement** : AFTER INSERT, UPDATE, DELETE
- **Langage** : plpgsql

```sql
DECLARE
  v_user_id UUID;
  v_user_type TEXT;
  v_old_data JSONB;
  v_new_data JSONB;
BEGIN
  v_user_id := auth.uid();
  v_user_type := public.get_user_type();

  IF v_user_type IS NULL THEN
    v_user_type := 'system';
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'INSERT' THEN
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
  END IF;

  INSERT INTO public.audit_logs (
    table_name,
    record_id,
    operation,
    old_data,
    new_data,
    user_id,
    user_type
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    v_old_data,
    v_new_data,
    v_user_id,
    v_user_type
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
```

---

### 4. update_updated_at_column

- **Tables** : admins, agents, bank_users, banks, cases, debtors_pm, debtors_pp
- **Triggers** : tr_*_updated_at
- **Evenement** : BEFORE UPDATE
- **Langage** : plpgsql

```sql
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
```

---

### 5. track_contact_changes

- **Tables** : debtors_pp, debtors_pm
- **Triggers** : tr_debtors_pp_contact_history, tr_debtors_pm_contact_history
- **Evenement** : AFTER UPDATE
- **Langage** : plpgsql
- **Description** : Trace les modifications de coordonnees des debiteurs dans contact_history

```sql
DECLARE
  v_debtor_type TEXT;
  v_fields TEXT[] := ARRAY['phone_primary', 'phone_secondary', 'email', 'address_street', 'address_city'];
  v_field TEXT;
  v_old_value TEXT;
  v_new_value TEXT;
BEGIN
  -- Determiner le type de debiteur
  IF TG_TABLE_NAME = 'debtors_pp' THEN
    v_debtor_type := 'pp';
  ELSE
    v_debtor_type := 'pm';
  END IF;

  -- Comparer chaque champ sensible
  FOREACH v_field IN ARRAY v_fields LOOP
    EXECUTE format('SELECT ($1).%I::TEXT, ($2).%I::TEXT', v_field, v_field)
    INTO v_old_value, v_new_value
    USING OLD, NEW;

    IF v_old_value IS DISTINCT FROM v_new_value THEN
      INSERT INTO public.contact_history (
        debtor_type,
        debtor_id,
        field_name,
        old_value,
        new_value,
        changed_by
      ) VALUES (
        v_debtor_type,
        NEW.id,
        v_field,
        v_old_value,
        v_new_value,
        auth.uid()
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
```

---

### 6. trg_after_action_insert

- **Table** : actions
- **Trigger** : trg_action_insert
- **Evenement** : AFTER INSERT
- **Langage** : plpgsql
- **Description** : Met a jour last_action/next_action sur cases. Passe le statut de "new"/"assigned" a "in_progress".

```sql
BEGIN
  UPDATE cases SET
    last_action_at = NEW.action_date::timestamptz,
    last_action_type = NEW.action_type::text,
    next_action_at = CASE WHEN NEW.next_action_date IS NOT NULL
                      THEN NEW.next_action_date::timestamptz
                      ELSE NULL END,
    next_action_type = CASE WHEN NEW.next_action_type IS NOT NULL
                        THEN NEW.next_action_type::text
                        ELSE NULL END,
    status = CASE
      WHEN status IN ('new', 'assigned') THEN 'in_progress'::case_status
      ELSE status
    END
  WHERE id = NEW.case_id;
  RETURN NEW;
END;
```

---

### 7. trg_after_payment_change

- **Table** : payments
- **Trigger** : trg_payment_change
- **Evenement** : AFTER INSERT, UPDATE
- **Langage** : plpgsql
- **Description** : Recalcule total_paid et remaining_balance. Ferme automatiquement le dossier si entierement paye.

```sql
DECLARE
  v_case_id uuid;
  v_total_due numeric;
  v_total_paid numeric;
  v_remaining numeric;
BEGIN
  v_case_id := COALESCE(NEW.case_id, OLD.case_id);

  SELECT ABS(
    COALESCE(amount_principal, 0) + COALESCE(amount_interest, 0)
    + COALESCE(amount_penalties, 0) + COALESCE(amount_fees, 0)
  )
  INTO v_total_due
  FROM cases WHERE id = v_case_id;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM payments
  WHERE case_id = v_case_id AND status = 'validated';

  v_remaining := v_total_due - v_total_paid;

  UPDATE cases SET
    total_paid = v_total_paid,
    remaining_balance = v_remaining,
    status = CASE
      WHEN v_total_paid >= v_total_due AND v_total_due > 0 THEN 'closed'::case_status
      WHEN v_total_paid > 0 THEN 'partial_payment'::case_status
      ELSE status
    END,
    closure_reason = CASE
      WHEN v_total_paid >= v_total_due AND v_total_due > 0 THEN 'fully_paid'
      ELSE closure_reason
    END,
    closed_at = CASE
      WHEN v_total_paid >= v_total_due AND v_total_due > 0 THEN now()
      ELSE closed_at
    END,
    closed_by = CASE
      WHEN v_total_paid >= v_total_due AND v_total_due > 0 THEN NEW.declared_by
      ELSE closed_by
    END
  WHERE id = v_case_id
    AND status NOT IN ('closed');

  RETURN COALESCE(NEW, OLD);
END;
```

---

### 8. trg_cases_compute_balance

- **Table** : cases
- **Triggers** : trg_cases_balance_insert, trg_cases_balance_update
- **Evenement** : BEFORE INSERT, UPDATE
- **Langage** : plpgsql
- **Description** : Calcule remaining_balance et total_paid a chaque INSERT/UPDATE sur cases

```sql
DECLARE
  v_total_due numeric;
  v_total_paid numeric;
BEGIN
  -- Total du (valeur absolue pour gerer les montants negatifs importes)
  v_total_due := ABS(
    COALESCE(NEW.amount_principal, 0) + COALESCE(NEW.amount_interest, 0)
    + COALESCE(NEW.amount_penalties, 0) + COALESCE(NEW.amount_fees, 0)
  );

  -- Total paye (valide uniquement)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM payments
  WHERE case_id = NEW.id AND status = 'validated';

  NEW.remaining_balance := v_total_due - v_total_paid;
  NEW.total_paid := v_total_paid;

  RETURN NEW;
END;
```

---

### 9. update_has_guarantee

- **Table** : cases
- **Trigger** : trg_update_has_guarantee
- **Evenement** : BEFORE INSERT, UPDATE
- **Langage** : plpgsql
- **Description** : Met a jour has_guarantee en detectant le pattern "Garantie:" dans le champ notes

```sql
BEGIN
  -- Set has_guarantee based on notes field (check for "Garantie:" pattern)
  NEW.has_guarantee := (
    NEW.notes IS NOT NULL
    AND NEW.notes LIKE '%Garantie:%'
    AND LENGTH(TRIM(SPLIT_PART(SPLIT_PART(NEW.notes, 'Garantie:', 2), '|', 1))) > 0
  );

  RETURN NEW;
END;
```

---

### 10. update_case_status_on_payment

- **Table** : payments
- **Trigger** : tr_payments_update_case_status
- **Evenement** : AFTER INSERT, UPDATE
- **Langage** : plpgsql
- **Description** : Met a jour le statut du dossier quand un paiement est valide (paid ou partial_payment)

```sql
DECLARE
  v_total_amount NUMERIC(15,2);
  v_total_paid NUMERIC(15,2);
  v_current_status case_status;
BEGIN
  -- Seulement si le paiement vient d'etre valide
  IF NEW.status = 'validated' AND (OLD.status IS NULL OR OLD.status != 'validated') THEN

    -- Recuperer le statut actuel et les montants
    SELECT
      c.status,
      c.amount_principal + c.amount_interest + c.amount_penalties + c.amount_fees,
      COALESCE((
        SELECT SUM(amount)
        FROM public.payments
        WHERE case_id = c.id AND status = 'validated'
      ), 0)
    INTO v_current_status, v_total_amount, v_total_paid
    FROM public.cases c
    WHERE c.id = NEW.case_id;

    -- Ne pas modifier si deja cloture
    IF v_current_status != 'closed' THEN
      IF v_total_paid >= v_total_amount THEN
        UPDATE public.cases
        SET status = 'paid', updated_at = now()
        WHERE id = NEW.case_id;
      ELSIF v_total_paid > 0 THEN
        UPDATE public.cases
        SET status = 'partial_payment', updated_at = now()
        WHERE id = NEW.case_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
```

---

### 11. trg_after_promise_insert

- **Table** : promises
- **Trigger** : trg_promise_insert
- **Evenement** : AFTER INSERT
- **Langage** : plpgsql
- **Description** : Passe le statut du dossier a "promise" quand une promesse est creee

```sql
BEGIN
  UPDATE cases SET
    status = CASE
      WHEN status IN ('new', 'in_progress', 'assigned') THEN 'promise'::case_status
      ELSE status
    END
  WHERE id = NEW.case_id;
  RETURN NEW;
END;
```

