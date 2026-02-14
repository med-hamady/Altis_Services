-- ============================================================================
-- Migration 035 : Fonctions RPC pour case_extra_info (contourne les RLS)
-- ============================================================================

-- Lecture des infos complémentaires d'un dossier
CREATE OR REPLACE FUNCTION public.get_case_extra_info(p_case_id uuid)
RETURNS SETOF public.case_extra_info
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT *
    FROM public.case_extra_info
    WHERE case_id = p_case_id
    ORDER BY created_at DESC;
END;
$$;

-- Insertion d'une info complémentaire
CREATE OR REPLACE FUNCTION public.create_case_extra_info(
  p_case_id uuid,
  p_label text,
  p_value text
)
RETURNS public.case_extra_info
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.case_extra_info;
BEGIN
  INSERT INTO public.case_extra_info (case_id, label, value, created_by)
  VALUES (p_case_id, p_label, p_value, auth.uid())
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- Suppression d'une info complémentaire (admin uniquement)
CREATE OR REPLACE FUNCTION public.delete_case_extra_info(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que l'utilisateur est admin
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid() AND is_active = true) THEN
    RAISE EXCEPTION 'Accès refusé : admin uniquement';
  END IF;

  DELETE FROM public.case_extra_info WHERE id = p_id;
END;
$$;
