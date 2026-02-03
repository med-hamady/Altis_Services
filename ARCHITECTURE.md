# Architecture Base de Données v2.0 - Altis Services

## 🎯 Résumé des améliorations

Cette architecture corrige toutes les failles de conception identifiées :

| Problème corrigé | Solution |
|-------------------|----------|
| ✅ Tables combinées (profiles) | **Tables séparées** : `admins`, `agents`, `bank_users` |
| ✅ Débiteurs PP/PM mélangés | **Tables séparées** : `debtors_pp`, `debtors_pm` |
| ✅ `SECURITY DEFINER` sans `search_path` | **Toutes les fonctions** incluent `SET search_path = public` |
| ✅ Policies UPDATE sans WITH CHECK strict | **WITH CHECK explicites** bloquant les modifications dangereuses |
| ✅ `audit_logs` insertion permissive | **Insertion via trigger SECURITY DEFINER uniquement** |
| ✅ Agent voit toutes les banques | **Agent voit uniquement les banques de ses dossiers** |
| ✅ `agent_debtors_insert` trop permissif | **Restriction avec `created_by` obligatoire** |

---

## 📁 Structure des tables

### Utilisateurs (tables séparées)

```
admins
  ├─ id (PK, FK auth.users)
  ├─ email
  ├─ full_name
  └─ is_active

agents
  ├─ id (PK, FK auth.users)
  ├─ email
  ├─ full_name
  ├─ sector (zone géographique)
  └─ is_active

bank_users
  ├─ id (PK, FK auth.users)
  ├─ email
  ├─ full_name
  ├─ bank_id (FK banks, OBLIGATOIRE)
  └─ is_active
```

**Avantages** :
- Pas de colonnes NULL inutiles
- Contraintes spécifiques par type
- Requêtes plus simples et performantes
- Impossible de créer un utilisateur avec le mauvais type

### Débiteurs (tables séparées)

```
debtors_pp (Personnes Physiques)
  ├─ id (PK)
  ├─ first_name, last_name
  ├─ id_number (CIN/Passport)
  ├─ phone_primary, phone_secondary
  └─ address_*, employer, occupation

debtors_pm (Personnes Morales)
  ├─ id (PK)
  ├─ company_name, trade_name
  ├─ rc_number, nif
  ├─ legal_rep_name, legal_rep_phone
  └─ address_*, sector_activity
```

**Avantages** :
- Validation forte par table
- Champs spécifiques bien typés
- Index optimisés par type

### Dossiers

```
cases
  ├─ id, reference (auto-généré: YYYY-XXXXXX)
  ├─ bank_id (FK banks)
  ├─ assigned_agent_id (FK agents, nullable)
  ├─ debtor_pp_id (FK debtors_pp, XOR avec debtor_pm_id)
  ├─ debtor_pm_id (FK debtors_pm, XOR avec debtor_pp_id)
  ├─ status, priority
  ├─ amount_principal, amount_interest, amount_penalties, amount_fees
  └─ CONSTRAINT: exactement UN débiteur (PP OU PM)
```

---

## 🔒 Sécurité RLS

### Exemple : Politique stricte pour `cases`

```sql
-- Agent UPDATE avec restrictions CRITIQUES
CREATE POLICY cases_agent_update ON cases
  FOR UPDATE TO authenticated
  USING (is_agent() AND assigned_agent_id = auth.uid())
  WITH CHECK (
    is_agent() AND
    assigned_agent_id = auth.uid() AND  -- Ne peut pas se désaffecter
    bank_id = (SELECT bank_id FROM cases WHERE id = cases.id) AND  -- Ne peut pas changer de banque
    reference = (SELECT reference FROM cases WHERE id = cases.id) AND  -- Ne peut pas changer la référence
    status != 'closed' AND  -- Ne peut pas clôturer
    closure_reason IS NULL  -- Ne peut pas ajouter de motif de clôture
  );
```

### Fonctions RLS sécurisées

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public  -- ✅ Protection contre les shadow objects
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins
    WHERE id = auth.uid() AND is_active = true
  );
$$;
```

### Audit logs protégés

- ❌ Pas de policy INSERT pour les utilisateurs
- ✅ Insertion uniquement via `audit_trigger_function()` (SECURITY DEFINER)
- ✅ Lecture admin uniquement

---

## 📂 Fichiers de migration

| Fichier | Description |
|---------|-------------|
| `001_schema.sql` | Tables, enums, contraintes, vues |
| `002_functions.sql` | Fonctions utilitaires sécurisées (is_admin, is_agent, etc.) |
| `003_triggers.sql` | Triggers (audit, updated_at, génération référence) |
| `004_rls.sql` | Politiques Row Level Security |
| `005_storage.sql` | Configuration buckets et politiques storage |

---

## 🚀 Migration depuis l'ancienne version

### Dans Supabase SQL Editor

1. **Supprimer l'ancien schéma** (⚠️ PERTE DE DONNÉES)
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   ```

2. **Exécuter les migrations dans l'ordre**
   - `001_schema.sql`
   - `002_functions.sql`
   - `003_triggers.sql`
   - `004_rls.sql`
   - `005_storage.sql`

3. **Créer un admin de test**
   ```sql
   -- Via Supabase Auth UI : créer un utilisateur
   -- Puis :
   INSERT INTO admins (id, email, full_name)
   VALUES (
     'uuid-de-auth-users',
     'admin@altis.mr',
     'Admin Altis'
   );
   ```

---

## 🧪 Tests de sécurité

### Test 1 : Isolation banque

```sql
-- En tant que bank_user de Banque A
SELECT * FROM cases;
-- ✅ Retourne UNIQUEMENT les dossiers de la Banque A
```

### Test 2 : Agent ne peut pas modifier bank_id

```sql
-- En tant qu'agent
UPDATE cases SET bank_id = 'autre-banque-id' WHERE id = 'mon-dossier';
-- ❌ ERREUR : WITH CHECK violation
```

### Test 3 : Audit logs falsifiés

```sql
-- En tant qu'agent
INSERT INTO audit_logs (table_name, record_id, operation, new_data)
VALUES ('cases', uuid_generate_v4(), 'UPDATE', '{}');
-- ❌ ERREUR : No policy allows INSERT
```

### Test 4 : Agent ne voit que les banques de ses dossiers

```sql
-- En tant qu'agent avec dossiers pour Banque A uniquement
SELECT * FROM banks;
-- ✅ Retourne UNIQUEMENT la Banque A (pas toutes les banques actives)
```

---

## 📊 Vues calculées

### `case_balances`
Calcule automatiquement le solde de chaque dossier :

```sql
SELECT
  case_id,
  reference,
  total_amount,           -- Principal + intérêts + pénalités + frais
  total_paid,             -- Somme des paiements validés
  remaining_balance       -- total_amount - total_paid
FROM case_balances;
```

---

## 🎨 Code React mis à jour

Le contexte d'authentification doit maintenant :

1. Vérifier dans quelle table se trouve l'utilisateur (admins/agents/bank_users)
2. Charger le bon profil avec les bonnes relations
3. Utiliser `CurrentUser` type (union Admin | Agent | BankUser)

```typescript
// Exemple
const { data } = await supabase
  .from('admins')
  .select('*')
  .eq('id', user.id)
  .single();

if (data) {
  return { ...data, userType: 'admin' as UserType };
}
// Sinon essayer agents, puis bank_users...
```

---

## ✅ Checklist de validation

- [ ] Toutes les migrations exécutées sans erreur
- [ ] Admin peut se connecter et voir tous les dossiers
- [ ] Agent ne voit que ses dossiers affectés
- [ ] Bank user ne voit que les dossiers de sa banque
- [ ] Agent ne peut pas modifier `bank_id` d'un dossier
- [ ] Agent ne peut pas insérer de logs d'audit manuellement
- [ ] Storage policies correctes (upload/download selon rôle)
- [ ] Génération automatique des références dossiers fonctionne
- [ ] Mise à jour automatique du statut après paiement validé

---

## 🔧 Maintenance

### Ajouter un index

```sql
CREATE INDEX idx_cases_created_at ON cases(created_at DESC);
```

### Partitionner audit_logs par mois (optionnel)

```sql
-- Pour de meilleures performances avec beaucoup de logs
CREATE TABLE audit_logs_2024_01 PARTITION OF audit_logs
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

---

## 📖 Ressources

- [Supabase RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL SECURITY DEFINER](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)
- [Storage Policies](https://supabase.com/docs/guides/storage/security/access-control)
