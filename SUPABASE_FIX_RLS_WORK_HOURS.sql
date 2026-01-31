-- Habilitar RLS
ALTER TABLE doctor_work_hours ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "doctor_work_hours_select_policy" ON doctor_work_hours;
DROP POLICY IF EXISTS "doctor_work_hours_insert_policy" ON doctor_work_hours;
DROP POLICY IF EXISTS "doctor_work_hours_update_policy" ON doctor_work_hours;
DROP POLICY IF EXISTS "doctor_work_hours_delete_policy" ON doctor_work_hours;

-- Criar novas políticas permissivas para usuários autenticados
-- (A filtragem por clinic_id já é feita na aplicação)

-- Permite SELECT
CREATE POLICY "doctor_work_hours_select_policy" ON doctor_work_hours
    FOR SELECT
    TO authenticated
    USING (true);

-- Permite INSERT
CREATE POLICY "doctor_work_hours_insert_policy" ON doctor_work_hours
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Permite UPDATE
CREATE POLICY "doctor_work_hours_update_policy" ON doctor_work_hours
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Permite DELETE
CREATE POLICY "doctor_work_hours_delete_policy" ON doctor_work_hours
    FOR DELETE
    TO authenticated
    USING (true);

-- Garantir permissões básicas
GRANT ALL ON doctor_work_hours TO authenticated;
GRANT ALL ON doctor_work_hours TO service_role;
