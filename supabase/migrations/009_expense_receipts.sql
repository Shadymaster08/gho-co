-- Add receipt image URL to expenses
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_url text;
