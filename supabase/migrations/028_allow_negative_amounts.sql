-- Allow negative amount_principal in cases (real bank data can have negative values)
ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_amount_principal_check;
