-- Add color column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#534AB7';
