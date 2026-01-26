-- ============================================
-- SISTEMA FINANCEIRO PREMIUM - FluxoClinicas
-- ============================================
-- Execute estas queries no SQL Editor do Supabase
-- ============================================

-- ============================================
-- 1. GUIAS DE CONVÊNIO
-- ============================================

CREATE TABLE IF NOT EXISTS insurance_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  insurance_plan_id UUID NOT NULL REFERENCES insurance_plans(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  
  -- Identificação
  guide_number VARCHAR(50) NOT NULL,
  lot_number VARCHAR(50),
  authorization_number VARCHAR(50),
  
  -- Procedimento
  procedure_code VARCHAR(20), -- Código TUSS
  procedure_name VARCHAR(255),
  
  -- Valores
  presented_value NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  approved_value NUMERIC(10, 2) DEFAULT 0.00,
  
  -- Status: DRAFT, SENT, ANALYZING, APPROVED, PAID, DENIED, PARTIALLY_DENIED
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  
  -- Datas
  service_date DATE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  expected_payment_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE insurance_guides IS 'Guias de convênio para faturamento';
COMMENT ON COLUMN insurance_guides.procedure_code IS 'Código TUSS do procedimento';
COMMENT ON COLUMN insurance_guides.presented_value IS 'Valor apresentado ao convênio';
COMMENT ON COLUMN insurance_guides.approved_value IS 'Valor aprovado pelo convênio';

CREATE INDEX IF NOT EXISTS idx_insurance_guides_clinic ON insurance_guides(clinic_id);
CREATE INDEX IF NOT EXISTS idx_insurance_guides_insurance ON insurance_guides(insurance_plan_id);
CREATE INDEX IF NOT EXISTS idx_insurance_guides_status ON insurance_guides(status);
CREATE INDEX IF NOT EXISTS idx_insurance_guides_lot ON insurance_guides(lot_number);

-- ============================================
-- 2. GLOSAS (NEGATIVAS DE CONVÊNIO)
-- ============================================
-- NOTA: clinic_id é derivado da guia relacionada

CREATE TABLE IF NOT EXISTS insurance_denials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES insurance_guides(id) ON DELETE CASCADE,
  insurance_plan_id UUID NOT NULL REFERENCES insurance_plans(id) ON DELETE CASCADE,
  
  -- Detalhes da glosa
  procedure_code VARCHAR(20),
  denial_reason TEXT NOT NULL,
  denial_code VARCHAR(20),
  
  -- Valores
  denied_value NUMERIC(10, 2) NOT NULL,
  recovered_value NUMERIC(10, 2) DEFAULT 0.00,
  
  -- Status: PENDING, APPEALING, RECOVERED, PARTIALLY_RECOVERED, LOST
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  
  -- Datas
  denied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  appealed_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  -- Recurso
  appeal_notes TEXT,
  resolution_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE insurance_denials IS 'Registro de glosas de convênios';

CREATE INDEX IF NOT EXISTS idx_insurance_denials_guide ON insurance_denials(guide_id);
CREATE INDEX IF NOT EXISTS idx_insurance_denials_insurance ON insurance_denials(insurance_plan_id);
CREATE INDEX IF NOT EXISTS idx_insurance_denials_status ON insurance_denials(status);


-- ============================================
-- 3. REGRAS DE REPASSE MÉDICO
-- ============================================

CREATE TABLE IF NOT EXISTS doctor_payment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  
  -- Tipo de pagamento: PERCENTAGE, FIXED, PER_PROCEDURE
  payment_type VARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE',
  
  -- Valores padrão
  default_percentage NUMERIC(5, 2) DEFAULT 60.00 CHECK (default_percentage >= 0 AND default_percentage <= 100),
  default_fixed_value NUMERIC(10, 2) DEFAULT 0.00,
  
  -- Customização por convênio (null = aplica a todos)
  insurance_plan_id UUID REFERENCES insurance_plans(id) ON DELETE CASCADE,
  
  -- Customização por procedimento (null = aplica a todos)
  procedure_code VARCHAR(20),
  custom_value NUMERIC(10, 2),
  
  -- Se é valor fixo por procedimento ou percentual customizado
  custom_type VARCHAR(20), -- FIXED_VALUE, CUSTOM_PERCENTAGE
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(doctor_id, clinic_id, insurance_plan_id, procedure_code)
);

COMMENT ON TABLE doctor_payment_rules IS 'Regras de repasse por médico, convênio e procedimento';

CREATE INDEX IF NOT EXISTS idx_doctor_payment_rules_doctor ON doctor_payment_rules(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_payment_rules_clinic ON doctor_payment_rules(clinic_id);

-- ============================================
-- 4. TRANSAÇÕES DE REPASSE MÉDICO
-- ============================================

CREATE TABLE IF NOT EXISTS doctor_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  
  -- Período
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Valores
  total_produced NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_clinic_commission NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_due NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_paid NUMERIC(10, 2) DEFAULT 0.00,
  
  -- Detalhamento
  total_particular NUMERIC(10, 2) DEFAULT 0.00,
  total_insurance NUMERIC(10, 2) DEFAULT 0.00,
  total_appointments INTEGER DEFAULT 0,
  
  -- Status: PENDING, PARTIAL, PAID
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  
  -- Pagamento
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_method VARCHAR(50),
  payment_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE doctor_payments IS 'Transações de repasse para médicos';

CREATE INDEX IF NOT EXISTS idx_doctor_payments_doctor ON doctor_payments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_payments_period ON doctor_payments(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_doctor_payments_status ON doctor_payments(status);

-- ============================================
-- 5. DESPESAS DA CLÍNICA
-- ============================================

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Categoria
  category VARCHAR(50) NOT NULL, -- MEDICAL_STAFF, RECEPTION, RENT, EQUIPMENT, MATERIALS, MARKETING, SYSTEMS, UTILITIES, OTHER
  
  -- Tipo: ADMINISTRATIVE (administrativo), ASSISTENTIAL (assistencial)
  expense_type VARCHAR(20) NOT NULL DEFAULT 'ADMINISTRATIVE',
  
  -- Detalhes
  description TEXT NOT NULL,
  supplier VARCHAR(255),
  
  -- Valores
  amount NUMERIC(10, 2) NOT NULL,
  
  -- Datas
  due_date DATE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  
  -- Status: PENDING, PAID, OVERDUE, CANCELED
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  
  -- Recorrência: ONCE, MONTHLY, YEARLY
  recurrence VARCHAR(20) DEFAULT 'ONCE',
  
  -- Pagamento
  payment_method VARCHAR(50),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE expenses IS 'Despesas operacionais da clínica';
COMMENT ON COLUMN expenses.expense_type IS 'ADMINISTRATIVE = despesas administrativas, ASSISTENTIAL = despesas assistenciais';

CREATE INDEX IF NOT EXISTS idx_expenses_clinic ON expenses(clinic_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_due_date ON expenses(due_date);

-- ============================================
-- 6. ESTATÍSTICAS DE PAGAMENTO POR CONVÊNIO
-- ============================================

CREATE TABLE IF NOT EXISTS insurance_payment_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  insurance_plan_id UUID NOT NULL REFERENCES insurance_plans(id) ON DELETE CASCADE,
  
  -- Estatísticas
  avg_days_to_payment INTEGER DEFAULT 0,
  total_guides INTEGER DEFAULT 0,
  total_paid_guides INTEGER DEFAULT 0,
  total_denied_guides INTEGER DEFAULT 0,
  
  -- Valores
  total_presented NUMERIC(12, 2) DEFAULT 0.00,
  total_approved NUMERIC(12, 2) DEFAULT 0.00,
  total_denied NUMERIC(12, 2) DEFAULT 0.00,
  total_recovered NUMERIC(12, 2) DEFAULT 0.00,
  
  -- Taxas
  approval_rate NUMERIC(5, 2) DEFAULT 0.00,
  denial_rate NUMERIC(5, 2) DEFAULT 0.00,
  recovery_rate NUMERIC(5, 2) DEFAULT 0.00,
  
  -- Período de referência
  period_month INTEGER,
  period_year INTEGER,
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(clinic_id, insurance_plan_id, period_month, period_year)
);

COMMENT ON TABLE insurance_payment_stats IS 'Estatísticas mensais de pagamento por convênio';

CREATE INDEX IF NOT EXISTS idx_insurance_payment_stats_clinic ON insurance_payment_stats(clinic_id);
CREATE INDEX IF NOT EXISTS idx_insurance_payment_stats_insurance ON insurance_payment_stats(insurance_plan_id);

-- ============================================
-- 7. ATUALIZAR TABELA APPOINTMENTS COM CAMPOS FINANCEIROS
-- ============================================

-- Adicionar forma de pagamento
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE appointments ADD COLUMN payment_method VARCHAR(50);
    END IF;
END $$;

-- Adicionar status de pagamento
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE appointments ADD COLUMN payment_status VARCHAR(20) DEFAULT 'PENDING';
    END IF;
END $$;

-- Adicionar data de pagamento
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'paid_at'
    ) THEN
        ALTER TABLE appointments ADD COLUMN paid_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Adicionar parcelas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'installments'
    ) THEN
        ALTER TABLE appointments ADD COLUMN installments INTEGER DEFAULT 1;
    END IF;
END $$;

-- Adicionar número da guia
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'guide_number'
    ) THEN
        ALTER TABLE appointments ADD COLUMN guide_number VARCHAR(50);
    END IF;
END $$;

COMMENT ON COLUMN appointments.payment_method IS 'PIX, CREDIT_CARD, DEBIT_CARD, CASH, BANK_SLIP';
COMMENT ON COLUMN appointments.payment_status IS 'PENDING, PAID, OVERDUE, CANCELED';
COMMENT ON COLUMN appointments.installments IS 'Número de parcelas (cartão de crédito)';

-- ============================================
-- 8. TRIGGERS PARA UPDATED_AT
-- ============================================

DROP TRIGGER IF EXISTS update_insurance_guides_updated_at ON insurance_guides;
CREATE TRIGGER update_insurance_guides_updated_at
    BEFORE UPDATE ON insurance_guides
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_insurance_denials_updated_at ON insurance_denials;
CREATE TRIGGER update_insurance_denials_updated_at
    BEFORE UPDATE ON insurance_denials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_doctor_payment_rules_updated_at ON doctor_payment_rules;
CREATE TRIGGER update_doctor_payment_rules_updated_at
    BEFORE UPDATE ON doctor_payment_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_doctor_payments_updated_at ON doctor_payments;
CREATE TRIGGER update_doctor_payments_updated_at
    BEFORE UPDATE ON doctor_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. VERIFICAR TABELAS CRIADAS
-- ============================================

SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN (
    'insurance_guides', 
    'insurance_denials', 
    'doctor_payment_rules', 
    'doctor_payments', 
    'expenses', 
    'insurance_payment_stats'
  )
ORDER BY table_name;

-- ============================================
-- RESUMO DAS ALTERAÇÕES
-- ============================================
-- 
-- ✅ insurance_guides
--    → Guias de convênio com TUSS, lote, status
--
-- ✅ insurance_denials
--    → Glosas com motivo, recurso, valores
--
-- ✅ doctor_payment_rules
--    → Regras flexíveis de repasse (%, fixo, por procedimento)
--
-- ✅ doctor_payments
--    → Transações de repasse por período
--
-- ✅ expenses
--    → Despesas administrativas e assistenciais
--
-- ✅ insurance_payment_stats
--    → Estatísticas de tempo de pagamento por convênio
--
-- ✅ appointments (novos campos)
--    → payment_method, payment_status, paid_at, installments, guide_number
--
-- ============================================
