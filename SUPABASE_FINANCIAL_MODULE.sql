-- ============================================
-- MÓDULO FINANCEIRO - FluxoClinicas
-- ============================================
-- Execute estas queries no SQL Editor do Supabase
-- na ordem apresentada abaixo
-- ============================================

-- ============================================
-- 1. CRIAR TABELA doctor_pricing
-- ============================================
-- Armazena o valor da consulta de cada médico

CREATE TABLE IF NOT EXISTS doctor_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  consultation_value NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(doctor_id, clinic_id)
);

-- Comentários
COMMENT ON TABLE doctor_pricing IS 'Valores de consulta por médico';
COMMENT ON COLUMN doctor_pricing.consultation_value IS 'Valor da consulta em reais';

-- Índice
CREATE INDEX IF NOT EXISTS idx_doctor_pricing_doctor ON doctor_pricing(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_pricing_clinic ON doctor_pricing(clinic_id);

-- ============================================
-- 2. CRIAR TABELA clinic_commission
-- ============================================
-- Armazena a porcentagem que a clínica recebe de cada médico

CREATE TABLE IF NOT EXISTS clinic_commission (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  commission_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(doctor_id, clinic_id)
);

-- Comentários
COMMENT ON TABLE clinic_commission IS 'Porcentagem que a clínica recebe por médico';
COMMENT ON COLUMN clinic_commission.commission_percentage IS 'Porcentagem (0-100) que a clínica recebe';

-- Índice
CREATE INDEX IF NOT EXISTS idx_clinic_commission_doctor ON clinic_commission(doctor_id);
CREATE INDEX IF NOT EXISTS idx_clinic_commission_clinic ON clinic_commission(clinic_id);

-- ============================================
-- 3. CRIAR TABELA insurance_plans
-- ============================================
-- Armazena os convênios atendidos e seus descontos

CREATE TABLE IF NOT EXISTS insurance_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  discount_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários
COMMENT ON TABLE insurance_plans IS 'Convênios atendidos pela clínica';
COMMENT ON COLUMN insurance_plans.discount_percentage IS 'Porcentagem de desconto (0-100)';
COMMENT ON COLUMN insurance_plans.is_active IS 'Se o convênio está ativo';

-- Índices
CREATE INDEX IF NOT EXISTS idx_insurance_plans_clinic ON insurance_plans(clinic_id);
CREATE INDEX IF NOT EXISTS idx_insurance_plans_active ON insurance_plans(clinic_id, is_active) WHERE is_active = true;

-- ============================================
-- 4. ADICIONAR CAMPOS FINANCEIROS NA TABELA appointments
-- ============================================

-- Verificar e adicionar is_insurance
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'is_insurance'
    ) THEN
        ALTER TABLE appointments ADD COLUMN is_insurance BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Verificar e adicionar insurance_plan_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'insurance_plan_id'
    ) THEN
        ALTER TABLE appointments ADD COLUMN insurance_plan_id UUID REFERENCES insurance_plans(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Verificar e adicionar consultation_value
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'consultation_value'
    ) THEN
        ALTER TABLE appointments ADD COLUMN consultation_value NUMERIC(10, 2);
    END IF;
END $$;

-- Verificar e adicionar discount_amount
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'discount_amount'
    ) THEN
        ALTER TABLE appointments ADD COLUMN discount_amount NUMERIC(10, 2) DEFAULT 0.00;
    END IF;
END $$;

-- Verificar e adicionar final_value
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'final_value'
    ) THEN
        ALTER TABLE appointments ADD COLUMN final_value NUMERIC(10, 2);
    END IF;
END $$;

-- Verificar e adicionar clinic_commission_percentage
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'clinic_commission_percentage'
    ) THEN
        ALTER TABLE appointments ADD COLUMN clinic_commission_percentage NUMERIC(5, 2);
    END IF;
END $$;

-- Verificar e adicionar clinic_commission_amount
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'clinic_commission_amount'
    ) THEN
        ALTER TABLE appointments ADD COLUMN clinic_commission_amount NUMERIC(10, 2) DEFAULT 0.00;
    END IF;
END $$;

-- Verificar e adicionar doctor_amount
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'doctor_amount'
    ) THEN
        ALTER TABLE appointments ADD COLUMN doctor_amount NUMERIC(10, 2) DEFAULT 0.00;
    END IF;
END $$;

-- Comentários
COMMENT ON COLUMN appointments.is_insurance IS 'Se o agendamento é por convênio ou particular';
COMMENT ON COLUMN appointments.insurance_plan_id IS 'ID do convênio utilizado';
COMMENT ON COLUMN appointments.consultation_value IS 'Valor original da consulta';
COMMENT ON COLUMN appointments.discount_amount IS 'Valor do desconto aplicado';
COMMENT ON COLUMN appointments.final_value IS 'Valor final após desconto';
COMMENT ON COLUMN appointments.clinic_commission_percentage IS 'Porcentagem que a clínica recebe';
COMMENT ON COLUMN appointments.clinic_commission_amount IS 'Valor que a clínica recebe';
COMMENT ON COLUMN appointments.doctor_amount IS 'Valor que o médico recebe';

-- ============================================
-- 5. CRIAR FUNÇÃO PARA ATUALIZAR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_doctor_pricing_updated_at ON doctor_pricing;
CREATE TRIGGER update_doctor_pricing_updated_at
    BEFORE UPDATE ON doctor_pricing
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clinic_commission_updated_at ON clinic_commission;
CREATE TRIGGER update_clinic_commission_updated_at
    BEFORE UPDATE ON clinic_commission
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_insurance_plans_updated_at ON insurance_plans;
CREATE TRIGGER update_insurance_plans_updated_at
    BEFORE UPDATE ON insurance_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. VERIFICAR SE AS TABELAS FORAM CRIADAS
-- ============================================

SELECT 
  table_name,
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('doctor_pricing', 'clinic_commission', 'insurance_plans')
ORDER BY table_name, column_name;

-- Verificar colunas adicionadas em appointments
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'appointments'
  AND column_name IN ('is_insurance', 'insurance_plan_id', 'consultation_value', 'discount_amount', 'final_value', 'clinic_commission_percentage', 'clinic_commission_amount', 'doctor_amount')
ORDER BY column_name;

-- ============================================
-- RESUMO DAS ALTERAÇÕES
-- ============================================
-- 
-- ✅ doctor_pricing
--    → Valores de consulta por médico
--
-- ✅ clinic_commission
--    → Porcentagem que a clínica recebe por médico
--
-- ✅ insurance_plans
--    → Convênios atendidos com descontos
--
-- ✅ appointments (novos campos)
--    → is_insurance, insurance_plan_id
--    → consultation_value, discount_amount, final_value
--    → clinic_commission_percentage, clinic_commission_amount, doctor_amount
--
-- ============================================
-- COMO EXECUTAR
-- ============================================
-- 
-- 1. Acesse o Supabase Dashboard
-- 2. Vá em "SQL Editor"
-- 3. Cole e execute as queries acima na ordem
-- 4. Verifique se não há erros
-- 5. Teste as funcionalidades no sistema
--
-- ============================================

