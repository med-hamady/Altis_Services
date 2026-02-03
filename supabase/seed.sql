-- =============================================================================
-- ALTIS SERVICES - Script de création d'un utilisateur admin initial
-- =============================================================================

-- Ce script crée un profil admin pour tous les utilisateurs auth existants
-- qui n'ont pas encore de profil dans les tables admins/agents/bank_users

-- =============================================================================
-- Créer un profil admin pour les utilisateurs sans profil
-- =============================================================================

INSERT INTO public.admins (id, email, full_name, is_active)
SELECT
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.email
  ) as full_name,
  true as is_active
FROM auth.users au
WHERE NOT EXISTS (
  -- Vérifier qu'il n'existe pas déjà dans admins
  SELECT 1 FROM public.admins a WHERE a.id = au.id
)
AND NOT EXISTS (
  -- Vérifier qu'il n'existe pas déjà dans agents
  SELECT 1 FROM public.agents ag WHERE ag.id = au.id
)
AND NOT EXISTS (
  -- Vérifier qu'il n'existe pas déjà dans bank_users
  SELECT 1 FROM public.bank_users bu WHERE bu.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- Afficher les admins créés
SELECT
  id,
  email,
  full_name,
  is_active,
  created_at
FROM public.admins
ORDER BY created_at DESC;
