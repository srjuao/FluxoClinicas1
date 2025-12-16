import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Calendar, Clock, User, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import { formatCPF } from "@/utils";
import type { Patient } from "@/types/database";
import type { InsurancePlan, DoctorPricing, ClinicCommission } from "@/types/database.types";

interface QuickAppointmentModalProps {
  clinicId: string;
  doctorId: string;
  selectedDate: string;
  selectedTime: string;
  slotMinutes: number;
  onClose: () => void;
  onSuccess: () => void;
}

const QuickAppointmentModal: React.FC<QuickAppointmentModalProps> = ({
  clinicId,
  doctorId,
  selectedDate,
  selectedTime,
  slotMinutes,
  onClose,
  onSuccess,
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Estados para convênio
  const [isInsurance, setIsInsurance] = useState(false);
  const [insurancePlans, setInsurancePlans] = useState<InsurancePlan[]>([]);
  const [selectedInsurancePlan, setSelectedInsurancePlan] = useState<string>("");
  
  // Estados para valores financeiros
  const [consultationValue, setConsultationValue] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [finalValue, setFinalValue] = useState<number>(0);
  const [clinicCommissionPercentage, setClinicCommissionPercentage] = useState<number>(0);
  const [clinicCommissionAmount, setClinicCommissionAmount] = useState<number>(0);
  const [doctorAmount, setDoctorAmount] = useState<number>(0);

  const loadPatients = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);

    const { data: patientsData, error } = await supabase
      .from("patients")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("name");

    if (error) {
      toast({
        title: "Erro ao buscar pacientes",
        variant: "destructive",
      });
    } else {
      setPatients(patientsData || []);
    }

    setLoading(false);
  }, [clinicId]);

  const loadFinancialData = useCallback(async () => {
    if (!clinicId || !doctorId) return;

    try {
      // Carregar convênios ativos
      const { data: insuranceData, error: insuranceError } = await supabase
        .from("insurance_plans")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("is_active", true)
        .order("name");

      if (insuranceError) throw insuranceError;
      setInsurancePlans(insuranceData || []);

      // Carregar valor da consulta do médico
      const { data: pricingData, error: pricingError } = await supabase
        .from("doctor_pricing")
        .select("consultation_value")
        .eq("doctor_id", doctorId)
        .eq("clinic_id", clinicId)
        .single();

      if (pricingError && pricingError.code !== "PGRST116") {
        // PGRST116 = no rows returned, que é ok se não tiver preço definido
        throw pricingError;
      }

      const value = pricingData?.consultation_value || 0;
      setConsultationValue(value);

      // Carregar comissão da clínica
      const { data: commissionData, error: commissionError } = await supabase
        .from("clinic_commission")
        .select("commission_percentage")
        .eq("doctor_id", doctorId)
        .eq("clinic_id", clinicId)
        .single();

      if (commissionError && commissionError.code !== "PGRST116") {
        throw commissionError;
      }

      const percentage = commissionData?.commission_percentage || 0;
      setClinicCommissionPercentage(percentage);
    } catch (error) {
      console.error("Erro ao carregar dados financeiros:", error);
      // Não mostrar erro para o usuário, apenas usar valores padrão
    }
  }, [clinicId, doctorId]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData]);

  // Calcular valores quando mudar convênio ou valor da consulta
  useEffect(() => {
    if (consultationValue <= 0) {
      setFinalValue(0);
      setDiscountAmount(0);
      setClinicCommissionAmount(0);
      setDoctorAmount(0);
      return;
    }

    let discount = 0;
    if (isInsurance && selectedInsurancePlan) {
      const plan = insurancePlans.find((p) => p.id === selectedInsurancePlan);
      if (plan) {
        discount = (consultationValue * plan.discount_percentage) / 100;
      }
    }

    const final = consultationValue - discount;
    const clinicCommission = (final * clinicCommissionPercentage) / 100;
    const doctor = final - clinicCommission;

    setDiscountAmount(discount);
    setFinalValue(final);
    setClinicCommissionAmount(clinicCommission);
    setDoctorAmount(doctor);
  }, [
    consultationValue,
    isInsurance,
    selectedInsurancePlan,
    insurancePlans,
    clinicCommissionPercentage,
  ]);

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
      (p.cpf && p.cpf.includes(patientSearch))
  );

  const handleSubmit = async () => {
    if (!selectedPatient) {
      toast({
        title: "Selecione um paciente",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const startDate = new Date(`${selectedDate}T${selectedTime}:00`);
      const endDate = new Date(startDate.getTime() + slotMinutes * 60000);

      // Convert reason value to text
      const reasonText =
        reason === "consulta"
          ? "Consulta"
          : reason === "retorno"
          ? "Retorno"
          : reason === "exame"
          ? "Exame"
          : null;

      const { error } = await supabase.from("appointments").insert({
        clinic_id: clinicId,
        doctor_id: doctorId,
        patient_id: selectedPatient.id,
        scheduled_start: startDate.toISOString(),
        scheduled_end: endDate.toISOString(),
        status: "SCHEDULED",
        reason: reasonText,
        is_insurance: isInsurance,
        insurance_plan_id: isInsurance && selectedInsurancePlan ? selectedInsurancePlan : null,
        consultation_value: consultationValue > 0 ? consultationValue : null,
        discount_amount: discountAmount > 0 ? discountAmount : null,
        final_value: finalValue > 0 ? finalValue : null,
        clinic_commission_percentage: clinicCommissionPercentage > 0 ? clinicCommissionPercentage : null,
        clinic_commission_amount: clinicCommissionAmount > 0 ? clinicCommissionAmount : null,
        doctor_amount: doctorAmount > 0 ? doctorAmount : null,
      });

      if (error) throw error;

      toast({
        title: "Agendamento criado com sucesso!",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating appointment:", error);
      toast({
        title: "Erro ao criar agendamento",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-effect rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Novo Agendamento
              </h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {new Date(selectedDate).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{selectedTime}</span>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <div className="space-y-4">
            {/* Patient Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Paciente
              </label>
              <input
                type="text"
                placeholder="Buscar por nome ou CPF..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo da Consulta
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
              >
                <option value="">Selecione o motivo...</option>
                <option value="consulta">Consulta</option>
                <option value="retorno">Retorno</option>
                <option value="exame">Exame</option>
              </select>
            </div>

            {/* Tipo de Pagamento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CreditCard className="w-4 h-4 inline mr-1" />
                Tipo de Pagamento
              </label>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentType"
                      checked={!isInsurance}
                      onChange={() => {
                        setIsInsurance(false);
                        setSelectedInsurancePlan("");
                      }}
                      className="w-4 h-4 text-purple-600"
                    />
                    <span className="text-gray-700">Particular</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentType"
                      checked={isInsurance}
                      onChange={() => setIsInsurance(true)}
                      className="w-4 h-4 text-purple-600"
                    />
                    <span className="text-gray-700">Convênio</span>
                  </label>
                </div>

                {isInsurance && (
                  <div>
                    <select
                      value={selectedInsurancePlan}
                      onChange={(e) => setSelectedInsurancePlan(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    >
                      <option value="">Selecione o convênio...</option>
                      {insurancePlans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} ({plan.discount_percentage.toFixed(2)}% desconto)
                        </option>
                      ))}
                    </select>
                    {insurancePlans.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Nenhum convênio cadastrado. Configure no módulo Financeiro.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Resumo Financeiro (se houver valores configurados) */}
            {consultationValue > 0 && (
              <div className="glass-effect rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-gray-900 text-sm mb-2">
                  Resumo Financeiro
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Valor da Consulta:</span>
                    <span className="font-medium">R$ {consultationValue.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Desconto:</span>
                      <span className="font-medium">- R$ {discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-200 pt-1">
                    <span className="text-gray-900 font-semibold">Valor Final:</span>
                    <span className="text-purple-600 font-bold">R$ {finalValue.toFixed(2)}</span>
                  </div>
                  {clinicCommissionPercentage > 0 && (
                    <>
                      <div className="flex justify-between text-xs text-gray-500 pt-1">
                        <span>Clínica ({clinicCommissionPercentage.toFixed(2)}%):</span>
                        <span>R$ {clinicCommissionAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Médico:</span>
                        <span>R$ {doctorAmount.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Patient List */}
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                Carregando pacientes...
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredPatients.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">
                    Nenhum paciente encontrado
                  </p>
                ) : (
                  filteredPatients.map((patient) => (
                    <button
                      key={patient.id}
                      onClick={() => setSelectedPatient(patient)}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                        selectedPatient?.id === patient.id
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-purple-300"
                      }`}
                    >
                      <p className="font-medium text-gray-900">
                        {patient.name}
                      </p>
                      {patient.cpf && (
                        <p className="text-sm text-gray-600">
                          CPF: {formatCPF(patient.cpf)}
                        </p>
                      )}
                      {patient.telefone && (
                        <p className="text-sm text-gray-600">
                          Tel: {patient.telefone}
                        </p>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 gradient-primary text-white"
            disabled={!selectedPatient || !reason || submitting}
          >
            {submitting ? "Agendando..." : "Confirmar Agendamento"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default QuickAppointmentModal;
