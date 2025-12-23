-- ============================================
-- FIX: ESTABELECER RELACIONAMENTO ENTRE INSURANCE_GUIDES E DOCTORS
-- ============================================

-- O erro "Searched for a foreign key relationship..." indica que o PostgREST
-- não encontrou a FK. Vamos recriá-la explicitamente.

DO $$
BEGIN
    -- 1. Verificar se a coluna doctor_id existe, se não, criar
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'insurance_guides' 
        AND column_name = 'doctor_id'
    ) THEN
        ALTER TABLE insurance_guides ADD COLUMN doctor_id UUID;
    END IF;

    -- 2. Verificar se a constraint já existe
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'insurance_guides_doctor_id_fkey'
        AND table_name = 'insurance_guides'
    ) THEN
        -- Tentar adicionar a constraint
        -- Primeiro removemos qualquer constraint antiga com nome genérico se houver dúvida, 
        -- mas melhor ser específico.
        
        ALTER TABLE insurance_guides
        ADD CONSTRAINT insurance_guides_doctor_id_fkey
        FOREIGN KEY (doctor_id)
        REFERENCES doctors(id)
        ON DELETE SET NULL;
        
        RAISE NOTICE 'Foreign key insurance_guides_doctor_id_fkey created.';
    ELSE
        RAISE NOTICE 'Foreign key insurance_guides_doctor_id_fkey already exists.';
    END IF;
END $$;

-- 3. Atualizar o cache do schema do Supabase (embora isso aconteça auto, um comment ajuda)
COMMENT ON CONSTRAINT insurance_guides_doctor_id_fkey ON insurance_guides IS 'Link to doctors table';

-- 4. Garantir que RLS permita acesso
ALTER TABLE insurance_guides ENABLE ROW LEVEL SECURITY;

-- Recriar policies se necessário (simplificado para garantir acesso ao admin/médico)
DROP POLICY IF EXISTS "Users can view insurance guides" ON insurance_guides;
CREATE POLICY "Users can view insurance guides" 
ON insurance_guides FOR SELECT 
USING (
  -- Admin ou Recepcionista da clínica
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND clinic_id = insurance_guides.clinic_id
    AND (role IN ('CLINIC_ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST') OR has_financial_access = true)
  ))
  OR 
  -- O próprio médico
  (auth.uid() IN (
    SELECT user_id FROM doctors WHERE id = insurance_guides.doctor_id
  ))
);
