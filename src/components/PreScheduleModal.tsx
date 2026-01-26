import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Calendar, Clock, Phone, User, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import type { DoctorWorkHours } from "@/types/database";

interface PreScheduleModalProps {
    clinicId: string;
    doctorId: string;
    selectedDate: string;
    selectedTime: string;
    slotMinutes: number;
    onClose: () => void;
    onSuccess: () => void;
}

const PreScheduleModal = ({
    clinicId,
    doctorId,
    selectedDate,
    selectedTime,
    slotMinutes,
    onClose,
    onSuccess,
}: PreScheduleModalProps) => {
    const [patientName, setPatientName] = useState("");
    const [patientPhone, setPatientPhone] = useState("");
    const [reason, setReason] = useState("Consulta");
    const [submitting, setSubmitting] = useState(false);
    const [doctorName, setDoctorName] = useState("");
    const [currentTime, setCurrentTime] = useState(selectedTime);
    const [availableSlots, setAvailableSlots] = useState<{ time: string; available: boolean }[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);

    // Carregar nome do médico
    const loadDoctorName = useCallback(async () => {
        if (!doctorId) return;

        try {
            const { data, error } = await supabase
                .from("doctors")
                .select("profile:profiles(name)")
                .eq("id", doctorId)
                .single();

            if (error) throw error;
            setDoctorName((data as any)?.profile?.name || "Médico");
        } catch (error) {
            console.error("Erro ao carregar nome do médico:", error);
        }
    }, [doctorId]);

    useEffect(() => {
        loadDoctorName();
    }, [loadDoctorName]);

    // Carregar slots disponíveis
    const loadAvailableSlots = useCallback(async () => {
        if (!doctorId || !selectedDate) return;
        setLoadingSlots(true);

        try {
            // 1. Buscar horários de trabalho
            const { data: workHours } = await supabase
                .from("doctor_work_hours")
                .select("*")
                .eq("doctor_id", doctorId);

            if (!workHours || workHours.length === 0) {
                setAvailableSlots([]);
                return;
            }

            // Usar Date object para pegar o dia da semana corretamente (evitando shift de timezone)
            const [year, month, day] = selectedDate.split("-").map(Number);
            const dateObj = new Date(year, month - 1, day, 12, 0, 0); // Meio dia para evitar bordas de data
            const dayOfWeek = dateObj.getDay();
            const dateStr = selectedDate;

            const workHour = workHours.find((wh: DoctorWorkHours) => wh.specific_date === dateStr) ||
                workHours.find((wh: DoctorWorkHours) => wh.weekday === dayOfWeek && (!wh.specific_date || wh.specific_date === ""));

            if (!workHour) {
                setAvailableSlots([]);
                return;
            }

            // 2. Buscar agendamentos do dia
            const { data: appmts } = await supabase
                .from("appointments")
                .select("scheduled_start")
                .eq("doctor_id", doctorId)
                .gte("scheduled_start", dateStr)
                .lte("scheduled_start", `${dateStr}T23:59:59`)
                .neq("status", "CANCELLED");

            // No frontend, o scheduled_start que vem do Supabase (timestamptz) será convertido para o Date local
            const bookedTimes = appmts?.map((a: { scheduled_start: string }) =>
                new Date(a.scheduled_start).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
            ) || [];

            // 3. Gerar slots
            const slots = [];
            const [startH, startM] = workHour.start_time.split(":").map(Number);
            const [endH, endM] = workHour.end_time.split(":").map(Number);
            const slotMin = workHour.slot_minutes || 30;

            let current = new Date(2000, 0, 1, startH, startM);
            const end = new Date(2000, 0, 1, endH, endM);

            while (current < end) {
                const timeStr = current.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

                // Verificar se está no horário de almoço
                let isLunch = false;
                if (workHour.lunch_start && workHour.lunch_end) {
                    const [lsh, lsm] = workHour.lunch_start.split(":").map(Number);
                    const [leh, lem] = workHour.lunch_end.split(":").map(Number);
                    const lStart = new Date(2000, 0, 1, lsh, lsm);
                    const lEnd = new Date(2000, 0, 1, leh, lem);
                    if (current >= lStart && current < lEnd) isLunch = true;
                }

                if (!isLunch) {
                    const isBooked = bookedTimes.includes(timeStr);
                    slots.push({
                        time: timeStr,
                        available: !isBooked || timeStr === selectedTime
                    });
                }
                current = new Date(current.getTime() + slotMin * 60000);
            }
            setAvailableSlots(slots);
        } catch (error) {
            console.error("Erro ao carregar slots:", error);
        } finally {
            setLoadingSlots(false);
        }
    }, [doctorId, selectedDate, selectedTime]);

    useEffect(() => {
        loadAvailableSlots();
    }, [loadAvailableSlots]);

    // Formatar telefone
    const formatPhone = (value: string) => {
        const digits = value.replace(/\D/g, "");
        if (digits.length <= 2) return digits;
        if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
        if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPatientPhone(formatPhone(e.target.value));
    };

    const handleSubmit = async () => {
        if (!patientName.trim()) {
            toast({
                title: "Nome obrigatório",
                description: "Informe o nome do paciente",
                variant: "destructive",
            });
            return;
        }

        if (!patientPhone.trim()) {
            toast({
                title: "Telefone obrigatório",
                description: "Informe o telefone do paciente para contato",
                variant: "destructive",
            });
            return;
        }

        // Validar se o horário selecionado ainda está disponível
        const isSelectedTimeAvailable = availableSlots.find((s: { time: string; available: boolean }) => s.time === currentTime)?.available;
        if (!isSelectedTimeAvailable) {
            toast({
                title: "Horário indisponível",
                description: "O horário selecionado não está mais disponível ou é inválido.",
                variant: "destructive",
            });
            return;
        }

        setSubmitting(true);

        try {
            // Parse date parts to avoid timezone issues
            const [year, month, day] = selectedDate.split('-').map(Number);
            const [hours, minutes] = currentTime.split(':').map(Number);

            // Create dates using local timezone components
            const startDate = new Date(year, month - 1, day, hours, minutes, 0);
            const endDate = new Date(startDate.getTime() + slotMinutes * 60000);

            const { error } = await supabase.from("appointments").insert({
                clinic_id: clinicId,
                doctor_id: doctorId,
                patient_id: null,
                scheduled_start: startDate.toISOString(),
                scheduled_end: endDate.toISOString(),
                status: "PRE_SCHEDULED",
                reason: reason.trim() || "Consulta",
                pre_schedule_name: patientName.trim(),
                pre_schedule_phone: patientPhone.trim(),
            });

            if (error) throw error;

            toast({
                title: "Pré-agendamento criado!",
                description: "Quando o paciente chegar, confirme o agendamento e complete o cadastro.",
            });

            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error creating pre-schedule:", error);
            toast({
                title: "Erro ao criar pré-agendamento",
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
                className="glass-effect rounded-2xl p-6 w-full max-w-md relative"
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
                            <Phone className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                Pré-Agendamento
                            </h2>
                            <p className="text-sm text-gray-500">Agendamento por telefone</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Info Banner */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                        <p className="font-medium">Cadastro simplificado</p>
                        <p className="text-amber-700">
                            Complete o cadastro do paciente quando ele chegar na clínica.
                        </p>
                    </div>
                </div>

                {/* Appointment Info */}
                <div className="bg-gray-50 rounded-lg p-3 mb-6">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-700">
                                {/* Parse date manually to avoid UTC timezone shift */}
                                {(() => {
                                    const [year, month, day] = selectedDate.split('-').map(Number);
                                    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
                                })()}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-700">{currentTime}</span>
                        </div>
                    </div>
                    {doctorName && (
                        <div className="flex items-center gap-2 mt-2 text-sm">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-700">Dr(a). {doctorName}</span>
                        </div>
                    )}
                </div>

                {/* Form */}
                <div className="space-y-4">
                    {/* Patient Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nome do Paciente *
                        </label>
                        <input
                            type="text"
                            value={patientName}
                            onChange={(e) => setPatientName(e.target.value)}
                            placeholder="Digite o nome do paciente"
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            autoFocus
                        />
                    </div>

                    {/* Patient Phone */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Telefone *
                        </label>
                        <input
                            type="tel"
                            value={patientPhone}
                            onChange={handlePhoneChange}
                            placeholder="(00) 00000-0000"
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Motivo / Tipo de Exame *
                        </label>
                        <div className="space-y-2">
                            <input
                                type="text"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Ex: Consulta, Retorno, Exame: Vista..."
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setReason("Consulta")}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${reason === "Consulta"
                                        ? "bg-amber-500 text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                >
                                    Consulta
                                </button>
                                <button
                                    onClick={() => setReason("Retorno")}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${reason === "Retorno"
                                        ? "bg-amber-500 text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                >
                                    Retorno
                                </button>
                                <button
                                    onClick={() => setReason("Exame: ")}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${reason.startsWith("Exame")
                                        ? "bg-amber-500 text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                >
                                    Exame
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Time Slot Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Escolher Horário *
                        </label>
                        {loadingSlots ? (
                            <div className="text-xs text-gray-500 py-2">Carregando horários...</div>
                        ) : availableSlots.length > 0 ? (
                            <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
                                {availableSlots
                                    .filter(slot => slot.available)
                                    .map((slot: { time: string; available: boolean }) => (
                                        <button
                                            key={slot.time}
                                            onClick={() => slot.available && setCurrentTime(slot.time)}
                                            disabled={!slot.available}
                                            className={`py-2 text-xs font-medium rounded-md transition-all ${currentTime === slot.time
                                                ? "bg-amber-500 text-white shadow-md scale-105"
                                                : slot.available
                                                    ? "bg-white border border-gray-200 text-gray-700 hover:border-amber-300 hover:bg-amber-50"
                                                    : "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                                                }`}
                                        >
                                            {slot.time}
                                        </button>
                                    ))}
                            </div>
                        ) : (
                            <div className="text-xs text-red-500 py-2">Médico não atende nesta data.</div>
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
                        className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                        disabled={
                            !patientName.trim() ||
                            !patientPhone.trim() ||
                            submitting ||
                            !availableSlots.find((s: { time: string; available: boolean }) => s.time === currentTime)?.available
                        }
                    >
                        {submitting ? "Salvando..." : "Criar Pré-Agendamento"}
                    </Button>
                </div>
            </motion.div>
        </div>
    );
};

export default PreScheduleModal;
