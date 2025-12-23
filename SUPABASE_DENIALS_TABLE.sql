-- Execute este SQL no Supabase para criar a tabela insurance_denials
-- Certifique-se de que a tabela insurance_guides já foi criada antes

CREATE TABLE IF NOT EXISTS insurance_denials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES insurance_guides(id) ON DELETE CASCADE,
  insurance_plan_id UUID NOT NULL REFERENCES insurance_plans(id) ON DELETE CASCADE,
  procedure_code VARCHAR(20),
  denial_reason TEXT NOT NULL,
  denial_code VARCHAR(20),
  denied_value NUMERIC(10, 2) NOT NULL,
  recovered_value NUMERIC(10, 2) DEFAULT 0.00,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  denied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  appealed_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  appeal_notes TEXT,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insurance_denials_guide ON insurance_denials(guide_id);
CREATE INDEX IF NOT EXISTS idx_insurance_denials_insurance ON insurance_denials(insurance_plan_id);
CREATE INDEX IF NOT EXISTS idx_insurance_denials_status ON insurance_denials(status);
