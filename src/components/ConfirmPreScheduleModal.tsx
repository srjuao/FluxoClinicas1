import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { X, CheckCircle, User, Calendar, Clock, Phone, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import { formatCPF } from "@/utils";
import type { Patient } from "@/types/database";

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

interface ConfirmPreScheduleModalProps {
    clinicId: string;
    appointmentId: string;
    preScheduleName: string;
    preSchedulePhone: string;
    scheduledStart: string;
    doctorName: string;
    onClose: () => void;
    onSuccess: () => void;
}

interface PatientFormData {
    name: string;
    cpf: string;
    birth_date: string;
    sexo: string;
    telefone: string;
    estado_civil: string;
    endereco: string;
}

const ConfirmPreScheduleModal: React.FC<ConfirmPreScheduleModalProps> = ({
    clinicId,
    appointmentId,
    preScheduleName,
    preSchedulePhone,
    scheduledStart,
    doctorName,
    onClose,
    onSuccess,
}) => {
    const [mode, setMode] = useState<"search" | "create" | "select">("search");
    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [patientSearch, setPatientSearch] = useState(preScheduleName);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form para criar novo paciente
    const [formData, setFormData] = useState<PatientFormData>({
        name: preScheduleName,
        cpf: "",
        birth_date: "",
        sexo: "",
        telefone: preSchedulePhone,
        estado_civil: "",
        endereco: "",
    });

    // Carregar pacientes
    const loadPatients = useCallback(async () => {
        if (!clinicId) return;
        setLoading(true);

        const { data, error } = await supabase
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
            setPatients(data || []);
        }

        setLoading(false);
    }, [clinicId]);

    useEffect(() => {
        loadPatients();
    }, [loadPatients]);

    // Filtrar pacientes
    const filteredPatients = patients.filter(
        (p) =>
            p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
            (p.cpf && p.cpf.includes(patientSearch)) ||
            (p.telefone && p.telefone.includes(patientSearch))
    );

    // Criar novo paciente
    const handleCreatePatient = async () => {
        if (!formData.name.trim()) {
            toast({
                title: "Nome obrigatório",
                variant: "destructive",
            });
            return;
        }

        setSubmitting(true);

        try {
            const cleanedCPF = formData.cpf.replace(/\D/g, "");

            // Verificar CPF duplicado na mesma clínica
            if (cleanedCPF) {
                const { data: existingPatient, error: checkError } = await supabase
                    .from("patients")
                    .select("id, name")
                    .eq("clinic_id", clinicId)
                    .eq("cpf", cleanedCPF)
                    .maybeSingle();

                if (checkError) {
                    console.error("Erro ao verificar CPF:", checkError);
                }

                if (existingPatient) {
                    toast({
                        title: "CPF já cadastrado",
                        description: `Este CPF já pertence a ${existingPatient.name} nesta clínica`,
                        variant: "destructive",
                    });
                    setSubmitting(false);
                    return;
                }
            }

            const { data: newPatient, error } = await supabase
                .from("patients")
                .insert({
                    clinic_id: clinicId,
                    name: formData.name.trim(),
                    cpf: cleanedCPF || null,
                    birth_date: formData.birth_date || null,
                    sexo: formData.sexo || null,
                    telefone: formData.telefone || null,
                    estado_civil: formData.estado_civil || null,
                    endereco: formData.endereco || null,
                })
                .select()
                .single();

            if (error) throw error;

            setSelectedPatient(newPatient);
            setMode("select");
            toast({
                title: "Paciente cadastrado!",
                description: "Agora confirme o agendamento.",
            });
        } catch (error) {
            console.error("Erro ao criar paciente:", error);
            toast({
                title: "Erro ao cadastrar paciente",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    // Confirmar agendamento
    const handleConfirmAppointment = async () => {
        if (!selectedPatient) {
            toast({
                title: "Selecione ou cadastre um paciente",
                variant: "destructive",
            });
            return;
        }

        setSubmitting(true);

        try {
            const { error } = await supabase
                .from("appointments")
                .update({
                    patient_id: selectedPatient.id,
                    status: "SCHEDULED",
                    pre_schedule_name: null, // Limpar dados temporários
                    pre_schedule_phone: null,
                })
                .eq("id", appointmentId);

            if (error) throw error;

            toast({
                title: "Agendamento confirmado!",
                description: `Paciente ${selectedPatient.name} vinculado com sucesso.`,
            });

            onSuccess();
            onClose();
        } catch (error) {
            console.error("Erro ao confirmar agendamento:", error);
            toast({
                title: "Erro ao confirmar agendamento",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    // Formatar CPF
    const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, "");
        let formatted = value;
        if (value.length > 3) formatted = `${value.slice(0, 3)}.${value.slice(3)}`;
        if (value.length > 6) formatted = `${formatted.slice(0, 7)}.${value.slice(6)}`;
        if (value.length > 9) formatted = `${formatted.slice(0, 11)}-${value.slice(9, 11)}`;
        setFormData({ ...formData, cpf: formatted.slice(0, 14) });
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
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                Confirmar Pré-Agendamento
                            </h2>
                            <p className="text-sm text-gray-500">
                                Complete o cadastro do paciente
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

                {/* Pre-Schedule Info */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-semibold text-amber-800 mb-2">
                        Dados do Pré-Agendamento
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-amber-600" />
                            <span className="text-amber-800 font-medium">{preScheduleName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-amber-600" />
                            <span className="text-amber-800">{preSchedulePhone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-amber-600" />
                            <span className="text-amber-800">
                                {new Date(scheduledStart).toLocaleDateString("pt-BR")}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-600" />
                            <span className="text-amber-800">
                                {new Date(scheduledStart).toLocaleTimeString("pt-BR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </span>
                        </div>
                    </div>
                    {doctorName && (
                        <p className="text-sm text-amber-700 mt-2">
                            Médico: Dr(a). {doctorName}
                        </p>
                    )}
                </div>

                {/* Mode Tabs */}
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => setMode("search")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === "search"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                    >
                        <Search className="w-4 h-4 inline mr-1" />
                        Buscar Paciente
                    </button>
                    <button
                        onClick={() => setMode("create")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === "create"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                    >
                        <Plus className="w-4 h-4 inline mr-1" />
                        Novo Paciente
                    </button>
                </div>

                {/* Search Mode */}
                {mode === "search" && (
                    <div className="space-y-4">
                        <div>
                            <input
                                type="text"
                                placeholder="Buscar por nome, CPF ou telefone..."
                                value={patientSearch}
                                onChange={(e) => setPatientSearch(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                        </div>

                        {loading ? (
                            <div className="text-center py-8 text-gray-500">
                                Carregando pacientes...
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {filteredPatients.length === 0 ? (
                                    <div className="text-center py-6">
                                        <p className="text-gray-500 mb-2">Nenhum paciente encontrado</p>
                                        <Button
                                            variant="outline"
                                            onClick={() => setMode("create")}
                                            className="text-purple-600"
                                        >
                                            <Plus className="w-4 h-4 mr-1" />
                                            Cadastrar novo paciente
                                        </Button>
                                    </div>
                                ) : (
                                    filteredPatients.map((patient) => (
                                        <button
                                            key={patient.id}
                                            onClick={() => {
                                                setSelectedPatient(patient);
                                                setMode("select");
                                            }}
                                            className={`w-full p-3 rounded-lg border-2 text-left transition-all ${selectedPatient?.id === patient.id
                                                ? "border-green-500 bg-green-50"
                                                : "border-gray-200 hover:border-purple-300"
                                                }`}
                                        >
                                            <p className="font-medium text-gray-900">{patient.name}</p>
                                            <div className="flex gap-4 text-sm text-gray-600 mt-1">
                                                {patient.cpf && <span>CPF: {formatCPF(patient.cpf)}</span>}
                                                {patient.telefone && <span>Tel: {patient.telefone}</span>}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Create Mode */}
                {mode === "create" && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nome Completo *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    CPF
                                </label>
                                <input
                                    type="text"
                                    value={formData.cpf}
                                    onChange={handleCPFChange}
                                    placeholder="000.000.000-00"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Data de Nascimento
                                </label>
                                <input
                                    type="date"
                                    value={formData.birth_date}
                                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Sexo
                                </label>
                                <select
                                    value={formData.sexo}
                                    onChange={(e) => setFormData({ ...formData, sexo: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                                >
                                    <option value="">Selecione...</option>
                                    {SEX_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Estado Civil
                                </label>
                                <select
                                    value={formData.estado_civil}
                                    onChange={(e) => setFormData({ ...formData, estado_civil: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                                >
                                    <option value="">Selecione...</option>
                                    {CIVIL_STATUS_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Telefone
                                </label>
                                <input
                                    type="tel"
                                    value={formData.telefone}
                                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                                    placeholder="(00) 00000-0000"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Endereço
                                </label>
                                <input
                                    type="text"
                                    value={formData.endereco}
                                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                                    placeholder="Rua, número, bairro, cidade..."
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setMode("search")}
                                className="flex-1"
                            >
                                Voltar
                            </Button>
                            <Button
                                onClick={handleCreatePatient}
                                className="flex-1 gradient-primary text-white"
                                disabled={!formData.name.trim() || submitting}
                            >
                                {submitting ? "Cadastrando..." : "Cadastrar Paciente"}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Select Mode (after selecting or creating patient) */}
                {mode === "select" && selectedPatient && (
                    <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-green-800 mb-2">
                                Paciente Selecionado
                            </h4>
                            <p className="font-medium text-gray-900">{selectedPatient.name}</p>
                            <div className="flex gap-4 text-sm text-gray-600 mt-1">
                                {selectedPatient.cpf && (
                                    <span>CPF: {formatCPF(selectedPatient.cpf)}</span>
                                )}
                                {selectedPatient.telefone && (
                                    <span>Tel: {selectedPatient.telefone}</span>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSelectedPatient(null);
                                    setMode("search");
                                }}
                                className="flex-1"
                            >
                                Alterar Paciente
                            </Button>
                            <Button
                                onClick={handleConfirmAppointment}
                                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                                disabled={submitting}
                            >
                                {submitting ? "Confirmando..." : "Confirmar Agendamento"}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Footer for search mode */}
                {mode === "search" && selectedPatient && (
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
                            onClick={handleConfirmAppointment}
                            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                            disabled={submitting}
                        >
                            {submitting ? "Confirmando..." : "Confirmar Agendamento"}
                        </Button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default ConfirmPreScheduleModal;
