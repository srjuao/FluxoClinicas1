-- Add clinic_id to insurance_denials if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'insurance_denials' AND column_name = 'clinic_id') THEN
        ALTER TABLE insurance_denials ADD COLUMN clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Update existing records to have clinic_id from guides if possible (optional but good practice)
-- UPDATE insurance_denials d
-- SET clinic_id = g.clinic_id
-- FROM insurance_guides g
-- WHERE d.guide_id = g.id AND d.clinic_id IS NULL;

-- Make it NOT NULL after population if desired
-- ALTER TABLE insurance_denials ALTER COLUMN clinic_id SET NOT NULL;
