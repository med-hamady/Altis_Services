-- Migration: Add has_guarantee field to cases table with automatic trigger

-- 1. Add the has_guarantee column
ALTER TABLE cases
ADD COLUMN has_guarantee BOOLEAN NOT NULL DEFAULT false;

-- 2. Update existing cases based on notes field (checks for "Garantie:" pattern)
UPDATE cases
SET has_guarantee = (
  notes IS NOT NULL
  AND notes LIKE '%Garantie:%'
  AND LENGTH(TRIM(SPLIT_PART(SPLIT_PART(notes, 'Garantie:', 2), '|', 1))) > 0
);

-- 3. Create function to automatically update has_guarantee based on notes field
CREATE OR REPLACE FUNCTION public.update_has_guarantee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set has_guarantee based on notes field (check for "Garantie:" pattern)
  NEW.has_guarantee := (
    NEW.notes IS NOT NULL
    AND NEW.notes LIKE '%Garantie:%'
    AND LENGTH(TRIM(SPLIT_PART(SPLIT_PART(NEW.notes, 'Garantie:', 2), '|', 1))) > 0
  );

  RETURN NEW;
END;
$$;

-- 4. Create trigger to run before INSERT or UPDATE
DROP TRIGGER IF EXISTS trg_update_has_guarantee ON cases;
CREATE TRIGGER trg_update_has_guarantee
  BEFORE INSERT OR UPDATE OF notes
  ON cases
  FOR EACH ROW
  EXECUTE FUNCTION update_has_guarantee();

-- 5. Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_cases_has_guarantee ON cases(has_guarantee);

COMMENT ON COLUMN cases.has_guarantee IS 'Automatically set to true if notes field contains "Garantie:" with a value, false otherwise';
