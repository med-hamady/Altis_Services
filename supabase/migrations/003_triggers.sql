-- =============================================================================
-- ALTIS SERVICES - Triggers
-- =============================================================================

-- =============================================================================
-- TRIGGERS: updated_at automatique
-- =============================================================================

CREATE TRIGGER tr_banks_updated_at
  BEFORE UPDATE ON banks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_bank_users_updated_at
  BEFORE UPDATE ON bank_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_debtors_pp_updated_at
  BEFORE UPDATE ON debtors_pp
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_debtors_pm_updated_at
  BEFORE UPDATE ON debtors_pm
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TRIGGER: Génération automatique de référence dossier
-- =============================================================================

CREATE TRIGGER tr_cases_set_reference
  BEFORE INSERT ON cases
  FOR EACH ROW
  EXECUTE FUNCTION set_case_reference();

-- =============================================================================
-- TRIGGER: Mise à jour du statut après validation de paiement
-- =============================================================================

CREATE TRIGGER tr_payments_update_case_status
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_case_status_on_payment();

-- =============================================================================
-- TRIGGERS: Historique des contacts débiteurs
-- =============================================================================

CREATE TRIGGER tr_debtors_pp_contact_history
  AFTER UPDATE ON debtors_pp
  FOR EACH ROW
  EXECUTE FUNCTION track_contact_changes();

CREATE TRIGGER tr_debtors_pm_contact_history
  AFTER UPDATE ON debtors_pm
  FOR EACH ROW
  EXECUTE FUNCTION track_contact_changes();

-- =============================================================================
-- TRIGGERS: Audit sur les tables sensibles
-- =============================================================================

-- Dossiers
CREATE TRIGGER tr_cases_audit
  AFTER INSERT OR UPDATE OR DELETE ON cases
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- Paiements
CREATE TRIGGER tr_payments_audit
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- Banques
CREATE TRIGGER tr_banks_audit
  AFTER INSERT OR UPDATE OR DELETE ON banks
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- Admins
CREATE TRIGGER tr_admins_audit
  AFTER INSERT OR UPDATE OR DELETE ON admins
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- Agents
CREATE TRIGGER tr_agents_audit
  AFTER INSERT OR UPDATE OR DELETE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- Utilisateurs banque
CREATE TRIGGER tr_bank_users_audit
  AFTER INSERT OR UPDATE OR DELETE ON bank_users
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- =============================================================================
-- TRIGGER: Création automatique de profil après inscription (optionnel)
-- Décommenter si vous voulez activer cette fonctionnalité
-- =============================================================================

-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION handle_new_user();
