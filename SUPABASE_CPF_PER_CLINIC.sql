-- =====================================================
-- AJUSTE: CPF ÚNICO POR CLÍNICA (não global)
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- Este script permite que o mesmo CPF exista em clínicas diferentes,
-- mas garante que dentro de uma mesma clínica não haja CPFs duplicados.

-- 1. Verificar se existe uma constraint de CPF único global
-- (pode ter nomes diferentes dependendo de como foi criada)
DO $$ 
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    -- Verifica se existe index único global no CPF
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'patients' 
        AND indexname = 'patients_cpf_key'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        RAISE NOTICE 'Removendo constraint global de CPF único...';
        DROP INDEX IF EXISTS patients_cpf_key;
    END IF;
END $$;

-- 2. Remover índice único global se existir (com outros possíveis nomes)
DROP INDEX IF EXISTS patients_cpf_unique;
DROP INDEX IF EXISTS idx_patients_cpf;
DROP INDEX IF EXISTS patients_cpf_idx;

-- 3. Remover constraint única global se existir
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_cpf_key;
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_cpf_unique;

-- 4. Criar novo índice ÚNICO para CPF por CLÍNICA
-- Isso permite que o mesmo CPF exista em clínicas diferentes
CREATE UNIQUE INDEX IF NOT EXISTS unique_cpf_per_clinic 
ON patients (clinic_id, cpf) 
WHERE cpf IS NOT NULL;

-- 5. Adicionar comentário explicativo
COMMENT ON INDEX unique_cpf_per_clinic IS 'CPF deve ser único apenas dentro de cada clínica. O mesmo paciente pode ter cadastros com o mesmo CPF em clínicas diferentes.';

-- 6. Verificar o resultado
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'patients' 
AND (indexname LIKE '%cpf%' OR indexdef LIKE '%cpf%');

-- Mensagem de sucesso
DO $$
BEGIN
    RAISE NOTICE '✅ Configuração concluída! O CPF agora é único apenas dentro de cada clínica.';
END $$;
