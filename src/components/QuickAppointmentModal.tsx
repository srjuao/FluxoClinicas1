import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { X, Calendar, Clock, User, CreditCard, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import { formatCPF } from "@/utils";
import type { Patient } from "@/types/database";
import type { InsurancePlan, DoctorPricing, ClinicCommission } from "@/types/database.types";

// Lista de tipos de exame de ultrassom
const EXAM_TYPES = [
  "Abdome total",
  "Abdome superior",
  "Rins",
  "Pélvico feminino",
  "Próstata",
  "Parede abdominal",
  "Região inguinal (cada lado)",
  "Partes moles",
  "Carótidas e vertebrais",
  "Bolsa escrotal",
  "Bolsa escrotal com Doppler",
  "Tireoide",
  "Tireoide com Doppler",
  "Cervical",
  "Cervical com Doppler",
  "Mamas",
  "Axilas (partes moles)",
  "Obstétrico simples",
  "Morfológico (21ª a 24ª semana)",
  "Obstétrico com Doppler (26ª a 38ª semanas)",
  "Obstétrico + TN",
  "Obstétrico + PBF",
  "Obstétrico simples gemelar",
  "Endovaginal",
  "Ombro / cotovelo",
  "Joelho / tornozelo",
  "Mamas + axilas",
  "Morfológico com Doppler e TN",
  "Pênis",
  "Abdome com Doppler",
  "Obstétrico com medida do colo",
  "Obstétrico + Doppler + TN",
  "Perianal",
  "Obstétrico + Doppler + PBF",
];

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
  const [selectedExamType, setSelectedExamType] = useState("");
  const [examTypeSearch, setExamTypeSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Estados para exames do médico
  const [doctorExamTypes, setDoctorExamTypes] = useState<string[]>([]);
  // Estados para médicos de ultrassom
  const [ultrasoundDoctors, setUltrasoundDoctors] = useState<Array<{ id: string; name: string; crm: string }>>([]);
  const [selectedUltrasoundDoctor, setSelectedUltrasoundDoctor] = useState<string | null>(null);
  const [currentDoctorHasUltrasound, setCurrentDoctorHasUltrasound] = useState(false);

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

  // Carrega pacientes iniciais (recentes)
  const loadPatients = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);

    const { data: patientsData, error } = await supabase
      .from("patients")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false })
      .limit(30);

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

  // Busca dinâmica de pacientes no banco de dados
  const searchPatientsInDatabase = useCallback(async (searchValue: string) => {
    if (!clinicId) return;

    if (!searchValue || searchValue.length < 2) {
      loadPatients();
      setSearchingPatients(false);
      return;
    }

    setSearchingPatients(true);

    const cleanedSearch = searchValue.replace(/\D/g, "");
    const isSearchingByCPF = cleanedSearch.length >= 3;

    let query = supabase
      .from("patients")
      .select("*")
      .eq("clinic_id", clinicId);

    if (isSearchingByCPF && cleanedSearch.length >= 3) {
      query = query.or(`cpf.ilike.%${cleanedSearch}%,name.ilike.%${searchValue}%`);
    } else {
      query = query.ilike("name", `%${searchValue}%`);
    }

    const { data, error } = await query.order("name").limit(100);

    if (error) {
      console.error("Erro ao buscar pacientes:", error);
    } else {
      setPatients(data || []);
    }

    setSearchingPatients(false);
  }, [clinicId, loadPatients]);

  // Debounce da busca
  const handlePatientSearchChange = useCallback((value: string) => {
    setPatientSearch(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchPatientsInDatabase(value);
    }, 300);
  }, [searchPatientsInDatabase]);

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

  // Carregar exames configurados para o médico
  const loadDoctorExams = useCallback(async () => {
    if (!clinicId || !doctorId) return;

    try {
      const { data, error } = await supabase
        .from("doctor_exams")
        .select("exam_name")
        .eq("clinic_id", clinicId)
        .eq("doctor_id", doctorId);

      if (error) throw error;

      if (data && data.length > 0) {
        setDoctorExamTypes(data.map((d: { exam_name: string }) => d.exam_name));
      } else {
        // Fallback: se não tem configuração, usar todos os exames
        setDoctorExamTypes([]);
      }
    } catch (error) {
      console.error("Erro ao carregar exames do médico:", error);
      setDoctorExamTypes([]);
    }
  }, [clinicId, doctorId]);

  useEffect(() => {
    loadDoctorExams();
  }, [loadDoctorExams]);

  // Carregar médicos habilitados para ultrassom
  const loadUltrasoundDoctors = useCallback(async () => {
    if (!clinicId) return;

    try {
      // Verificar se o médico atual tem permissão
      const { data: currentDoctor } = await supabase
        .from("doctors")
        .select("does_ultrasound_exams")
        .eq("id", doctorId)
        .single();

      setCurrentDoctorHasUltrasound(currentDoctor?.does_ultrasound_exams || false);

      // Buscar todos os médicos com permissão de ultrassom
      const { data: doctors, error } = await supabase
        .from("doctors")
        .select("id, crm, profile:profiles(name)")
        .eq("clinic_id", clinicId)
        .eq("does_ultrasound_exams", true);

      if (error) throw error;

      const formattedDoctors = (doctors || []).map((d: any) => ({
        id: d.id,
        name: d.profile?.name || "Sem nome",
        crm: d.crm
      }));

      setUltrasoundDoctors(formattedDoctors);

      // Se o médico atual tem permissão, pré-seleciona ele
      if (currentDoctor?.does_ultrasound_exams) {
        setSelectedUltrasoundDoctor(doctorId);
      } else if (formattedDoctors.length > 0) {
        // Senão, seleciona o primeiro da lista
        setSelectedUltrasoundDoctor(formattedDoctors[0].id);
      }
    } catch (error) {
      console.error("Erro ao carregar médicos de ultrassom:", error);
    }
  }, [clinicId, doctorId]);

  useEffect(() => {
    loadUltrasoundDoctors();
  }, [loadUltrasoundDoctors]);

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


  // Filtrar tipos de exame - usa exames do médico se configurado, senão todos
  const availableExamTypes = doctorExamTypes.length > 0 ? doctorExamTypes : EXAM_TYPES;
  const filteredExamTypes = useMemo(() => {
    if (!examTypeSearch) return availableExamTypes;
    return availableExamTypes.filter((type) =>
      type.toLowerCase().includes(examTypeSearch.toLowerCase())
    );
  }, [examTypeSearch, availableExamTypes]);

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
      const [year, month, day] = selectedDate.split("-").map(Number);
      const [hours, minutes] = selectedTime.split(":").map(Number);

      // Create date using local time constructor to avoid timezone issues
      const startDate = new Date(year, month - 1, day, hours, minutes);
      const endDate = new Date(startDate.getTime() + slotMinutes * 60000);

      const targetDoctorId = reason === "exame" && selectedUltrasoundDoctor ? selectedUltrasoundDoctor : doctorId;

      // Verificação final no banco de dados para evitar duplicidade
      const { data: existingAppmt, error: checkError } = await supabase
        .from("appointments")
        .select("id")
        .eq("doctor_id", targetDoctorId)
        .eq("scheduled_start", startDate.toISOString())
        .neq("status", "CANCELLED")
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingAppmt) {
        toast({
          title: "Horário já ocupado",
          description: "Este horário acabou de ser preenchido por outro agendamento. Por favor, escolha outro horário ou verifique a disponibilidade.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      // Convert reason value to text
      let reasonText =
        reason === "consulta"
          ? "Consulta"
          : reason === "retorno"
            ? "Retorno"
            : reason === "exame"
              ? "Exame"
              : null;

      // Se for exame, adicionar o tipo de exame ao motivo
      if (reason === "exame" && selectedExamType) {
        reasonText = `Exame: ${selectedExamType}`;
      }

      const { error } = await supabase.from("appointments").insert({
        clinic_id: clinicId,
        doctor_id: targetDoctorId,
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
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar por nome ou CPF..."
                  value={patientSearch}
                  onChange={(e) => handlePatientSearchChange(e.target.value)}
                  className="w-full px-4 py-2 pr-10 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                {searchingPatients && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-500 animate-spin" />
                )}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo da Consulta
              </label>
              <select
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (e.target.value !== "exame") {
                    setSelectedExamType("");
                    setExamTypeSearch("");
                  }
                }}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
              >
                <option value="">Selecione o motivo...</option>
                <option value="consulta">Consulta</option>
                <option value="retorno">Retorno</option>
                <option value="exame">Exame</option>
              </select>
            </div>

            {/* Exam Type Selector - aparece quando motivo é Exame */}
            {reason === "exame" && (
              <div className="space-y-4">
                {/* Seleção de Médico de Ultrassom */}
                {ultrasoundDoctors.length === 0 ? (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 font-medium">
                      ⚠️ Nenhum médico habilitado para exames
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">
                      Configure a permissão "Realiza Exames de Ultrassom" no cadastro do médico.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🔬 Médico Responsável pelo Exame
                    </label>
                    {!currentDoctorHasUltrasound && (
                      <p className="text-xs text-amber-600 mb-2">
                        O médico selecionado não realiza exames. Escolha um médico habilitado:
                      </p>
                    )}
                    <select
                      value={selectedUltrasoundDoctor || ""}
                      onChange={(e) => setSelectedUltrasoundDoctor(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                    >
                      {ultrasoundDoctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.name} - CRM: {doctor.crm}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Tipo de Exame */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Exame
                  </label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar tipo de exame..."
                      value={examTypeSearch}
                      onChange={(e) => setExamTypeSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                    {filteredExamTypes.length === 0 ? (
                      <p className="text-center text-gray-500 py-3 text-sm">
                        Nenhum exame encontrado
                      </p>
                    ) : (
                      filteredExamTypes.map((examType) => (
                        <button
                          key={examType}
                          type="button"
                          onClick={() => {
                            setSelectedExamType(examType);
                            setExamTypeSearch("");
                          }}
                          className={`w-full px-4 py-2 text-left text-sm hover:bg-purple-50 transition-colors ${selectedExamType === examType
                            ? "bg-purple-100 text-purple-700 font-medium"
                            : "text-gray-700"
                            }`}
                        >
                          {examType}
                        </button>
                      ))
                    )}
                  </div>
                  {selectedExamType && (
                    <p className="mt-2 text-sm text-purple-600 font-medium">
                      Selecionado: {selectedExamType}
                    </p>
                  )}
                </div>
              </div>
            )}

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
            {loading || searchingPatients ? (
              <div className="text-center py-8 text-gray-500">
                Carregando pacientes...
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {patients.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">
                    Nenhum paciente encontrado
                  </p>
                ) : (
                  patients.map((patient) => (
                    <button
                      key={patient.id}
                      onClick={() => setSelectedPatient(patient)}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${selectedPatient?.id === patient.id
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
            disabled={!selectedPatient || !reason || (reason === "exame" && (!selectedExamType || !selectedUltrasoundDoctor || ultrasoundDoctors.length === 0)) || submitting}
          >
            {submitting ? "Agendando..." : "Confirmar Agendamento"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default QuickAppointmentModal;
