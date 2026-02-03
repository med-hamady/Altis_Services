# Guide de démarrage - Altis Services

## Prérequis

- Node.js 18+ installé
- Un compte Supabase (gratuit)

## 1. Configuration de Supabase

### Créer un projet Supabase

1. Allez sur [https://supabase.com](https://supabase.com)
2. Créez un compte ou connectez-vous
3. Cliquez sur "New Project"
4. Choisissez une organisation et un nom de projet
5. Sélectionnez la région **Europe (eu-west-1)** pour de meilleures performances
6. Définissez un mot de passe pour la base de données
7. Cliquez sur "Create new project"

### Récupérer les clés API

1. Une fois le projet créé, allez dans **Settings > API**
2. Copiez :
   - **Project URL** (ex: `https://xxxx.supabase.co`)
   - **anon public** key (clé commençant par `eyJ...`)

### Configurer les variables d'environnement

1. Ouvrez le fichier `.env.local` à la racine du projet
2. Remplacez les valeurs par vos clés :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-clé-anon
```

### Exécuter les migrations de base de données

1. Dans Supabase, allez dans **SQL Editor**
2. Cliquez sur "New query"
3. Copiez le contenu de `supabase/migrations/001_initial_schema.sql`
4. Exécutez la requête (bouton "Run")
5. Répétez avec `supabase/migrations/002_rls_policies.sql`

### Créer un utilisateur admin

1. Dans Supabase, allez dans **Authentication > Users**
2. Cliquez sur "Add user" > "Create new user"
3. Entrez un email et un mot de passe
4. Dans **SQL Editor**, exécutez :

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'votre-email@exemple.com';
```

## 2. Lancer l'application

### Installation des dépendances

```bash
npm install
```

### Mode développement

```bash
npm run dev
```

L'application sera accessible sur [http://localhost:5173](http://localhost:5173)

### Build de production

```bash
npm run build
npm run preview
```

## 3. Structure du projet

```
src/
├── components/         # Composants UI réutilisables
│   ├── ui/            # shadcn/ui components
│   └── layout/        # Layout (Sidebar, Header)
├── features/          # Modules fonctionnels
│   ├── auth/          # Authentification
│   ├── banks/         # Gestion banques
│   ├── users/         # Gestion utilisateurs
│   ├── debtors/       # Débiteurs PP/PM
│   ├── cases/         # Dossiers
│   ├── actions/       # Actions terrain
│   ├── promises/      # Promesses
│   ├── payments/      # Paiements
│   ├── documents/     # Documents
│   ├── dashboard/     # Tableau de bord
│   └── reports/       # Rapports
├── lib/               # Utilitaires
│   └── supabase/      # Client Supabase
├── contexts/          # Contextes React
├── hooks/             # Hooks personnalisés
├── routes/            # Configuration du routage
└── types/             # Types TypeScript
```

## 4. Rôles utilisateurs

| Rôle | Permissions |
|------|-------------|
| **admin** | Accès complet : banques, utilisateurs, tous les dossiers |
| **agent** | Ses dossiers affectés : actions, promesses, paiements |
| **bank_user** | Lecture seule des dossiers de sa banque |

## 5. Prochaines étapes

La Phase 1 (Fondation) est complète. Voici ce qui reste à développer :

### Phase 2 : Entités de base
- [ ] CRUD complet des banques
- [ ] CRUD complet des utilisateurs
- [ ] CRUD des débiteurs PP/PM

### Phase 3 : Gestion des dossiers
- [ ] Liste et création de dossiers
- [ ] Affectation des agents
- [ ] Workflow des statuts

### Phase 4 : Opérations terrain
- [ ] Journal des actions
- [ ] Promesses de paiement
- [ ] Déclaration/validation des paiements

### Phase 5 : Documents
- [ ] Upload de fichiers
- [ ] Gestion de la visibilité

### Phase 6 : Rapports
- [ ] Tableaux de bord dynamiques
- [ ] Export CSV/PDF

## Support

Pour toute question, consultez le fichier `Readme.md` contenant le cahier des charges complet.
