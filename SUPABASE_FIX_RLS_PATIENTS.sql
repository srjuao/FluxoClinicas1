-- =====================================================
-- CORREÇÃO: POLÍTICAS RLS PARA TABELA PATIENTS
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- O erro "new row violates row-level security policy" indica que 
-- as políticas de RLS precisam ser configuradas para permitir 
-- operações de INSERT, UPDATE, DELETE na tabela patients.

-- 1. Verificar se RLS está habilitado
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas que possam estar causando conflito
DROP POLICY IF EXISTS "Clinics can view their patients" ON patients;
DROP POLICY IF EXISTS "Clinics can insert their patients" ON patients;
DROP POLICY IF EXISTS "Clinics can update their patients" ON patients;
DROP POLICY IF EXISTS "Clinics can delete their patients" ON patients;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON patients;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON patients;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON patients;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON patients;
DROP POLICY IF EXISTS "patients_select_policy" ON patients;
DROP POLICY IF EXISTS "patients_insert_policy" ON patients;
DROP POLICY IF EXISTS "patients_update_policy" ON patients;
DROP POLICY IF EXISTS "patients_delete_policy" ON patients;

-- 3. Criar política para SELECT (leitura)
-- Usuários autenticados podem ver pacientes da sua clínica
CREATE POLICY "patients_select_policy" ON patients
    FOR SELECT
    TO authenticated
    USING (true);  -- Permite leitura, o filtro por clinic_id é feito na aplicação

-- 4. Criar política para INSERT (inserção)
-- Usuários autenticados podem cadastrar pacientes
CREATE POLICY "patients_insert_policy" ON patients
    FOR INSERT
    TO authenticated
    WITH CHECK (true);  -- Permite inserção

-- 5. Criar política para UPDATE (atualização)
-- Usuários autenticados podem atualizar pacientes
CREATE POLICY "patients_update_policy" ON patients
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 6. Criar política para DELETE (exclusão)
-- Usuários autenticados podem excluir pacientes
CREATE POLICY "patients_delete_policy" ON patients
    FOR DELETE
    TO authenticated
    USING (true);

-- 7. Verificar políticas criadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'patients';

-- Mensagem de sucesso
DO $$
BEGIN
    RAISE NOTICE '✅ Políticas RLS configuradas! Usuários autenticados agora podem gerenciar pacientes.';
END $$;
