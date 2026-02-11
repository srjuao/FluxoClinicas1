// ============================================
// TIPOS DO SISTEMA FINANCEIRO PREMIUM
// ============================================

// Status types
export type GuideStatus = 'DRAFT' | 'SENT' | 'ANALYZING' | 'APPROVED' | 'PAID' | 'DENIED' | 'PARTIALLY_DENIED';
export type DenialStatus = 'PENDING' | 'APPEALING' | 'RECOVERED' | 'PARTIALLY_RECOVERED' | 'LOST';
export type PaymentRuleType = 'PERCENTAGE' | 'FIXED' | 'PER_PROCEDURE';
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELED';
export type ExpenseCategory = 'MEDICAL_STAFF' | 'RECEPTION' | 'RENT' | 'EQUIPMENT' | 'MATERIALS' | 'MARKETING' | 'SYSTEMS' | 'UTILITIES' | 'OTHER';
export type ExpenseType = 'ADMINISTRATIVE' | 'ASSISTENTIAL';
export type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH' | 'BANK_SLIP' | 'INSURANCE';
export type Recurrence = 'ONCE' | 'MONTHLY' | 'YEARLY';

// ============================================
// GUIAS DE CONVÊNIO
// ============================================
export interface InsuranceGuide {
  id: string;
  clinic_id: string;
  insurance_plan_id: string;
  patient_id: string;
  doctor_id?: string | null;
  appointment_id?: string | null;
  guide_number: string;
  lot_number?: string | null;
  authorization_number?: string | null;
  procedure_code?: string | null;
  procedure_name?: string | null;
  presented_value: number;
  approved_value?: number | null;
  status: GuideStatus;
  service_date: string;
  sent_at?: string | null;
  expected_payment_date?: string | null;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InsuranceGuideWithRelations extends InsuranceGuide {
  insurance_plan?: { name: string };
  patient?: { name: string };
  doctor?: { profile: { name: string } };
}

// ============================================
// GLOSAS
// ============================================
export interface InsuranceDenial {
  id: string;
  clinic_id: string;
  guide_id: string;
  insurance_plan_id: string;
  procedure_code?: string | null;
  denial_reason: string;
  denial_code?: string | null;
  denied_value: number;
  recovered_value: number;
  status: DenialStatus;
  denied_at: string;
  appealed_at?: string | null;
  resolved_at?: string | null;
  appeal_notes?: string | null;
  resolution_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InsuranceDenialWithRelations extends InsuranceDenial {
  insurance_plan?: { name: string };
  guide?: InsuranceGuide;
}

// ============================================
// REGRAS DE REPASSE MÉDICO
// ============================================
export interface DoctorPaymentRule {
  id: string;
  clinic_id: string;
  doctor_id: string;
  payment_type: PaymentRuleType;
  default_percentage: number;
  default_fixed_value: number;
  insurance_plan_id?: string | null;
  procedure_code?: string | null;
  custom_value?: number | null;
  custom_type?: 'FIXED_VALUE' | 'CUSTOM_PERCENTAGE' | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DoctorPaymentRuleWithRelations extends DoctorPaymentRule {
  doctor?: { profile: { name: string }; crm: string };
  insurance_plan?: { name: string };
}

// ============================================
// TRANSAÇÕES DE REPASSE
// ============================================
export interface DoctorPayment {
  id: string;
  clinic_id: string;
  doctor_id: string;
  period_start: string;
  period_end: string;
  total_produced: number;
  total_clinic_commission: number;
  total_due: number;
  total_paid: number;
  total_particular: number;
  total_insurance: number;
  total_appointments: number;
  status: PaymentStatus;
  paid_at?: string | null;
  payment_method?: string | null;
  payment_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DoctorPaymentWithRelations extends DoctorPayment {
  doctor?: { profile: { name: string }; crm: string };
}

// ============================================
// DESPESAS
// ============================================
export interface Expense {
  id: string;
  clinic_id: string;
  category: ExpenseCategory;
  expense_type: ExpenseType;
  description: string;
  supplier?: string | null;
  amount: number;
  due_date: string;
  paid_at?: string | null;
  status: PaymentStatus;
  recurrence: Recurrence;
  payment_method?: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// ESTATÍSTICAS DE CONVÊNIO
// ============================================
export interface InsurancePaymentStats {
  id: string;
  clinic_id: string;
  insurance_plan_id: string;
  avg_days_to_payment: number;
  total_guides: number;
  total_paid_guides: number;
  total_denied_guides: number;
  total_presented: number;
  total_approved: number;
  total_denied: number;
  total_recovered: number;
  approval_rate: number;
  denial_rate: number;
  recovery_rate: number;
  period_month?: number | null;
  period_year?: number | null;
  updated_at: string;
}

export interface InsurancePaymentStatsWithRelations extends InsurancePaymentStats {
  insurance_plan?: { name: string };
}

// ============================================
// DASHBOARD STATS
// ============================================
export interface FinancialOverviewStats {
  grossRevenue: number;
  insuranceBilled: number;
  insuranceReceivable: number;
  totalDenials: number;
  particularReceived: number;
  operationalProfit: number;
  doctorCosts: number;
  totalExpenses: number;
  // Comparativos
  revenueGrowth: number;
  insuranceGrowth: number;
  particularGrowth: number;
}

export interface InsuranceAvgPaymentTime {
  insuranceName: string;
  avgDays: number;
  totalGuides: number;
}

// ============================================
// PROCEDIMENTOS / CIRURGIAS
// ============================================
export interface DoctorProcedure {
  id: string;
  clinic_id: string;
  doctor_id: string;
  name: string;
  value: number;
  created_at: string;
}

// ============================================
// CONSTANTES
// ============================================
export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'MEDICAL_STAFF', label: 'Folha Médica' },
  { value: 'RECEPTION', label: 'Recepcionistas' },
  { value: 'RENT', label: 'Aluguel' },
  { value: 'EQUIPMENT', label: 'Equipamentos' },
  { value: 'MATERIALS', label: 'Materiais Médicos' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'SYSTEMS', label: 'Sistemas' },
  { value: 'UTILITIES', label: 'Contas (Água, Luz, etc)' },
  { value: 'OTHER', label: 'Outros' },
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'PIX', label: 'PIX' },
  { value: 'CREDIT_CARD', label: 'Cartão de Crédito' },
  { value: 'DEBIT_CARD', label: 'Cartão de Débito' },
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'BANK_SLIP', label: 'Boleto' },
  { value: 'INSURANCE', label: 'Convênio' },
];

export const GUIDE_STATUS_LABELS: { [key in GuideStatus]: { label: string; color: string } } = {
  DRAFT: { label: 'Rascunho', color: 'bg-gray-100 text-gray-700' },
  SENT: { label: 'Enviado', color: 'bg-blue-100 text-blue-700' },
  ANALYZING: { label: 'Em Análise', color: 'bg-yellow-100 text-yellow-700' },
  APPROVED: { label: 'Aprovado', color: 'bg-green-100 text-green-700' },
  PAID: { label: 'Pago', color: 'bg-emerald-100 text-emerald-700' },
  DENIED: { label: 'Glosado', color: 'bg-red-100 text-red-700' },
  PARTIALLY_DENIED: { label: 'Glosado Parcial', color: 'bg-orange-100 text-orange-700' },
};

export const DENIAL_STATUS_LABELS: { [key in DenialStatus]: { label: string; color: string } } = {
  PENDING: { label: 'Pendente', color: 'bg-gray-100 text-gray-700' },
  APPEALING: { label: 'Em Recurso', color: 'bg-yellow-100 text-yellow-700' },
  RECOVERED: { label: 'Recuperada', color: 'bg-green-100 text-green-700' },
  PARTIALLY_RECOVERED: { label: 'Parcialmente Recuperada', color: 'bg-blue-100 text-blue-700' },
  LOST: { label: 'Perdida', color: 'bg-red-100 text-red-700' },
};

export const PAYMENT_STATUS_LABELS: { [key in PaymentStatus]: { label: string; color: string } } = {
  PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
  PARTIAL: { label: 'Parcial', color: 'bg-blue-100 text-blue-700' },
  PAID: { label: 'Pago', color: 'bg-green-100 text-green-700' },
  OVERDUE: { label: 'Atrasado', color: 'bg-red-100 text-red-700' },
  CANCELED: { label: 'Cancelado', color: 'bg-gray-100 text-gray-700' },
};
