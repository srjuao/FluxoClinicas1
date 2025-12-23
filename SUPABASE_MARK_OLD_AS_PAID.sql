-- ============================================
-- MARCAR PAGAMENTOS ANTIGOS COMO PAGOS VIA PIX
-- Execute este script no Supabase SQL Editor
-- ============================================

-- Marcar consultas particulares antes de 23/12/2023 como pagas via PIX
UPDATE appointments
SET 
    payment_status = 'PAID',
    payment_method = 'PIX',
    paid_at = scheduled_start -- Data do pagamento = data da consulta
WHERE 
    is_insurance = false
    AND status = 'COMPLETED'
    AND payment_status != 'PAID'
    AND scheduled_start < '2025-12-23 00:00:00';

-- Verificar quantos registros foram atualizados
SELECT COUNT(*) as registros_atualizados
FROM appointments
WHERE 
    is_insurance = false
    AND payment_status = 'PAID'
    AND payment_method = 'PIX'
    AND paid_at IS NOT NULL
    AND scheduled_start < '2025-12-23 00:00:00';
