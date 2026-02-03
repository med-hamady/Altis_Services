-- ============================================================================
-- Migration 017 : Fonction RPC pour changer le mot de passe d'un utilisateur
-- Permet à un admin de modifier le mot de passe d'un autre utilisateur
-- ============================================================================

-- S'assurer que pgcrypto est disponible
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Fonction RPC sécurisée (SECURITY DEFINER = s'exécute avec les droits du propriétaire)
CREATE OR REPLACE FUNCTION change_user_password(target_user_id uuid, new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id uuid;
  is_admin boolean;
BEGIN
  -- Vérifier que l'appelant est authentifié
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  -- Vérifier que l'appelant est un admin
  SELECT EXISTS(
    SELECT 1 FROM public.admins WHERE id = caller_id AND is_active = true
  ) INTO is_admin;

  IF NOT is_admin THEN
    RAISE EXCEPTION 'Accès refusé : seuls les administrateurs peuvent modifier les mots de passe';
  END IF;

  -- Vérifier la longueur du mot de passe
  IF length(new_password) < 6 THEN
    RAISE EXCEPTION 'Le mot de passe doit contenir au moins 6 caractères';
  END IF;

  -- Mettre à jour le mot de passe dans auth.users
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utilisateur non trouvé';
  END IF;
END;
$$;

-- Accorder l'accès à la fonction pour les utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION change_user_password(uuid, text) TO authenticated;
