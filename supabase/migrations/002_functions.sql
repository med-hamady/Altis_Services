-- =============================================================================
-- ALTIS SERVICES - Fonctions utilitaires sécurisées
-- Toutes les fonctions SECURITY DEFINER ont un search_path fixe
-- =============================================================================

-- =============================================================================
-- FONCTIONS D'IDENTIFICATION DU TYPE D'UTILISATEUR
-- =============================================================================

-- Vérifie si l'utilisateur courant est un admin actif
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins
    WHERE id = auth.uid()
    AND is_active = true
  );
$$;

-- Vérifie si l'utilisateur courant est un agent actif
CREATE OR REPLACE FUNCTION public.is_agent()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agents
    WHERE id = auth.uid()
    AND is_active = true
  );
$$;

-- Vérifie si l'utilisateur courant est un utilisateur banque actif
CREATE OR REPLACE FUNCTION public.is_bank_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bank_users
    WHERE id = auth.uid()
    AND is_active = true
  );
$$;

-- Retourne le bank_id de l'utilisateur banque courant (NULL si pas bank_user)
CREATE OR REPLACE FUNCTION public.get_bank_user_bank_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bank_id FROM public.bank_users
  WHERE id = auth.uid()
  AND is_active = true;
$$;

-- Retourne le type d'utilisateur courant
CREATE OR REPLACE FUNCTION public.get_user_type()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid() AND is_active = true) THEN 'admin'
      WHEN EXISTS (SELECT 1 FROM public.agents WHERE id = auth.uid() AND is_active = true) THEN 'agent'
      WHEN EXISTS (SELECT 1 FROM public.bank_users WHERE id = auth.uid() AND is_active = true) THEN 'bank_user'
      ELSE NULL
    END;
$$;

-- =============================================================================
-- FONCTION: Génération de référence dossier
-- Format: YYYY-XXXXXX (année + séquence sur 6 chiffres)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.generate_case_reference()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_sequence INTEGER;
  v_reference TEXT;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');

  -- Obtenir le prochain numéro de séquence pour cette année
  SELECT COALESCE(
    MAX(
      CAST(SUBSTRING(reference FROM 6) AS INTEGER)
    ),
    0
  ) + 1
  INTO v_sequence
  FROM public.cases
  WHERE reference LIKE v_year || '-%';

  v_reference := v_year || '-' || LPAD(v_sequence::TEXT, 6, '0');

  RETURN v_reference;
END;
$$;

-- =============================================================================
-- FONCTION: Vérifier si un agent est affecté à un dossier
-- =============================================================================
CREATE OR REPLACE FUNCTION public.agent_has_case(p_case_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cases
    WHERE id = p_case_id
    AND assigned_agent_id = auth.uid()
  );
$$;

-- =============================================================================
-- FONCTION: Vérifier si un dossier appartient à la banque de l'utilisateur
-- =============================================================================
CREATE OR REPLACE FUNCTION public.case_belongs_to_user_bank(p_case_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cases c
    JOIN public.bank_users bu ON bu.bank_id = c.bank_id
    WHERE c.id = p_case_id
    AND bu.id = auth.uid()
    AND bu.is_active = true
  );
$$;

-- =============================================================================
-- FONCTION: Obtenir les bank_ids des dossiers affectés à un agent
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_agent_bank_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT bank_id
  FROM public.cases
  WHERE assigned_agent_id = auth.uid();
$$;

-- =============================================================================
-- FONCTION: Mise à jour automatique du champ updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- FONCTION: Création automatique de la référence dossier
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_case_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    NEW.reference := public.generate_case_reference();
  END IF;
  RETURN NEW;
END;
$$;

-- =============================================================================
-- FONCTION: Mise à jour automatique du statut dossier après paiement validé
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_case_status_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_amount NUMERIC(15,2);
  v_total_paid NUMERIC(15,2);
  v_current_status case_status;
BEGIN
  -- Seulement si le paiement vient d'être validé
  IF NEW.status = 'validated' AND (OLD.status IS NULL OR OLD.status != 'validated') THEN

    -- Récupérer le statut actuel et les montants
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

    -- Ne pas modifier si déjà clôturé
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
$$;

-- =============================================================================
-- FONCTION: Audit log (appelée uniquement par triggers)
-- L'insertion directe dans audit_logs est bloquée par RLS
-- =============================================================================
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- =============================================================================
-- FONCTION: Enregistrer l'historique des changements de contact
-- =============================================================================
CREATE OR REPLACE FUNCTION public.track_contact_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_debtor_type TEXT;
  v_fields TEXT[] := ARRAY['phone_primary', 'phone_secondary', 'email', 'address_street', 'address_city'];
  v_field TEXT;
  v_old_value TEXT;
  v_new_value TEXT;
BEGIN
  -- Déterminer le type de débiteur
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
$$;

-- =============================================================================
-- FONCTION: Créer un profil utilisateur après inscription
-- Utilisée uniquement en développement/tests
-- En production, les utilisateurs sont créés via l'admin
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Récupérer le rôle depuis les métadonnées (si spécifié)
  v_role := NEW.raw_user_meta_data->>'role';

  -- Par défaut, ne rien créer (l'admin créera le profil manuellement)
  -- Cette fonction est un placeholder pour les tests
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
  -- bank_user nécessite un bank_id, donc doit être créé manuellement

  RETURN NEW;
END;
$$;
