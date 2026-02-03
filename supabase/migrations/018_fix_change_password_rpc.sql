-- ============================================================================
-- Migration 018 : Correction de la fonction RPC change_user_password
-- PostgREST nécessite que la fonction soit dans le schema 'public' explicitement
-- et que les fonctions internes soient qualifiées avec leur schema
-- ============================================================================

-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS change_user_password(uuid, text);
DROP FUNCTION IF EXISTS public.change_user_password(uuid, text);

-- S'assurer que pgcrypto est disponible dans le schema extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Recréer la fonction dans le schema public explicitement
CREATE OR REPLACE FUNCTION public.change_user_password(target_user_id uuid, new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  caller_id uuid;
  is_caller_admin boolean;
BEGIN
  -- Vérifier que l'appelant est authentifié
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  -- Vérifier que l'appelant est un admin actif
  SELECT EXISTS(
    SELECT 1 FROM public.admins WHERE id = caller_id AND is_active = true
  ) INTO is_caller_admin;

  IF NOT is_caller_admin THEN
    RAISE EXCEPTION 'Accès refusé : seuls les administrateurs peuvent modifier les mots de passe';
  END IF;

  -- Vérifier la longueur du mot de passe
  IF length(new_password) < 6 THEN
    RAISE EXCEPTION 'Le mot de passe doit contenir au moins 6 caractères';
  END IF;

  -- Mettre à jour le mot de passe dans auth.users
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf'))
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utilisateur non trouvé';
  END IF;
END;
$$;

-- Accorder l'accès aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.change_user_password(uuid, text) TO authenticated;
