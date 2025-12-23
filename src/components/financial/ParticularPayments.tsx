import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
    CreditCard,
    Search,
    Filter,
    CheckCircle,
    Clock,
    DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/customSupabaseClient";
import { toast } from "@/components/ui/use-toast";
import { formatCPF } from "@/utils";
import { PAYMENT_METHODS, PAYMENT_STATUS_LABELS, type PaymentStatus } from "@/types/financial.types";

interface ParticularPaymentsProps {
    clinicId: string;
}

interface AppointmentWithPatient {
    id: string;
    scheduled_start: string;
    final_value: number | null;
    payment_method: string | null;
    payment_status: string | null;
    paid_at: string | null;
    installments: number | null;
    patient: { name: string; cpf: string | null } | null;
    doctor: { profile: { name: string } } | null;
}

const ParticularPayments: React.FC<ParticularPaymentsProps> = ({ clinicId }) => {
    const [loading, setLoading] = useState(true);
    const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [editingPayment, setEditingPayment] = useState<string | null>(null);
    const [paymentForm, setPaymentForm] = useState({
        method: "PIX",
        installments: 1,
    });

    const loadData = useCallback(async () => {
        if (!clinicId) return;
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from("appointments")
                .select(`
          id,
          scheduled_start,
          final_value,
          payment_method,
          payment_status,
          paid_at,
          installments,
          patient:patients(name, cpf),
          doctor:doctors(profile:profiles(name))
        `)
                .eq("clinic_id", clinicId)
                .eq("is_insurance", false)
                .eq("status", "COMPLETED")
                .order("scheduled_start", { ascending: false })
                .limit(100);

            if (error) throw error;
            setAppointments((data as unknown as AppointmentWithPatient[]) || []);
        } catch (error) {
            console.error("Error loading particular payments:", error);
            toast({
                title: "Erro ao carregar pagamentos",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [clinicId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleMarkAsPaid = async (appointmentId: string) => {
        try {
            const { error } = await supabase
                .from("appointments")
                .update({
                    payment_status: "PAID",
                    payment_method: paymentForm.method,
                    installments: paymentForm.installments,
                    paid_at: new Date().toISOString(),
                })
                .eq("id", appointmentId);

            if (error) throw error;

            toast({ title: "Pagamento registrado com sucesso!" });
            setEditingPayment(null);
            loadData();
        } catch (error) {
            toast({
                title: "Erro ao registrar pagamento",
                variant: "destructive",
            });
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value);
    };

    const filteredAppointments = appointments.filter((apt) => {
        const matchesSearch =
            !searchTerm ||
            apt.patient?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            apt.patient?.cpf?.includes(searchTerm);

        const matchesStatus =
            statusFilter === "all" || apt.payment_status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Estatísticas
    const totalReceived = appointments
        .filter((apt) => apt.payment_status === "PAID")
        .reduce((sum, apt) => sum + (apt.final_value || 0), 0);

    const totalPending = appointments
        .filter((apt) => apt.payment_status !== "PAID")
        .reduce((sum, apt) => sum + (apt.final_value || 0), 0);

    if (loading) {
        return (
            <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="glass-effect rounded-xl p-4 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                        <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Cards Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-effect rounded-xl p-5"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Recebido</p>
                            <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(totalReceived)}
                            </p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-effect rounded-xl p-5"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-yellow-500 flex items-center justify-center">
                            <Clock className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Pendente</p>
                            <p className="text-2xl font-bold text-yellow-600">
                                {formatCurrency(totalPending)}
                            </p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-effect rounded-xl p-5"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center">
                            <DollarSign className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total</p>
                            <p className="text-2xl font-bold text-purple-600">
                                {formatCurrency(totalReceived + totalPending)}
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar por paciente ou CPF..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="text-gray-400 w-5 h-5" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                        <option value="all">Todos os status</option>
                        <option value="PENDING">Pendente</option>
                        <option value="PAID">Pago</option>
                        <option value="OVERDUE">Atrasado</option>
                    </select>
                </div>
            </div>

            {/* Lista de Pagamentos */}
            <div className="space-y-3">
                {filteredAppointments.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        Nenhum pagamento particular encontrado
                    </div>
                ) : (
                    filteredAppointments.map((apt) => {
                        const status = (apt.payment_status || "PENDING") as PaymentStatus;
                        const statusInfo = PAYMENT_STATUS_LABELS[status] || PAYMENT_STATUS_LABELS.PENDING;
                        const isEditing = editingPayment === apt.id;

                        return (
                            <motion.div
                                key={apt.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-effect rounded-xl p-4"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="font-semibold text-gray-900">
                                                {apt.patient?.name || "Paciente"}
                                            </h4>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                                                {statusInfo.label}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                            <span>
                                                {new Date(apt.scheduled_start).toLocaleDateString("pt-BR")}
                                            </span>
                                            {apt.patient?.cpf && (
                                                <span>CPF: {formatCPF(apt.patient.cpf)}</span>
                                            )}
                                            <span>Dr(a). {apt.doctor?.profile?.name || "Médico"}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-xl font-bold text-purple-600">
                                                {formatCurrency(apt.final_value || 0)}
                                            </p>
                                            {apt.payment_method && (
                                                <p className="text-xs text-gray-500">
                                                    {PAYMENT_METHODS.find((m) => m.value === apt.payment_method)?.label}
                                                    {apt.installments && apt.installments > 1 && ` (${apt.installments}x)`}
                                                </p>
                                            )}
                                        </div>

                                        {status !== "PAID" && !isEditing && (
                                            <Button
                                                onClick={() => setEditingPayment(apt.id)}
                                                size="sm"
                                                className="gradient-primary text-white"
                                            >
                                                <CreditCard className="w-4 h-4 mr-1" />
                                                Receber
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Formulário de Pagamento */}
                                {isEditing && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        className="mt-4 pt-4 border-t border-gray-200"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Forma de Pagamento
                                                </label>
                                                <select
                                                    value={paymentForm.method}
                                                    onChange={(e) =>
                                                        setPaymentForm({ ...paymentForm, method: e.target.value })
                                                    }
                                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500"
                                                >
                                                    {PAYMENT_METHODS.filter((m) => m.value !== "INSURANCE").map((m) => (
                                                        <option key={m.value} value={m.value}>
                                                            {m.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {paymentForm.method === "CREDIT_CARD" && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Parcelas
                                                    </label>
                                                    <select
                                                        value={paymentForm.installments}
                                                        onChange={(e) =>
                                                            setPaymentForm({
                                                                ...paymentForm,
                                                                installments: parseInt(e.target.value),
                                                            })
                                                        }
                                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500"
                                                    >
                                                        {[1, 2, 3, 4, 5, 6, 10, 12].map((n) => (
                                                            <option key={n} value={n}>
                                                                {n}x {n === 1 ? "à vista" : ""}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            <div className="flex items-end gap-2">
                                                <Button
                                                    onClick={() => handleMarkAsPaid(apt.id)}
                                                    className="flex-1 gradient-primary text-white"
                                                >
                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                    Confirmar
                                                </Button>
                                                <Button
                                                    onClick={() => setEditingPayment(null)}
                                                    variant="outline"
                                                >
                                                    Cancelar
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ParticularPayments;
