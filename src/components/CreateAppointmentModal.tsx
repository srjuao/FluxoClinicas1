import React, { useState, useEffect, useCallback, FormEvent } from "react";
import { motion } from "framer-motion";
import { X, Calendar, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import { validateCPF, formatCPF, cleanCPF } from "@/utils";
import type { Patient, DoctorWithProfileName } from "@/types/database.types";
import type {
  CreateAppointmentModalProps,
  PatientFormData,
} from "@/types/components.types";

const SEX_OPTIONS = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Feminino" },
  { value: "O", label: "Outro" },
];

const CIVIL_STATUS_OPTIONS = [
  { value: "solteiro", label: "Solteiro(a)" },
  { value: "casado", label: "Casado(a)" },
  { value: "divorciado", label: "Divorciado(a)" },
  { value: "viuvo", label: "Viúvo(a)" },
];

const CreateAppointmentModal: React.FC<CreateAppointmentModalProps> = ({
  clinicId,
  onClose,
  onSuccess,
}) => {
  const [doctors, setDoctors] = useState<DoctorWithProfileName[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedDoctor, setSelectedDoctor] =
    useState<DoctorWithProfileName | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [doctorSearch, setDoctorSearch] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [patientForm, setPatientForm] = useState<PatientFormData>({
    name: "",
    cpf: "",
    birth_date: "",
    sexo: "",
    telefone: "",
    estado_civil: "",
  });
  const [loading, setLoading] = useState(false);
  const [cpfError, setCpfError] = useState<string | null>(null);

  // Carrega médicos e pacientes
  const loadInitialData = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);

    const { data: doctorsData, error: doctorsError } = await supabase
      .from("doctors")
      .select("*, profile:profiles(name)")
      .eq("clinic_id", clinicId);

    if (doctorsError)
      toast({ title: "Erro ao buscar médicos", variant: "destructive" });
    else setDoctors((doctorsData as DoctorWithProfileName[]) || []);

    const { data: patientsData, error: patientsError } = await supabase
      .from("patients")
      .select("*")
      .eq("clinic_id", clinicId)
      .limit(50);

    if (patientsError)
      toast({ title: "Erro ao buscar pacientes", variant: "destructive" });
    else setPatients(patientsData || []);

    setLoading(false);
  }, [clinicId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Carrega horários disponíveis
  const loadAvailableSlots = useCallback(async () => {
    if (!selectedDoctor || !selectedDate) return;
    setLoading(true);

    const date = new Date(selectedDate + "T00:00:00");
    const weekday = date.getDay();

    const { data: workHours, error: whError } = await supabase
      .from("doctor_work_hours")
      .select("*")
      .eq("doctor_id", selectedDoctor.id)
      .eq("weekday", weekday);

    if (whError || !workHours || workHours.length === 0) {
      setAvailableSlots([]);
      setLoading(false);
      return;
    }

    const workHour = workHours[0];
    const slotMinutes = workHour.slot_minutes || 30;

    const { data: appointments, error: aptError } = await supabase
      .from("appointments")
      .select("scheduled_start")
      .eq("doctor_id", selectedDoctor.id)
      .gte("scheduled_start", `${selectedDate}T00:00:00Z`)
      .lte("scheduled_start", `${selectedDate}T23:59:59Z`);

    if (aptError) {
      toast({ title: "Erro ao buscar agendamentos", variant: "destructive" });
      setLoading(false);
      return;
    }

    const bookedSlots = new Set(
      appointments?.map((a: { scheduled_start: string }) =>
        new Date(a.scheduled_start).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      ) || []
    );

    const slots = [];
    const [startHour, startMin] = workHour.start_time.split(":").map(Number);
    const [endHour, endMin] = workHour.end_time.split(":").map(Number);

    let currentTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    while (currentTime < endTime) {
      const hour = Math.floor(currentTime / 60);
      const min = currentTime % 60;
      const timeStr = `${String(hour).padStart(2, "0")}:${String(min).padStart(
        2,
        "0"
      )}`;
      if (!bookedSlots.has(timeStr)) slots.push(timeStr);
      currentTime += slotMinutes;
    }

    setAvailableSlots(slots);
    setLoading(false);
  }, [selectedDoctor, selectedDate]);

  useEffect(() => {
    loadAvailableSlots();
  }, [loadAvailableSlots]);

  const filteredDoctors = doctors.filter((d) =>
    d.profile?.name.toLowerCase().includes(doctorSearch.toLowerCase())
  );

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
      (p.cpf && p.cpf.includes(patientSearch))
  );

  const handleEditPatient = (patient: Patient) => {
    setEditingPatient(patient);
    setPatientForm({
      name: patient.name || "",
      cpf: patient.cpf || "",
      birth_date: patient.birth_date || "",
      sexo: patient.sexo || "",
      telefone: patient.telefone || "",
      estado_civil: patient.estado_civil || "",
    });
    setShowPatientForm(true);
  };

  const handleSavePatient = async () => {
    if (!patientForm.cpf) {
      setCpfError("CPF é obrigatório");
      toast({ title: "CPF é obrigatório", variant: "destructive" });
      return;
    }

    if (!validateCPF(patientForm.cpf)) {
      setCpfError("CPF inválido");
      toast({
        title: "CPF inválido",
        description: "Por favor, insira um CPF válido",
        variant: "destructive",
      });
      return;
    }

    setCpfError(null);
    setLoading(true);

    const dataToSave = { ...patientForm, cpf: cleanCPF(patientForm.cpf) };

    if (editingPatient) {
      const { error, data } = await supabase
        .from("patients")
        .update(dataToSave)
        .eq("id", editingPatient.id)
        .select()
        .single();

      setLoading(false);
      if (error)
        toast({
          title: "Erro ao atualizar paciente",
          description: error.message,
          variant: "destructive",
        });
      else {
        setPatients((prev) => prev.map((p) => (p.id === data.id ? data : p)));
        setSelectedPatient(data);
        setEditingPatient(null);
        setShowPatientForm(false);
        toast({ title: "Paciente atualizado! ✅" });
      }
    } else {
      const { data, error } = await supabase
        .from("patients")
        .insert({ clinic_id: clinicId, ...dataToSave })
        .select()
        .single();

      setLoading(false);
      if (error)
        toast({
          title: "Erro ao cadastrar paciente",
          description: error.message,
          variant: "destructive",
        });
      else {
        setPatients((prev) => [...prev, data]);
        setSelectedPatient(data);
        setShowPatientForm(false);
        toast({ title: "Paciente cadastrado! ✅" });
      }
    }
  };

  const handleSubmitAppointment = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !selectedPatient || !selectedSlot) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setLoading(true);

    const { data: workHours, error: whError } = await supabase
      .from("doctor_work_hours")
      .select("slot_minutes")
      .eq("doctor_id", selectedDoctor.id);

    if (whError || !workHours || workHours.length === 0) {
      toast({
        title: "Horário do médico não encontrado",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const workHour = workHours[0];
    const slotMinutes = workHour.slot_minutes || 30;
    // Parse time slot for date construction
    const [,] = selectedSlot.split(":").map(Number);
    const startDate = new Date(`${selectedDate}T${selectedSlot}:00`);
    const endDate = new Date(startDate.getTime() + slotMinutes * 60000);

    const { error } = await supabase.from("appointments").insert({
      clinic_id: clinicId,
      doctor_id: selectedDoctor.id,
      patient_id: selectedPatient.id,
      scheduled_start: startDate.toISOString(),
      scheduled_end: endDate.toISOString(),
      status: "SCHEDULED",
    });

    setLoading(false);
    if (error)
      toast({
        title: "Erro ao criar agendamento",
        description: error.message,
        variant: "destructive",
      });
    else {
      toast({ title: "Agendamento criado com sucesso! 🎉" });
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-effect rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative"
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Novo Agendamento
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmitAppointment} className="space-y-6">
          {/* Médico com autocomplete */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Médico
            </label>
            <input
              type="text"
              placeholder="Digite o nome do médico"
              value={selectedDoctor?.profile?.name || doctorSearch}
              onChange={(e) => {
                setDoctorSearch(e.target.value);
                setSelectedDoctor(null);
              }}
              className="w-full px-4 py-2 rounded-lg border border-gray-200"
            />
            {doctorSearch && (
              <div className="absolute z-50 w-full max-h-48 overflow-y-auto border mt-1 rounded-lg bg-white shadow-lg">
                {filteredDoctors.map((d) => (
                  <div
                    key={d.id}
                    className="p-2 cursor-pointer hover:bg-purple-100"
                    onClick={() => {
                      setSelectedDoctor(d);
                      setDoctorSearch("");
                      setSelectedSlot(null);
                    }}
                  >
                    {d.profile?.name} - CRM: {d.crm}
                  </div>
                ))}
                {filteredDoctors.length === 0 && (
                  <p className="p-2 text-gray-500">Nenhum médico encontrado</p>
                )}
              </div>
            )}
          </div>

          {/* Data */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedSlot(null);
              }}
              className="w-full px-4 py-2 rounded-lg border border-gray-200"
              required
            />
          </div>

          {/* Horários */}
          {selectedDoctor && selectedDate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Horário Disponível
              </label>
              <div className="grid grid-cols-4 gap-2">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`p-2 rounded-lg text-sm font-medium transition-all ${
                      selectedSlot === slot
                        ? "gradient-primary text-white"
                        : "bg-white border"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
              {availableSlots.length === 0 && !loading && (
                <p className="text-center text-gray-500 py-4">
                  Nenhum horário disponível
                </p>
              )}
              {loading && (
                <p className="text-center text-gray-500 py-4">
                  Carregando horários...
                </p>
              )}
            </div>
          )}

          {/* Paciente com autocomplete */}
          {!selectedPatient ? (
            <div className="space-y-4 relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paciente
              </label>
              <input
                type="text"
                placeholder="Nome ou CPF"
                value={patientSearch}
                onChange={(e) => {
                  setPatientSearch(e.target.value);
                  setSelectedPatient(null);
                }}
                className="w-full px-4 py-2 rounded-lg border border-gray-200"
              />
              {patientSearch && (
                <div className="absolute z-50 w-full max-h-48 overflow-y-auto border mt-1 rounded-lg bg-white shadow-lg">
                  {filteredPatients.map((patient) => (
                    <div
                      key={patient.id}
                      className="p-2 cursor-pointer hover:bg-purple-100 flex justify-between items-center"
                      onClick={() => {
                        setSelectedPatient(patient);
                        setPatientSearch("");
                      }}
                    >
                      <div>
                        <p className="font-medium">{patient.name}</p>
                        <p className="text-sm text-gray-600">
                          CPF: {patient.cpf}
                        </p>
                      </div>
                      <Edit
                        className="cursor-pointer text-gray-400 hover:text-gray-600"
                        onClick={() => handleEditPatient(patient)}
                      />
                    </div>
                  ))}
                  {filteredPatients.length === 0 && (
                    <p className="p-2 text-gray-500 text-center">
                      Nenhum paciente encontrado
                    </p>
                  )}
                </div>
              )}

              {!showPatientForm && (
                <Button
                  type="button"
                  onClick={() => {
                    setPatientForm({
                      name: "",
                      cpf: "",
                      birth_date: "",
                      sexo: "",
                      telefone: "",
                      estado_civil: "",
                    });
                    setEditingPatient(null);
                    setShowPatientForm(true);
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Cadastrar Novo Paciente
                </Button>
              )}

              {showPatientForm && (
                <div className="glass-effect rounded-xl p-4 space-y-3 mt-2">
                  <h3 className="font-semibold">
                    {editingPatient ? "Editar Paciente" : "Novo Paciente"}
                  </h3>
                  <input
                    type="text"
                    placeholder="Nome completo"
                    value={patientForm.name}
                    onChange={(e) =>
                      setPatientForm({ ...patientForm, name: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border"
                  />
                  <input
                    type="text"
                    placeholder="CPF"
                    value={patientForm.cpf}
                    onChange={(e) => {
                      const formatted = formatCPF(e.target.value);
                      setPatientForm({ ...patientForm, cpf: formatted });
                      if (cpfError) setCpfError(null);
                    }}
                    maxLength={14}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      cpfError ? "border-red-500" : ""
                    }`}
                  />
                  {cpfError && (
                    <p className="text-xs text-red-500">{cpfError}</p>
                  )}
                  <input
                    type="date"
                    placeholder="Data de nascimento"
                    value={patientForm.birth_date}
                    onChange={(e) =>
                      setPatientForm({
                        ...patientForm,
                        birth_date: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border"
                  />
                  <select
                    value={patientForm.sexo}
                    onChange={(e) =>
                      setPatientForm({ ...patientForm, sexo: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border"
                  >
                    <option value="">Selecione o sexo</option>
                    {SEX_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Telefone"
                    value={patientForm.telefone}
                    onChange={(e) =>
                      setPatientForm({
                        ...patientForm,
                        telefone: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border"
                  />
                  <select
                    value={patientForm.estado_civil}
                    onChange={(e) =>
                      setPatientForm({
                        ...patientForm,
                        estado_civil: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border"
                  >
                    <option value="">Estado civil</option>
                    {CIVIL_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      disabled={loading}
                      onClick={() => setShowPatientForm(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      className="flex-1 gradient-primary text-white"
                      disabled={loading}
                      onClick={handleSavePatient}
                    >
                      {loading ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-effect rounded-xl p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{selectedPatient.name}</p>
                  <p className="text-sm text-gray-600">
                    CPF: {selectedPatient.cpf}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  variant="outline"
                  size="sm"
                >
                  Trocar
                </Button>
              </div>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 gradient-primary text-white"
              disabled={loading}
            >
              {loading ? "Criando..." : "Criar Agendamento"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default CreateAppointmentModal;
