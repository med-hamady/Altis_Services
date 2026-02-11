-- Add photo_url column to debtors_pp table
ALTER TABLE debtors_pp ADD COLUMN IF NOT EXISTS photo_url TEXT;

COMMENT ON COLUMN debtors_pp.photo_url IS 'URL ou chemin vers la photo/spécimen du débiteur';
