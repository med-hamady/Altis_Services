-- ============================================================================
-- Migration 034 : Table case_extra_info pour les informations complémentaires
-- Permet à l'admin d'ajouter des infos collectées (téléphone, adresse, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.case_extra_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  label text NOT NULL,
  value text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index pour la recherche par dossier
CREATE INDEX IF NOT EXISTS idx_case_extra_info_case_id ON public.case_extra_info(case_id);

-- RLS
ALTER TABLE public.case_extra_info ENABLE ROW LEVEL SECURITY;

-- Lecture : tous les utilisateurs authentifiés
CREATE POLICY "case_extra_info_select" ON public.case_extra_info
  FOR SELECT TO authenticated USING (true);

-- Insertion : admins et agents
CREATE POLICY "case_extra_info_insert" ON public.case_extra_info
  FOR INSERT TO authenticated WITH CHECK (true);

-- Suppression : admins uniquement
CREATE POLICY "case_extra_info_delete" ON public.case_extra_info
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid() AND is_active = true)
  );
