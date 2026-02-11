-- Add receipt_path column to payments table for storing payment receipts
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_path TEXT;
