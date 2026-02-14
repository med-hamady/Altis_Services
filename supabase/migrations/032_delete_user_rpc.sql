-- ============================================================================
-- Migration 032 : Fonction RPC pour supprimer un utilisateur
-- Permet à un admin de supprimer un agent ou un utilisateur banque
-- Utilise SECURITY DEFINER pour accéder à auth.users avec les droits du propriétaire
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_auth_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    RAISE EXCEPTION 'Accès refusé : seuls les administrateurs peuvent supprimer des utilisateurs';
  END IF;

  -- Empêcher un admin de se supprimer lui-même
  IF target_user_id = caller_id THEN
    RAISE EXCEPTION 'Vous ne pouvez pas supprimer votre propre compte';
  END IF;

  -- Supprimer les entrées dans les tables de profil (au cas où CASCADE ne couvre pas)
  DELETE FROM public.agents WHERE id = target_user_id;
  DELETE FROM public.bank_users WHERE id = target_user_id;
  DELETE FROM public.admins WHERE id = target_user_id;

  -- Supprimer l'utilisateur de auth.users
  DELETE FROM auth.users WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utilisateur non trouvé';
  END IF;
END;
$$;

-- Accorder l'accès aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.delete_auth_user(uuid) TO authenticated;
