-- =============================================================================
-- ALTIS SERVICES - Diagnostic RLS
-- Script pour vérifier que les politiques RLS et les fonctions fonctionnent
-- =============================================================================

-- 1. Vérifier l'UUID de l'utilisateur connecté
SELECT
  'UUID de l''utilisateur connecté' as test,
  auth.uid() as user_id;

-- 2. Vérifier si l'utilisateur existe dans admins
SELECT
  'Utilisateur dans admins' as test,
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE id = auth.uid()
  ) as exists_in_admins;

-- 3. Vérifier si l'utilisateur est actif
SELECT
  'Utilisateur actif' as test,
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE id = auth.uid()
    AND is_active = true
  ) as is_active;

-- 4. Tester la fonction is_admin()
SELECT
  'Fonction is_admin()' as test,
  public.is_admin() as result;

-- 5. Vérifier RLS sur la table banks
SELECT
  'RLS activé sur banks' as test,
  relname as table_name,
  relrowsecurity as rls_enabled,
  relforcerowsecurity as rls_forced
FROM pg_class
WHERE relname = 'banks';

-- 6. Vérifier les politiques sur banks
SELECT
  'Politiques sur banks' as test,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'banks';

-- 7. Essayer de compter les banques (devrait fonctionner pour un admin)
SELECT
  'Nombre de banques' as test,
  COUNT(*) as count
FROM public.banks;

-- 8. Vérifier les politiques sur cases
SELECT
  'Politiques sur cases' as test,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'cases';
