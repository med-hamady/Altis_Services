-- =============================================================================
-- ALTIS SERVICES - Tables d'import Excel
-- Tables staging pour l'import en masse de dossiers
-- =============================================================================

-- =============================================================================
-- TYPE ENUMERE: Statut d'import
-- =============================================================================
CREATE TYPE import_status AS ENUM (
  'uploaded',          -- Fichier uploadé, pas encore traité
  'processing',        -- En cours d'analyse
  'ready_for_review',  -- Prêt pour validation admin
  'approved',          -- Validé, dossiers créés
  'rejected',          -- Rejeté par l'admin
  'failed'             -- Erreur lors du traitement
);

-- =============================================================================
-- TABLE: IMPORTS (un enregistrement par fichier uploadé)
-- =============================================================================
CREATE TABLE imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Contexte
  bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE RESTRICT,
  uploaded_by UUID NOT NULL,

  -- Fichier
  file_path TEXT NOT NULL,
  file_name VARCHAR(255),

  -- Traitement
  status import_status NOT NULL DEFAULT 'uploaded',
  error_message TEXT,
  total_rows INTEGER DEFAULT 0,
  valid_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  warning_rows INTEGER DEFAULT 0,

  -- Métadonnées
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID
);

CREATE INDEX idx_imports_bank ON imports(bank_id);
CREATE INDEX idx_imports_status ON imports(status);
CREATE INDEX idx_imports_uploaded_by ON imports(uploaded_by);
CREATE INDEX idx_imports_created ON imports(created_at DESC);

-- =============================================================================
-- TABLE: IMPORT_ROWS (une ligne par ligne Excel)
-- =============================================================================
CREATE TABLE import_rows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Lien vers l'import
  import_id UUID NOT NULL REFERENCES imports(id) ON DELETE CASCADE,

  -- Numéro de ligne dans le fichier
  row_number INTEGER NOT NULL,

  -- Données brutes parsées depuis Excel
  raw_json JSONB NOT NULL DEFAULT '{}',

  -- JSON normalisé prêt à créer (après traitement IA)
  proposed_json JSONB NOT NULL DEFAULT '{}',

  -- Validation
  errors JSONB DEFAULT '[]',    -- Erreurs bloquantes [{field, message}]
  warnings JSONB DEFAULT '[]',  -- Warnings non bloquants [{field, message}]
  confidence JSONB DEFAULT '{}', -- Score de confiance optionnel

  -- Approbation
  is_approved BOOLEAN NOT NULL DEFAULT false,

  -- Métadonnées
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_import_rows_import ON import_rows(import_id);
CREATE INDEX idx_import_rows_approved ON import_rows(import_id, is_approved);

-- =============================================================================
-- PERMISSIONS GRANT
-- =============================================================================
GRANT ALL ON imports TO authenticated, anon, service_role;
GRANT ALL ON import_rows TO authenticated, anon, service_role;

-- =============================================================================
-- RLS: imports (admin only)
-- =============================================================================
ALTER TABLE imports ENABLE ROW LEVEL SECURITY;

-- Admin: accès complet
CREATE POLICY "imports_admin_all"
ON imports FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Service role: accès complet (pour les Edge Functions)
CREATE POLICY "imports_service_all"
ON imports FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- RLS: import_rows (admin only)
-- =============================================================================
ALTER TABLE import_rows ENABLE ROW LEVEL SECURITY;

-- Admin: accès complet
CREATE POLICY "import_rows_admin_all"
ON import_rows FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Service role: accès complet (pour les Edge Functions)
CREATE POLICY "import_rows_service_all"
ON import_rows FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- STORAGE: Bucket imports
-- =============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'imports',
  'imports',
  false,
  52428800, -- 50 MB
  ARRAY[
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: admin only
CREATE POLICY "imports_storage_admin_all"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'imports' AND
  public.is_admin()
)
WITH CHECK (
  bucket_id = 'imports' AND
  public.is_admin()
);
