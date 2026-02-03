-- =============================================================================
-- ALTIS SERVICES - Création de l'administrateur initial
-- =============================================================================
-- Ce script doit être exécuté UNE SEULE FOIS après avoir créé votre premier
-- utilisateur dans Supabase Auth.
--
-- INSTRUCTIONS:
-- 1. Allez dans Supabase Dashboard > Authentication > Users
-- 2. Copiez l'UUID de votre utilisateur "Administrateur Test"
-- 3. Remplacez 'VOTRE-UUID-ICI' ci-dessous par l'UUID copié
-- 4. Exécutez ce script dans le SQL Editor de Supabase
-- =============================================================================

-- Insérer l'administrateur initial
INSERT INTO public.admins (
  id,
  email,
  full_name,
  phone,
  is_active
)
VALUES (
  'VOTRE-UUID-ICI'::uuid,  -- Remplacez par l'UUID de votre utilisateur Auth
  'test@altis.mr',          -- Remplacez par votre email
  'Administrateur Test',
  NULL,                      -- Ajoutez un numéro de téléphone si nécessaire
  true
)
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  is_active = EXCLUDED.is_active;

-- Vérifier que l'admin a bien été créé
SELECT
  id,
  email,
  full_name,
  is_active,
  created_at
FROM public.admins
WHERE email = 'test@altis.mr';
