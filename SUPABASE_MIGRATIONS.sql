-- ============================================
-- MIGRAÇÕES DO SUPABASE - FluxoClinicas
-- ============================================
-- Execute estas queries no SQL Editor do Supabase
-- na ordem apresentada abaixo
-- ============================================

-- ============================================
-- 1. VERIFICAR E ADICIONAR CAMPOS NA TABELA CLINICS
-- ============================================
-- Permite limitar usuários e ativar/desativar clínicas

-- Verificar se a coluna is_active existe antes de criar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'clinics' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE clinics ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Verificar se a coluna max_users existe antes de criar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'clinics' 
        AND column_name = 'max_users'
    ) THEN
        ALTER TABLE clinics ADD COLUMN max_users INTEGER DEFAULT NULL;
    END IF;
END $$;

-- Comentários para documentação
COMMENT ON COLUMN clinics.is_active IS 'Define se a clínica está ativa (usuários podem fazer login)';
COMMENT ON COLUMN clinics.max_users IS 'Limite máximo de usuários. NULL = ilimitado';

-- ============================================
-- 2. VERIFICAR E ADICIONAR CAMPO is_admin NA TABELA PROFILES
-- ============================================
-- Permite que médicos e recepcionistas tenham privilégios de administrador

-- Verificar se a coluna is_admin existe antes de criar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'is_admin'
    ) THEN
        ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Comentário para documentação
COMMENT ON COLUMN profiles.is_admin IS 'Concede privilégios de administrador da clínica ao usuário, independente do role';

-- ============================================
-- 3. VERIFICAR SE AS COLUNAS FORAM CRIADAS
-- ============================================
-- Execute esta query para verificar se tudo está correto

SELECT 
  table_name,
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('clinics', 'profiles')
  AND column_name IN ('is_active', 'max_users', 'is_admin')
ORDER BY table_name, column_name;

-- ============================================
-- 4. ATUALIZAR DADOS EXISTENTES (OPCIONAL)
-- ============================================
-- Se você já tem clínicas e usuários cadastrados, 
-- execute estas queries para definir valores padrão

-- Todas as clínicas existentes ficam ativas por padrão
UPDATE clinics 
SET is_active = true 
WHERE is_active IS NULL;

-- Nenhum usuário existente tem privilégios de admin por padrão
UPDATE profiles 
SET is_admin = false 
WHERE is_admin IS NULL;

-- ============================================
-- 5. CRIAR ÍNDICES PARA MELHOR PERFORMANCE (OPCIONAL)
-- ============================================

-- Índice para buscar clínicas ativas
CREATE INDEX IF NOT EXISTS idx_clinics_is_active 
ON clinics(is_active) 
WHERE is_active = true;

-- Índice para buscar usuários com privilégios de admin
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin 
ON profiles(is_admin) 
WHERE is_admin = true;

-- Índice para buscar usuários por clínica e role
CREATE INDEX IF NOT EXISTS idx_profiles_clinic_role 
ON profiles(clinic_id, role) 
WHERE clinic_id IS NOT NULL;

-- ============================================
-- 6. VERIFICAR POLÍTICAS RLS (Row Level Security)
-- ============================================
-- Certifique-se de que as políticas RLS permitem:
-- - Super Admin ver todas as clínicas
-- - Clinic Admin ver apenas sua clínica
-- - Usuários com is_admin = true verem sua clínica

-- Exemplo de política (ajuste conforme suas necessidades):
-- CREATE POLICY "Users can view their clinic"
-- ON clinics FOR SELECT
-- USING (
--   auth.uid() IN (
--     SELECT id FROM profiles 
--     WHERE clinic_id = clinics.id 
--     AND (role = 'CLINIC_ADMIN' OR is_admin = true)
--   )
--   OR EXISTS (
--     SELECT 1 FROM profiles 
--     WHERE id = auth.uid() 
--     AND role = 'SUPER_ADMIN'
--   )
-- );

-- ============================================
-- RESUMO DAS ALTERAÇÕES
-- ============================================
-- 
-- ✅ clinics.is_active (BOOLEAN, default: true)
--    → Controla se a clínica está ativa
--
-- ✅ clinics.max_users (INTEGER, default: NULL)
--    → Limite máximo de usuários (NULL = ilimitado)
--
-- ✅ profiles.is_admin (BOOLEAN, default: false)
--    → Concede privilégios de admin independente do role
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

