import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Calendar, Clock, Phone, User, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";

interface PreScheduleModalProps {
    clinicId: string;
    doctorId: string;
    selectedDate: string;
    selectedTime: string;
    slotMinutes: number;
    onClose: () => void;
    onSuccess: () => void;
}

const PreScheduleModal: React.FC<PreScheduleModalProps> = ({
    clinicId,
    doctorId,
    selectedDate,
    selectedTime,
    slotMinutes,
    onClose,
    onSuccess,
}) => {
    const [patientName, setPatientName] = useState("");
    const [patientPhone, setPatientPhone] = useState("");
    const [reason, setReason] = useState("consulta");
    const [submitting, setSubmitting] = useState(false);
    const [doctorName, setDoctorName] = useState("");

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

        setSubmitting(true);

        try {
            const startDate = new Date(`${selectedDate}T${selectedTime}:00`);
            const endDate = new Date(startDate.getTime() + slotMinutes * 60000);

            const reasonText =
                reason === "consulta"
                    ? "Consulta"
                    : reason === "retorno"
                        ? "Retorno"
                        : reason === "exame"
                            ? "Exame"
                            : "Consulta";

            const { error } = await supabase.from("appointments").insert({
                clinic_id: clinicId,
                doctor_id: doctorId,
                patient_id: null, // Sem paciente cadastrado ainda
                scheduled_start: startDate.toISOString(),
                scheduled_end: endDate.toISOString(),
                status: "PRE_SCHEDULED", // Status especial para pré-agendamento
                reason: reasonText,
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
                                {new Date(selectedDate).toLocaleDateString("pt-BR")}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-700">{selectedTime}</span>
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
                            Motivo
                        </label>
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                        >
                            <option value="consulta">Consulta</option>
                            <option value="retorno">Retorno</option>
                            <option value="exame">Exame</option>
                        </select>
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
                        disabled={!patientName.trim() || !patientPhone.trim() || submitting}
                    >
                        {submitting ? "Salvando..." : "Criar Pré-Agendamento"}
                    </Button>
                </div>
            </motion.div>
        </div>
    );
};

export default PreScheduleModal;
