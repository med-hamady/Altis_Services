# Altis Services - Plateforme de Recouvrement de Creances

## IMPORTANT - Base de donnees de production

Avant toute modification ou consultation liee a la base de donnees, tu DOIS consulter ces 3 fichiers de reference :

1. **`.claude/bdd_prod.md`** - Schema complet : tables, colonnes, types, contraintes (PK/FK/Unique), politiques RLS, index, enums
2. **`.claude/rpc_functions_code.md`** - Code source complet des 83 fonctions RPC (helpers d'auth, CRUD, admin, dashboard, imports, reports, propositions)
3. **`.claude/triggers_code.md`** - Code source complet des 11 fonctions trigger + recap des 23 triggers

Ces fichiers representent l'etat exact de la base de donnees Supabase en production. Ne jamais supposer la structure d'une table ou le comportement d'un trigger sans les consulter.

---

## Description du projet

Altis Services est une application web de gestion de recouvrement de creances. Elle permet aux banques de confier leurs dossiers impayes a une equipe d'agents de recouvrement, avec un suivi complet du cycle de vie de chaque dossier : affectation, actions de relance, promesses de paiement, encaissements et cloture.

## Stack technique

- **Frontend** : React 19 + TypeScript + Vite
- **UI** : shadcn/ui (Radix UI) + Tailwind CSS
- **Routing** : React Router DOM 7
- **State** : Zustand (global) + TanStack React Query (server state)
- **Formulaires** : React Hook Form + Zod (validation)
- **Tableaux** : TanStack React Table
- **Graphiques** : Recharts
- **PDF** : jsPDF + jspdf-autotable
- **CSV** : PapaParse
- **Backend** : Supabase (PostgreSQL, Auth, RLS, Storage)
- **Email** : Resend (notifications de paiement)

## Roles utilisateur

| Role | Description |
|------|-------------|
| **admin** | Acces complet : gestion des utilisateurs, banques, dossiers, imports, validation des paiements |
| **agent** | Agent de recouvrement : voit uniquement ses dossiers assignes, cree des actions/promesses/paiements |
| **bank_user** | Utilisateur banque : voit uniquement les dossiers de sa banque (lecture seule) |

## Architecture de la base de donnees

- **21 tables** avec RLS active sur toutes
- **77 politiques RLS** pour le controle d'acces par role
- **94 fonctions** (83 RPC + 11 trigger)
- **23 triggers** (audit, calcul automatique, changement de statut)
- **12 enums** pour les types metier
- **87 index** pour les performances

Documentation complete dans :
- `.claude/bdd_prod.md` - Schema complet (tables, colonnes, contraintes, RLS, index, enums)
- `.claude/rpc_functions_code.md` - Code source des 83 fonctions RPC
- `.claude/triggers_code.md` - Code source des 11 fonctions trigger + recap des 23 triggers

## Cycle de vie d'un dossier (case)

```
new → assigned → in_progress → promise → partial_payment → paid → closed
```

- **new** : Dossier cree (import ou manuel)
- **assigned** : Agent affecte
- **in_progress** : Premiere action effectuee (automatique via trigger)
- **promise** : Promesse de paiement recue (automatique via trigger)
- **partial_payment** : Paiement partiel valide (automatique via trigger)
- **paid** : Totalite payee (automatique via trigger)
- **closed** : Cloture manuelle ou automatique (fully_paid)

## Phases de recouvrement

`amicable` → `pre_legal` → `legal`

## Logique metier cle

- **Calcul automatique des soldes** : `remaining_balance` et `total_paid` recalcules a chaque modification de dossier ou paiement (triggers `trg_cases_compute_balance` et `trg_after_payment_change`)
- **Audit complet** : Toute modification sur les tables principales est tracee dans `audit_logs`
- **Historique contacts** : Les changements de coordonnees des debiteurs sont traces dans `contact_history`
- **Import Excel** : Systeme d'import en 3 etapes (upload → validation IA → approbation manuelle)
- **Detection garantie** : Le champ `has_guarantee` est auto-calcule depuis le pattern "Garantie:" dans les notes
