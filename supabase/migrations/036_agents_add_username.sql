-- ============================================================================
-- Migration 036 : Ajouter username aux agents et bank_users
-- Les utilisateurs se connectent avec un username + code PIN (4 chiffres)
-- ============================================================================

-- Agents
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

UPDATE public.agents
SET username = SPLIT_PART(email, '@', 1)
WHERE username IS NULL;

-- Bank Users
ALTER TABLE public.bank_users ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

UPDATE public.bank_users
SET username = SPLIT_PART(email, '@', 1)
WHERE username IS NULL;
