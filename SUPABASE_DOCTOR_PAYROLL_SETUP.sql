-- ============================================
-- SETUP DE REPASSE MÉDICO E CONVÊNIOS
-- ============================================

-- 1. Criar tabela de Convênios (se não existir)
CREATE TABLE IF NOT EXISTS insurance_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50), -- Código ANS ou interno
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE insurance_plans IS 'Convênios atendidos pela clínica';

CREATE INDEX IF NOT EXISTS idx_insurance_plans_clinic ON insurance_plans(clinic_id);

-- 2. Garantir relacionamento entre Doctors e Profiles para o PostgREST
-- O Supabase precisa de uma FK explícita para fazer o join automático profile:profiles(name)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'doctors_user_id_fkey'
    ) THEN
        ALTER TABLE doctors
        ADD CONSTRAINT doctors_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES profiles(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Atualizar policies (RLS) para insurance_plans
ALTER TABLE insurance_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view insurance plans from their clinic" 
ON insurance_plans FOR SELECT 
USING (auth.uid() IN (
  SELECT id FROM profiles WHERE clinic_id = insurance_plans.clinic_id
));

CREATE POLICY "Admins and Receptionists can manage insurance plans" 
ON insurance_plans FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND clinic_id = insurance_plans.clinic_id
    AND (role IN ('CLINIC_ADMIN', 'SUPER_ADMIN') OR has_financial_access = true)
  )
);
