-- ============================================================================
-- Migration 038 : Ajouter username aux admins
-- Les admins se connectent avec un username + code PIN (4 chiffres)
-- ============================================================================

ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

-- Définir le username de l'admin principal
UPDATE public.admins
SET username = 'admin-altis'
WHERE email = (SELECT email FROM public.admins ORDER BY created_at ASC LIMIT 1);

-- Pour les autres admins éventuels, utiliser la partie avant le @
UPDATE public.admins
SET username = SPLIT_PART(email, '@', 1)
WHERE username IS NULL;

-- Mettre à jour le mot de passe de l'admin principal vers altis1234
-- (email = admin-altis@altis.local, password = altis1234)
UPDATE auth.users
SET encrypted_password = crypt('altis1234', gen_salt('bf')),
    email = 'admin-altis@altis.local'
WHERE id = (SELECT id FROM public.admins ORDER BY created_at ASC LIMIT 1);

-- Mettre à jour l'email dans la table admins aussi
UPDATE public.admins
SET email = 'admin-altis@altis.local'
WHERE username = 'admin-altis';
