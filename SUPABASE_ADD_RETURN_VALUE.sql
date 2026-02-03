-- ============================================
-- ADICIONAR VALOR DE RETORNO NA TABELA doctor_pricing
-- ============================================

-- Adicionar return_consultation_value
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'doctor_pricing' 
        AND column_name = 'return_consultation_value'
    ) THEN
        ALTER TABLE doctor_pricing ADD COLUMN return_consultation_value NUMERIC(10, 2) DEFAULT 0.00;
    END IF;
END $$;

COMMENT ON COLUMN doctor_pricing.return_consultation_value IS 'Valor da consulta de retorno em reais';
