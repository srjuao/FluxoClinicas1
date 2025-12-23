import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
    XCircle,
    AlertTriangle,
    CheckCircle,
    Clock,
    TrendingDown,
    RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/customSupabaseClient";
import { toast } from "@/components/ui/use-toast";
import {
    DENIAL_STATUS_LABELS,
    type DenialStatus,
    type InsuranceDenialWithRelations,
} from "@/types/financial.types";

interface DenialManagementProps {
    clinicId: string;
}

const DenialManagement: React.FC<DenialManagementProps> = ({ clinicId }) => {
    const [loading, setLoading] = useState(true);
    const [denials, setDenials] = useState<InsuranceDenialWithRelations[]>([]);
    const [insurancePlans, setInsurancePlans] = useState<{ id: string; name: string }[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [insuranceFilter, setInsuranceFilter] = useState<string>("all");
    const [editingDenial, setEditingDenial] = useState<string | null>(null);
    const [appealNotes, setAppealNotes] = useState("");

    const loadData = useCallback(async () => {
        if (!clinicId) return;
        setLoading(true);

        try {
            const { data: denialsData, error } = await supabase
                .from("insurance_denials")
                .select(`
          *,
          insurance_plan:insurance_plans(name),
          guide:insurance_guides!inner(guide_number, clinic_id, patient:patients(name))
        `)
                .eq("guide.clinic_id", clinicId)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setDenials((denialsData as unknown as InsuranceDenialWithRelations[]) || []);

            const { data: plansData } = await supabase
                .from("insurance_plans")
                .select("id, name")
                .eq("clinic_id", clinicId);

            setInsurancePlans(plansData || []);
        } catch (error) {
            console.error("Error loading denials:", error);
            toast({
                title: "Erro ao carregar glosas",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [clinicId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleUpdateStatus = async (denialId: string, newStatus: DenialStatus, notes?: string) => {
        try {
            const updates: any = { status: newStatus };

            if (newStatus === "APPEALING") {
                updates.appealed_at = new Date().toISOString();
                if (notes) updates.appeal_notes = notes;
            } else if (newStatus === "RECOVERED" || newStatus === "PARTIALLY_RECOVERED" || newStatus === "LOST") {
                updates.resolved_at = new Date().toISOString();
                if (notes) updates.resolution_notes = notes;
            }

            const { error } = await supabase
                .from("insurance_denials")
                .update(updates)
                .eq("id", denialId);

            if (error) throw error;

            toast({ title: "Status atualizado!" });
            setEditingDenial(null);
            setAppealNotes("");
            loadData();
        } catch (error) {
            toast({
                title: "Erro ao atualizar glosa",
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

    const filteredDenials = denials.filter((denial) => {
        const matchesStatus = statusFilter === "all" || denial.status === statusFilter;
        const matchesInsurance =
            insuranceFilter === "all" || denial.insurance_plan_id === insuranceFilter;
        return matchesStatus && matchesInsurance;
    });

    // Estatísticas
    const totalDenied = denials.reduce((sum, d) => sum + d.denied_value, 0);
    const totalRecovered = denials.reduce((sum, d) => sum + (d.recovered_value || 0), 0);
    const totalLost = denials
        .filter((d) => d.status === "LOST")
        .reduce((sum, d) => sum + d.denied_value, 0);
    const pendingRecovery = denials
        .filter((d) => ["PENDING", "APPEALING"].includes(d.status))
        .reduce((sum, d) => sum + d.denied_value, 0);

    // Convênios que mais glosam
    const denialsByInsurance = insurancePlans.map((plan) => {
        const planDenials = denials.filter((d) => d.insurance_plan_id === plan.id);
        return {
            name: plan.name,
            count: planDenials.length,
            value: planDenials.reduce((sum, d) => sum + d.denied_value, 0),
        };
    }).sort((a, b) => b.value - a.value);

    if (loading) {
        return (
            <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-effect rounded-xl p-5"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center">
                            <XCircle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Glosado</p>
                            <p className="text-2xl font-bold text-red-600">
                                {formatCurrency(totalDenied)}
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
                        <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Recuperado</p>
                            <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(totalRecovered)}
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
                        <div className="w-12 h-12 rounded-xl bg-yellow-500 flex items-center justify-center">
                            <Clock className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Em Recurso</p>
                            <p className="text-2xl font-bold text-yellow-600">
                                {formatCurrency(pendingRecovery)}
                            </p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="glass-effect rounded-xl p-5"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gray-500 flex items-center justify-center">
                            <TrendingDown className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Perdido</p>
                            <p className="text-2xl font-bold text-gray-600">
                                {formatCurrency(totalLost)}
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Convênios que mais glosam */}
            {denialsByInsurance.length > 0 && denialsByInsurance[0].count > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-effect rounded-xl p-6"
                >
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        Convênios que Mais Glosam
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {denialsByInsurance.slice(0, 3).map((ins, index) => (
                            <div
                                key={index}
                                className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg p-4 border border-red-100"
                            >
                                <p className="font-semibold text-gray-900">{ins.name}</p>
                                <p className="text-2xl font-bold text-red-600 mt-1">
                                    {formatCurrency(ins.value)}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {ins.count} glosa{ins.count !== 1 ? "s" : ""}
                                </p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-4">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500"
                >
                    <option value="all">Todos os status</option>
                    {Object.entries(DENIAL_STATUS_LABELS).map(([value, { label }]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
                <select
                    value={insuranceFilter}
                    onChange={(e) => setInsuranceFilter(e.target.value)}
                    className="px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500"
                >
                    <option value="all">Todos os convênios</option>
                    {insurancePlans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                            {plan.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Lista de Glosas */}
            <div className="space-y-3">
                {filteredDenials.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-300" />
                        <p>Nenhuma glosa registrada</p>
                    </div>
                ) : (
                    filteredDenials.map((denial) => {
                        const statusInfo = DENIAL_STATUS_LABELS[denial.status as DenialStatus];
                        const isEditing = editingDenial === denial.id;

                        return (
                            <motion.div
                                key={denial.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-effect rounded-xl p-4"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <XCircle className="w-5 h-5 text-red-600" />
                                            <span className="font-semibold text-gray-900">
                                                {denial.insurance_plan?.name}
                                            </span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                                                {statusInfo.label}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-600 space-y-1">
                                            <p><strong>Motivo:</strong> {denial.denial_reason}</p>
                                            {denial.procedure_code && (
                                                <p><strong>Procedimento:</strong> {denial.procedure_code}</p>
                                            )}
                                            {denial.appeal_notes && (
                                                <p className="text-blue-600"><strong>Recurso:</strong> {denial.appeal_notes}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-red-600">
                                                {formatCurrency(denial.denied_value)}
                                            </p>
                                            {denial.recovered_value > 0 && (
                                                <p className="text-xs text-green-600">
                                                    Recuperado: {formatCurrency(denial.recovered_value)}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex gap-1">
                                            {denial.status === "PENDING" && (
                                                <Button
                                                    onClick={() => setEditingDenial(denial.id)}
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-yellow-600"
                                                >
                                                    <RefreshCw className="w-4 h-4 mr-1" />
                                                    Recurso
                                                </Button>
                                            )}
                                            {denial.status === "APPEALING" && (
                                                <>
                                                    <Button
                                                        onClick={() => handleUpdateStatus(denial.id, "RECOVERED")}
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-green-600"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleUpdateStatus(denial.id, "LOST")}
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-red-600"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {isEditing && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        className="mt-4 pt-4 border-t border-gray-200"
                                    >
                                        <div className="space-y-3">
                                            <textarea
                                                value={appealNotes}
                                                onChange={(e) => setAppealNotes(e.target.value)}
                                                placeholder="Descreva o recurso..."
                                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500"
                                                rows={3}
                                            />
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => handleUpdateStatus(denial.id, "APPEALING", appealNotes)}
                                                    className="gradient-primary text-white"
                                                >
                                                    Iniciar Recurso
                                                </Button>
                                                <Button
                                                    onClick={() => {
                                                        setEditingDenial(null);
                                                        setAppealNotes("");
                                                    }}
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

export default DenialManagement;
