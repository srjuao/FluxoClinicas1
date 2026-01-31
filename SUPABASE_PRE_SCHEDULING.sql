-- =====================================================
-- PRÉ-AGENDAMENTO MIGRATION
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. PRIMEIRO: Adicionar o novo valor ao ENUM appointment_status
-- Isso é necessário porque o banco usa um ENUM para validar os status
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'PRE_SCHEDULED';

-- 2. Adicionar campos para pré-agendamento na tabela appointments
-- Esses campos permitem criar um agendamento mesmo sem um paciente cadastrado
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS pre_schedule_name TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pre_schedule_phone TEXT DEFAULT NULL;

-- 3. Alterar o patient_id para permitir NULL (para pré-agendamentos)
-- Verificar se a constraint NOT NULL existe antes de remover
DO $$ 
BEGIN
    -- Tentar remover a constraint NOT NULL do patient_id
    ALTER TABLE appointments ALTER COLUMN patient_id DROP NOT NULL;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'patient_id já permite NULL ou erro ao alterar: %', SQLERRM;
END $$;

-- 4. Adicionar comentários explicativos
COMMENT ON COLUMN appointments.pre_schedule_name IS 'Nome do paciente para pré-agendamento (antes do cadastro completo)';
COMMENT ON COLUMN appointments.pre_schedule_phone IS 'Telefone do paciente para pré-agendamento';

-- 5. Criar índice para buscar pré-agendamentos facilmente
CREATE INDEX IF NOT EXISTS idx_appointments_pre_scheduled 
ON appointments (clinic_id, status) 
WHERE status = 'PRE_SCHEDULED';

-- 6. Verificar a alteração
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'appointments' 
AND column_name IN ('pre_schedule_name', 'pre_schedule_phone', 'patient_id', 'status');

-- 7. Verificar os valores do enum
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'appointment_status');
