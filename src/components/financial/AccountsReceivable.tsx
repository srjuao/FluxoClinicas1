import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
    Clock,
    Search,
    Filter,
    AlertCircle,
    CheckCircle,
    Building2,
    User,
    Calendar,
} from "lucide-react";
import { supabase } from "@/lib/customSupabaseClient";
import { toast } from "@/components/ui/use-toast";

interface AccountsReceivableProps {
    clinicId: string;
}

interface ReceivableItem {
    id: string;
    type: "insurance" | "particular";
    source_name: string;
    patient_name: string;
    doctor_name: string;
    value: number;
    due_date: string | null;
    status: "overdue" | "upcoming" | "paid";
    days_until_due: number;
}

const AccountsReceivable: React.FC<AccountsReceivableProps> = ({ clinicId }) => {
    const [loading, setLoading] = useState(true);
    const [receivables, setReceivables] = useState<ReceivableItem[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [insurancePlans, setInsurancePlans] = useState<{ id: string; name: string }[]>([]);
    const [insuranceFilter, setInsuranceFilter] = useState<string>("all");

    const loadData = useCallback(async () => {
        if (!clinicId) return;
        setLoading(true);

        try {
            const today = new Date();
            const items: ReceivableItem[] = [];

            // Carregar guias de convênio pendentes
            const { data: guides } = await supabase
                .from("insurance_guides")
                .select(`
          id,
          insurance_plan:insurance_plans(name),
          patient:patients(name),
          doctor:doctors(profile:profiles(name)),
          presented_value,
          expected_payment_date,
          status
        `)
                .eq("clinic_id", clinicId)
                .in("status", ["SENT", "ANALYZING", "APPROVED"]);

            (guides || []).forEach((guide: any) => {
                const dueDate = guide.expected_payment_date ? new Date(guide.expected_payment_date) : null;
                const daysUntilDue = dueDate
                    ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    : 999;

                let status: "overdue" | "upcoming" | "paid" = "upcoming";
                if (daysUntilDue < 0) status = "overdue";
                else if (daysUntilDue <= 7) status = "upcoming";

                items.push({
                    id: guide.id,
                    type: "insurance",
                    source_name: guide.insurance_plan?.name || "Convênio",
                    patient_name: guide.patient?.name || "Paciente",
                    doctor_name: guide.doctor?.profile?.name || "Médico",
                    value: guide.presented_value,
                    due_date: guide.expected_payment_date,
                    status,
                    days_until_due: daysUntilDue,
                });
            });

            // Carregar pagamentos particulares pendentes
            const { data: appointments } = await supabase
                .from("appointments")
                .select(`
          id,
          patient:patients(name),
          doctor:doctors(profile:profiles(name)),
          final_value,
          scheduled_start,
          payment_status
        `)
                .eq("clinic_id", clinicId)
                .eq("is_insurance", false)
                .eq("status", "COMPLETED")
                .neq("payment_status", "PAID");

            (appointments || []).forEach((apt: any) => {
                const dueDate = new Date(apt.scheduled_start);
                const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                let status: "overdue" | "upcoming" | "paid" = "upcoming";
                if (daysUntilDue < 0) status = "overdue";

                items.push({
                    id: apt.id,
                    type: "particular",
                    source_name: "Particular",
                    patient_name: apt.patient?.name || "Paciente",
                    doctor_name: apt.doctor?.profile?.name || "Médico",
                    value: apt.final_value || 0,
                    due_date: apt.scheduled_start,
                    status,
                    days_until_due: daysUntilDue,
                });
            });

            // Ordenar por urgência
            items.sort((a, b) => a.days_until_due - b.days_until_due);
            setReceivables(items);

            // Carregar convênios para filtro
            const { data: plans } = await supabase
                .from("insurance_plans")
                .select("id, name")
                .eq("clinic_id", clinicId);

            setInsurancePlans(plans || []);
        } catch (error) {
            console.error("Error loading receivables:", error);
            toast({
                title: "Erro ao carregar contas a receber",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [clinicId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value);
    };

    const filteredReceivables = receivables.filter((item) => {
        const matchesSearch =
            !searchTerm ||
            item.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.source_name.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "all" || item.status === statusFilter;
        const matchesType = typeFilter === "all" || item.type === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
    });

    // Estatísticas
    const totalOverdue = receivables
        .filter((r) => r.status === "overdue")
        .reduce((sum, r) => sum + r.value, 0);
    const totalUpcoming = receivables
        .filter((r) => r.status === "upcoming")
        .reduce((sum, r) => sum + r.value, 0);
    const totalReceivable = receivables.reduce((sum, r) => sum + r.value, 0);

    const overdueCount = receivables.filter((r) => r.status === "overdue").length;
    const upcomingCount = receivables.filter((r) => r.status === "upcoming").length;

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
                    className="glass-effect rounded-xl p-5 border-l-4 border-red-500"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center">
                            <AlertCircle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Atrasados ({overdueCount})</p>
                            <p className="text-2xl font-bold text-red-600">
                                {formatCurrency(totalOverdue)}
                            </p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-effect rounded-xl p-5 border-l-4 border-yellow-500"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-yellow-500 flex items-center justify-center">
                            <Clock className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">A Vencer ({upcomingCount})</p>
                            <p className="text-2xl font-bold text-yellow-600">
                                {formatCurrency(totalUpcoming)}
                            </p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-effect rounded-xl p-5 border-l-4 border-purple-500"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total a Receber</p>
                            <p className="text-2xl font-bold text-purple-600">
                                {formatCurrency(totalReceivable)}
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
                        placeholder="Buscar por paciente ou fonte..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500"
                >
                    <option value="all">Todos os status</option>
                    <option value="overdue">🔴 Atrasados</option>
                    <option value="upcoming">🟡 A Vencer</option>
                </select>
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500"
                >
                    <option value="all">Todos os tipos</option>
                    <option value="insurance">Convênio</option>
                    <option value="particular">Particular</option>
                </select>
            </div>

            {/* Lista de Recebíveis */}
            <div className="space-y-3">
                {filteredReceivables.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-300" />
                        <p>Nenhum valor a receber</p>
                    </div>
                ) : (
                    filteredReceivables.map((item) => {
                        const statusColors = {
                            overdue: "border-l-4 border-red-500 bg-red-50/50",
                            upcoming: "border-l-4 border-yellow-500 bg-yellow-50/50",
                            paid: "border-l-4 border-green-500 bg-green-50/50",
                        };

                        const statusLabels = {
                            overdue: { text: "Atrasado", color: "bg-red-100 text-red-700" },
                            upcoming: { text: "A Vencer", color: "bg-yellow-100 text-yellow-700" },
                            paid: { text: "Pago", color: "bg-green-100 text-green-700" },
                        };

                        return (
                            <motion.div
                                key={`${item.type}-${item.id}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`glass-effect rounded-xl p-4 ${statusColors[item.status]}`}
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            {item.type === "insurance" ? (
                                                <Building2 className="w-5 h-5 text-blue-600" />
                                            ) : (
                                                <User className="w-5 h-5 text-green-600" />
                                            )}
                                            <span className="font-semibold text-gray-900">
                                                {item.source_name}
                                            </span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusLabels[item.status].color}`}>
                                                {statusLabels[item.status].text}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                            <span>Paciente: {item.patient_name}</span>
                                            <span>Dr(a). {item.doctor_name}</span>
                                            {item.due_date && (
                                                <span>
                                                    Vencimento: {new Date(item.due_date).toLocaleDateString("pt-BR")}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-xl font-bold text-purple-600">
                                            {formatCurrency(item.value)}
                                        </p>
                                        {item.status === "overdue" && (
                                            <p className="text-xs text-red-600">
                                                {Math.abs(item.days_until_due)} dias atrasado
                                            </p>
                                        )}
                                        {item.status === "upcoming" && item.days_until_due <= 7 && (
                                            <p className="text-xs text-yellow-600">
                                                Vence em {item.days_until_due} dia{item.days_until_due !== 1 ? "s" : ""}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default AccountsReceivable;
