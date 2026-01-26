import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { X, Calendar, Clock, User, Trash2, Edit2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import type {
  AppointmentWithPatientName,
  DoctorWorkHours,
} from "@/types/database";

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

interface EditAppointmentModalProps {
  appointment: AppointmentWithPatientName;
  onClose: () => void;
  onSuccess: () => void;
}

const EditAppointmentModal: React.FC<EditAppointmentModalProps> = ({
  appointment,
  onClose,
  onSuccess,
}) => {
  const [status, setStatus] = useState(appointment.status);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingDateTime, setEditingDateTime] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date(appointment.scheduled_start).toISOString().split("T")[0]
  );
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Convert reason text back to value for select and extract exam type if present
  const getReasonValue = (reasonText?: string) => {
    if (reasonText === "Primeira Consulta" || reasonText === "Consulta") return "primeira_consulta";
    if (reasonText === "Retorno") return "retorno";
    if (reasonText === "Exame" || reasonText?.startsWith("Exame:")) return "exame";
    return "";
  };

  const getExamTypeFromReason = (reasonText?: string) => {
    if (reasonText?.startsWith("Exame: ")) {
      return reasonText.replace("Exame: ", "");
    }
    return "";
  };

  const [reason, setReason] = useState(getReasonValue(appointment.reason));
  const [selectedExamType, setSelectedExamType] = useState(getExamTypeFromReason(appointment.reason));
  const [examTypeSearch, setExamTypeSearch] = useState("");
  // Estados para exames do médico
  const [doctorExamTypes, setDoctorExamTypes] = useState<string[]>([]);

  // Carregar exames configurados para o médico
  const loadDoctorExams = useCallback(async () => {
    if (!appointment.clinic_id || !appointment.doctor_id) return;

    try {
      const { data, error } = await supabase
        .from("doctor_exams")
        .select("exam_name")
        .eq("clinic_id", appointment.clinic_id)
        .eq("doctor_id", appointment.doctor_id);

      if (error) throw error;

      if (data && data.length > 0) {
        setDoctorExamTypes(data.map((d: { exam_name: string }) => d.exam_name));
      } else {
        setDoctorExamTypes([]);
      }
    } catch (error) {
      console.error("Erro ao carregar exames do médico:", error);
      setDoctorExamTypes([]);
    }
  }, [appointment.clinic_id, appointment.doctor_id]);

  useEffect(() => {
    loadDoctorExams();
  }, [loadDoctorExams]);

  // Load available slots when editing date/time
  const loadAvailableSlots = useCallback(async () => {
    if (!editingDateTime || !selectedDate) return;

    setLoading(true);

    try {
      // Get work hours for the doctor
      const { data: workHours, error: whError } = await supabase
        .from("doctor_work_hours")
        .select("*")
        .eq("doctor_id", appointment.doctor_id)
        .eq("clinic_id", appointment.clinic_id);

      if (whError || !workHours || workHours.length === 0) {
        setAvailableSlots([]);
        setLoading(false);
        return;
      }

      // Find work hour for selected date
      const selectedDateObj = new Date(selectedDate);
      const dayOfWeek = selectedDateObj.getDay();
      const workHour = (workHours as DoctorWorkHours[]).find(
        (wh) =>
          wh.specific_date === selectedDate ||
          (wh.weekday === dayOfWeek && !wh.specific_date)
      );

      if (!workHour) {
        setAvailableSlots([]);
        setLoading(false);
        return;
      }

      const slotMinutes = workHour.slot_minutes || 30;

      // Get existing appointments for the date
      const { data: appointments, error: aptError } = await supabase
        .from("appointments")
        .select("scheduled_start")
        .eq("doctor_id", appointment.doctor_id)
        .gte("scheduled_start", `${selectedDate}T00:00:00Z`)
        .lte("scheduled_start", `${selectedDate}T23:59:59Z`)
        .neq("id", appointment.id); // Exclude current appointment

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

      // Generate time slots
      const slots = [];
      const [startHour, startMin] = workHour.start_time.split(":").map(Number);
      const [endHour, endMin] = workHour.end_time.split(":").map(Number);

      let currentTimeInMinutes = startHour * 60 + startMin;
      const endTimeInMinutes = endHour * 60 + endMin;

      // Handle lunch break
      let lunchStart = null;
      let lunchEnd = null;
      if (workHour.lunch_start && workHour.lunch_end) {
        const [lunchStartHour, lunchStartMin] = workHour.lunch_start
          .split(":")
          .map(Number);
        const [lunchEndHour, lunchEndMin] = workHour.lunch_end
          .split(":")
          .map(Number);
        lunchStart = lunchStartHour * 60 + lunchStartMin;
        lunchEnd = lunchEndHour * 60 + lunchEndMin;
      }

      while (currentTimeInMinutes < endTimeInMinutes) {
        // Skip lunch break
        if (
          lunchStart !== null &&
          lunchEnd !== null &&
          currentTimeInMinutes >= lunchStart &&
          currentTimeInMinutes < lunchEnd
        ) {
          currentTimeInMinutes += slotMinutes;
          continue;
        }

        const hour = Math.floor(currentTimeInMinutes / 60);
        const min = currentTimeInMinutes % 60;
        const timeStr = `${String(hour).padStart(2, "0")}:${String(
          min
        ).padStart(2, "0")}`;

        if (!bookedSlots.has(timeStr)) {
          slots.push(timeStr);
        }

        currentTimeInMinutes += slotMinutes;
      }

      setAvailableSlots(slots);
    } catch (error) {
      console.error("Error loading slots:", error);
      toast({
        title: "Erro ao carregar horários",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [editingDateTime, selectedDate, appointment]);

  // Filtrar tipos de exame - usa exames do médico se configurado, senão todos
  const availableExamTypes = doctorExamTypes.length > 0 ? doctorExamTypes : EXAM_TYPES;
  const filteredExamTypes = useMemo(() => {
    if (!examTypeSearch) return availableExamTypes;
    return availableExamTypes.filter((type) =>
      type.toLowerCase().includes(examTypeSearch.toLowerCase())
    );
  }, [examTypeSearch, availableExamTypes]);

  useEffect(() => {
    if (editingDateTime) {
      loadAvailableSlots();
    }
  }, [editingDateTime, selectedDate, loadAvailableSlots]);

  const handleUpdate = async () => {
    setSubmitting(true);

    try {
      // Convert reason value to text
      let reasonText =
        reason === "primeira_consulta"
          ? "Primeira Consulta"
          : reason === "retorno"
            ? "Retorno"
            : reason === "exame"
              ? "Exame"
              : null;

      // Se for exame, adicionar o tipo de exame ao motivo
      if (reason === "exame" && selectedExamType) {
        reasonText = `Exame: ${selectedExamType}`;
      }

      const updates: any = { status, reason: reasonText };

      // If editing date/time, update scheduled times
      if (editingDateTime && selectedSlot) {
        const [hour, minute] = selectedSlot.split(":").map(Number);
        // Parse date correctly to avoid timezone issues
        const [year, month, day] = selectedDate.split("-").map(Number);
        const startDate = new Date(year, month - 1, day, hour, minute, 0, 0);

        // Get slot duration from work hours
        const { data: workHours } = await supabase
          .from("doctor_work_hours")
          .select("slot_minutes")
          .eq("doctor_id", appointment.doctor_id)
          .limit(1)
          .single();

        const slotMinutes = (workHours as any)?.slot_minutes || 30;
        const endDate = new Date(startDate.getTime() + slotMinutes * 60000);

        updates.scheduled_start = startDate.toISOString();
        updates.scheduled_end = endDate.toISOString();
      }

      const { error } = await supabase
        .from("appointments")
        .update(updates)
        .eq("id", appointment.id);

      if (error) throw error;

      toast({
        title: "Agendamento atualizado com sucesso!",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error updating appointment:", error);
      toast({
        title: "Erro ao atualizar agendamento",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja cancelar este agendamento?")) {
      return;
    }

    setDeleting(true);

    try {
      const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", appointment.id);

      if (error) throw error;

      toast({
        title: "Agendamento cancelado com sucesso!",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error deleting appointment:", error);
      toast({
        title: "Erro ao cancelar agendamento",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const appointmentDate = new Date(appointment.scheduled_start);

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
                Editar Agendamento
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                ID: {appointment.id.slice(0, 8)}...
              </p>
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
          {/* Patient Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">Paciente</p>
                <p className="font-medium text-gray-900">
                  {appointment.patient?.name || "Não informado"}
                </p>
              </div>
            </div>
          </div>

          {/* Date and Time Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Data e Horário
              </label>
              <button
                onClick={() => {
                  setEditingDateTime(!editingDateTime);
                  if (!editingDateTime) {
                    setSelectedSlot(null);
                  }
                }}
                className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                {editingDateTime ? "Cancelar edição" : "Editar data/horário"}
              </button>
            </div>

            {!editingDateTime ? (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Data</p>
                    <p className="font-medium text-gray-900">
                      {appointmentDate.toLocaleDateString("pt-BR", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Horário</p>
                    <p className="font-medium text-gray-900">
                      {appointmentDate.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Date Picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nova Data
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setSelectedSlot(null);
                    }}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                {/* Available Slots */}
                {loading ? (
                  <div className="text-center py-4 text-gray-500">
                    Carregando horários disponíveis...
                  </div>
                ) : availableSlots.length > 0 ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Novo Horário
                    </label>
                    <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => setSelectedSlot(slot)}
                          className={`p-2 rounded-lg border-2 text-sm font-medium transition-all ${selectedSlot === slot
                            ? "border-purple-500 bg-purple-50 text-purple-700"
                            : "border-gray-200 hover:border-purple-300 text-gray-700"
                            }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Nenhum horário disponível para esta data
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Reason Selection */}
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
              <option value="primeira_consulta">Primeira Consulta</option>
              <option value="retorno">Retorno</option>
              <option value="exame">Exame</option>
            </select>
          </div>

          {/* Exam Type Selector - aparece quando motivo é Exame */}
          {reason === "exame" && (
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
          )}

          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status do Agendamento
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="SCHEDULED">Agendado</option>
              <option value="COMPLETED">Concluído</option>
              <option value="CANCELED">Cancelado</option>
            </select>
          </div>

          {/* Footer */}
          <div className="space-y-3 mt-6 pt-6 border-t border-gray-200">
            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
                disabled={submitting || deleting}
              >
                Fechar
              </Button>
              <Button
                onClick={handleUpdate}
                className="flex-1 gradient-primary text-white"
                disabled={
                  submitting ||
                  deleting ||
                  (status === appointment.status && !editingDateTime) ||
                  (editingDateTime && !selectedSlot)
                }
              >
                {submitting ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>

            <Button
              onClick={handleDelete}
              variant="outline"
              className="w-full text-red-600 border-red-300 hover:bg-red-50"
              disabled={submitting || deleting}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {deleting ? "Cancelando..." : "Cancelar Agendamento"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default EditAppointmentModal;
