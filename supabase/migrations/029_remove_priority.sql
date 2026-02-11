-- Remove priority column and type from the database
-- Priority has been removed from the UI

-- Drop the index first
DROP INDEX IF EXISTS idx_cases_priority;

-- Drop the column (removes the DEFAULT and NOT NULL constraint automatically)
ALTER TABLE cases DROP COLUMN IF EXISTS priority;

-- Drop the enum type
DROP TYPE IF EXISTS case_priority;
