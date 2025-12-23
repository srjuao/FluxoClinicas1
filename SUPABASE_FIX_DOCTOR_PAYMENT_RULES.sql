-- ============================================
-- FIX: Add missing columns to doctor_payment_rules
-- Execute this in Supabase SQL Editor
-- ============================================

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add id column with default UUID if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'doctor_payment_rules' AND column_name = 'id') THEN
        ALTER TABLE doctor_payment_rules ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();
    END IF;

    -- Add updated_at column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'doctor_payment_rules' AND column_name = 'updated_at') THEN
        ALTER TABLE doctor_payment_rules ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- Add created_at column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'doctor_payment_rules' AND column_name = 'created_at') THEN
        ALTER TABLE doctor_payment_rules ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- Add is_active column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'doctor_payment_rules' AND column_name = 'is_active') THEN
        ALTER TABLE doctor_payment_rules ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Drop any existing trigger that might cause issues
DROP TRIGGER IF EXISTS set_updated_at_doctor_payment_rules ON doctor_payment_rules;

-- Create or replace the update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Recreate the trigger (only if updated_at column exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'doctor_payment_rules' AND column_name = 'updated_at') THEN
        CREATE TRIGGER set_updated_at_doctor_payment_rules
            BEFORE UPDATE ON doctor_payment_rules
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Set default for id column
ALTER TABLE doctor_payment_rules 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Verify the table structure
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'doctor_payment_rules'
ORDER BY ordinal_position;
