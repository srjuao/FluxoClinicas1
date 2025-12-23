-- Script para adicionar coluna de comissão padrão na tabela clinics
-- Execute este script no Supabase SQL Editor

-- 1. Adicionar campo default_commission_percentage à tabela clinics
ALTER TABLE clinics 
ADD COLUMN IF NOT EXISTS default_commission_percentage NUMERIC DEFAULT 30;

-- 2. Criar comentário para documentação
COMMENT ON COLUMN clinics.default_commission_percentage IS 'Porcentagem padrão de comissão da clínica sobre consultas médicas';

-- 3. Atualizar clínicas existentes para ter valor padrão de 30%
UPDATE clinics 
SET default_commission_percentage = 30 
WHERE default_commission_percentage IS NULL;
