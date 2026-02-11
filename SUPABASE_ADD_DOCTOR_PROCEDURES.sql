-- ============================================
-- ADICIONAR TABELA DE PROCEDIMENTOS/CIRURGIAS
-- ============================================

-- Tabela para armazenar os tipos de procedimentos/cirurgias que um médico realiza e seus valores
CREATE TABLE IF NOT EXISTS public.doctor_procedures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    value NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.doctor_procedures ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Users can view procedures from their clinic" 
ON public.doctor_procedures FOR SELECT 
USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE clinic_id = doctor_procedures.clinic_id
));

CREATE POLICY "Admins and Receptionists can manage procedures" 
ON public.doctor_procedures FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND clinic_id = doctor_procedures.clinic_id 
        AND (role = 'CLINIC_ADMIN' OR role = 'RECEPTIONIST' OR role = 'DOCTOR')
    )
);

-- Comentários
COMMENT ON TABLE public.doctor_procedures IS 'Tabela de procedimentos e pequenas cirurgias realizadas pelos médicos com seus respectivos valores base';
COMMENT ON COLUMN public.doctor_procedures.name IS 'Nome do procedimento ou cirurgia (ex: "Cantoplastia", "Sutura")';
COMMENT ON COLUMN public.doctor_procedures.value IS 'Valor base do procedimento';
