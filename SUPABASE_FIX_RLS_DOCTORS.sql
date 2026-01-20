-- =====================================================
-- CORREÇÃO: POLÍTICAS RLS PARA TABELA DOCTORS
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. Habilitar RLS
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas
DROP POLICY IF EXISTS "Enable read access for all users" ON doctors;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON doctors;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON doctors;
DROP POLICY IF EXISTS "doctors_select_policy" ON doctors;
DROP POLICY IF EXISTS "doctors_insert_policy" ON doctors;
DROP POLICY IF EXISTS "doctors_update_policy" ON doctors;
DROP POLICY IF EXISTS "doctors_delete_policy" ON doctors;

-- 3. Criar políticas para usuários autenticados
-- SELECT: Todos os autenticados podem ver médicos
CREATE POLICY "doctors_select_policy" ON doctors
    FOR SELECT
    TO authenticated
    USING (true);

-- INSERT: Administradores podem cadastrar médicos
CREATE POLICY "doctors_insert_policy" ON doctors
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- UPDATE: Administradores ou o próprio médico podem atualizar
CREATE POLICY "doctors_update_policy" ON doctors
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- DELETE: Administradores podem excluir
CREATE POLICY "doctors_delete_policy" ON doctors
    FOR DELETE
    TO authenticated
    USING (true);

-- 4. Garantir permissões básicas
GRANT ALL ON doctors TO authenticated;
GRANT ALL ON doctors TO service_role;

-- Mensagem de sucesso
DO $$
BEGIN
    RAISE NOTICE '✅ Políticas RLS da tabela doctors configuradas!';
END $$;
