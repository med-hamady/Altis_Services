-- =============================================================================
-- ALTIS SERVICES - Configuration Storage
-- Buckets et politiques de sécurité pour les fichiers
-- =============================================================================

-- =============================================================================
-- BUCKETS
-- =============================================================================

-- Bucket: Documents des dossiers
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'case-documents',
  'case-documents',
  false, -- Privé
  52428800, -- 50 MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Bucket: Justificatifs de paiement
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  false, -- Privé
  10485760, -- 10 MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket: Pièces jointes aux actions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'action-attachments',
  'action-attachments',
  false, -- Privé
  20971520, -- 20 MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- POLITIQUES: case-documents
-- Structure: {case_id}/{filename}
-- =============================================================================

-- Admin: accès complet
CREATE POLICY "case_documents_admin_all"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'case-documents' AND
  public.is_admin()
)
WITH CHECK (
  bucket_id = 'case-documents' AND
  public.is_admin()
);

-- Agent: lecture/upload pour ses dossiers
CREATE POLICY "case_documents_agent_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'case-documents' AND
  public.is_agent() AND
  public.agent_has_case((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "case_documents_agent_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'case-documents' AND
  public.is_agent() AND
  public.agent_has_case((storage.foldername(name))[1]::uuid)
);

-- BankUser: lecture pour sa banque (selon visibilité document)
CREATE POLICY "case_documents_bankuser_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'case-documents' AND
  public.is_bank_user() AND
  public.case_belongs_to_user_bank((storage.foldername(name))[1]::uuid) AND
  EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.file_path = name
    AND d.visibility = 'bank'
  )
);

-- =============================================================================
-- POLITIQUES: payment-proofs
-- Structure: {case_id}/{payment_id}/{filename}
-- =============================================================================

CREATE POLICY "payment_proofs_admin_all"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  public.is_admin()
)
WITH CHECK (
  bucket_id = 'payment-proofs' AND
  public.is_admin()
);

CREATE POLICY "payment_proofs_agent_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  public.is_agent() AND
  public.agent_has_case((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "payment_proofs_agent_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs' AND
  public.is_agent() AND
  public.agent_has_case((storage.foldername(name))[1]::uuid)
);

-- BankUser: lecture des preuves de paiements VALIDÉS uniquement
CREATE POLICY "payment_proofs_bankuser_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  public.is_bank_user() AND
  public.case_belongs_to_user_bank((storage.foldername(name))[1]::uuid) AND
  EXISTS (
    SELECT 1 FROM public.payments p
    WHERE p.id = (storage.foldername(name))[2]::uuid
    AND p.status = 'validated'
  )
);

-- =============================================================================
-- POLITIQUES: action-attachments
-- Structure: {case_id}/{action_id}/{filename}
-- =============================================================================

CREATE POLICY "action_attachments_admin_all"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'action-attachments' AND
  public.is_admin()
)
WITH CHECK (
  bucket_id = 'action-attachments' AND
  public.is_admin()
);

CREATE POLICY "action_attachments_agent_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'action-attachments' AND
  public.is_agent() AND
  public.agent_has_case((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "action_attachments_agent_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'action-attachments' AND
  public.is_agent() AND
  public.agent_has_case((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "action_attachments_bankuser_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'action-attachments' AND
  public.is_bank_user() AND
  public.case_belongs_to_user_bank((storage.foldername(name))[1]::uuid)
);
