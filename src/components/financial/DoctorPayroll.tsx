import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
    Users,
    DollarSign,
    Percent,
    Edit,
    Save,
    X,
    Plus,
    Calculator,
    CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/customSupabaseClient";
import { toast } from "@/components/ui/use-toast";
import type { DoctorPaymentRuleWithRelations, DoctorPaymentWithRelations } from "@/types/financial.types";

interface DoctorPayrollProps {
    clinicId: string;
}

interface DoctorWithRules {
    id: string;
    name: string;
    crm: string;
    rules: DoctorPaymentRuleWithRelations[];
    totalProduced: number;
    totalDue: number;
    totalPaid: number;
}

const DoctorPayroll: React.FC<DoctorPayrollProps> = ({ clinicId }) => {
    const [loading, setLoading] = useState(true);
    const [doctors, setDoctors] = useState<DoctorWithRules[]>([]);
    const [payments, setPayments] = useState<DoctorPaymentWithRelations[]>([]);
    const [insurancePlans, setInsurancePlans] = useState<{ id: string; name: string }[]>([]);
    const [editingDoctor, setEditingDoctor] = useState<string | null>(null);
    const [newRule, setNewRule] = useState({
        payment_type: "PERCENTAGE",
        default_percentage: "60",
        default_fixed_value: "0",
        insurance_plan_id: "",
        custom_value: "",
    });

    const loadData = useCallback(async () => {
        if (!clinicId) return;
        setLoading(true);

        try {
            // Carregar médicos com perfis
            const { data: doctorsData } = await supabase
                .from("doctors")
                .select("id, crm, profile:profiles(name)")
                .eq("clinic_id", clinicId);

            // Carregar regras de repasse
            const { data: rulesData } = await supabase
                .from("doctor_payment_rules")
                .select("*, insurance_plan:insurance_plans(name)")
                .eq("clinic_id", clinicId);

            // Carregar pagamentos
            const { data: paymentsData } = await supabase
                .from("doctor_payments")
                .select("*")
                .eq("clinic_id", clinicId)
                .order("period_end", { ascending: false });

            // Carregar convênios
            const { data: plansData } = await supabase
                .from("insurance_plans")
                .select("id, name")
                .eq("clinic_id", clinicId);

            // Calcular totais por médico dos agendamentos
            const { data: appointmentsData } = await supabase
                .from("appointments")
                .select("doctor_id, final_value, doctor_amount")
                .eq("clinic_id", clinicId)
                .eq("status", "COMPLETED");

            const doctorTotals: { [key: string]: { produced: number; due: number } } = {};
            (appointmentsData || []).forEach((apt: any) => {
                if (!doctorTotals[apt.doctor_id]) {
                    doctorTotals[apt.doctor_id] = { produced: 0, due: 0 };
                }
                doctorTotals[apt.doctor_id].produced += apt.final_value || 0;
                doctorTotals[apt.doctor_id].due += apt.doctor_amount || 0;
            });

            // Calcular total pago por médico
            const paidByDoctor: { [key: string]: number } = {};
            (paymentsData || []).forEach((p: any) => {
                if (!paidByDoctor[p.doctor_id]) {
                    paidByDoctor[p.doctor_id] = 0;
                }
                paidByDoctor[p.doctor_id] += p.total_paid || 0;
            });

            // Montar dados dos médicos
            const doctorsList = (doctorsData || []).map((doc: any) => ({
                id: doc.id,
                name: doc.profile?.name || "Médico",
                crm: doc.crm,
                rules: (rulesData || []).filter((r: any) => r.doctor_id === doc.id),
                totalProduced: doctorTotals[doc.id]?.produced || 0,
                totalDue: doctorTotals[doc.id]?.due || 0,
                totalPaid: paidByDoctor[doc.id] || 0,
            }));

            setDoctors(doctorsList);
            setPayments((paymentsData as unknown as DoctorPaymentWithRelations[]) || []);
            setInsurancePlans(plansData || []);
        } catch (error) {
            console.error("Error loading payroll data:", error);
            toast({
                title: "Erro ao carregar dados de repasse",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [clinicId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSaveRule = async (doctorId: string) => {
        try {
            const { error } = await supabase.from("doctor_payment_rules").upsert({
                clinic_id: clinicId,
                doctor_id: doctorId,
                payment_type: newRule.payment_type,
                default_percentage: parseFloat(newRule.default_percentage) || 60,
                default_fixed_value: parseFloat(newRule.default_fixed_value) || 0,
                insurance_plan_id: newRule.insurance_plan_id || null,
                custom_value: newRule.custom_value ? parseFloat(newRule.custom_value) : null,
                is_active: true,
            }, {
                onConflict: "doctor_id,clinic_id,insurance_plan_id,procedure_code"
            });

            if (error) throw error;

            toast({ title: "Regra de repasse salva!" });
            setEditingDoctor(null);
            setNewRule({
                payment_type: "PERCENTAGE",
                default_percentage: "60",
                default_fixed_value: "0",
                insurance_plan_id: "",
                custom_value: "",
            });
            loadData();
        } catch (error) {
            toast({
                title: "Erro ao salvar regra",
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

    // Estatísticas gerais
    const totalProduced = doctors.reduce((sum, d) => sum + d.totalProduced, 0);
    const totalDue = doctors.reduce((sum, d) => sum + d.totalDue, 0);
    const totalPaid = doctors.reduce((sum, d) => sum + d.totalPaid, 0);
    const totalPending = totalDue - totalPaid;

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
                        <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center">
                            <DollarSign className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Produzido</p>
                            <p className="text-2xl font-bold text-purple-600">
                                {formatCurrency(totalProduced)}
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
                        <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
                            <Calculator className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total a Pagar</p>
                            <p className="text-2xl font-bold text-blue-600">
                                {formatCurrency(totalDue)}
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
                        <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Pago</p>
                            <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(totalPaid)}
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
                        <div className="w-12 h-12 rounded-xl bg-yellow-500 flex items-center justify-center">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Pendente</p>
                            <p className="text-2xl font-bold text-yellow-600">
                                {formatCurrency(totalPending)}
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Lista de Médicos */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    Configuração de Repasse por Médico
                </h3>

                {doctors.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        Nenhum médico cadastrado
                    </div>
                ) : (
                    doctors.map((doctor) => {
                        const isEditing = editingDoctor === doctor.id;
                        const defaultRule = doctor.rules.find((r) => !r.insurance_plan_id);
                        const pendingAmount = doctor.totalDue - doctor.totalPaid;

                        return (
                            <motion.div
                                key={doctor.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-effect rounded-xl p-5"
                            >
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white font-semibold">
                                                {doctor.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900">{doctor.name}</h4>
                                                <p className="text-sm text-gray-500">CRM: {doctor.crm}</p>
                                            </div>
                                        </div>

                                        {/* Regra atual */}
                                        {defaultRule ? (
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                                                    {defaultRule.payment_type === "PERCENTAGE"
                                                        ? `${defaultRule.default_percentage}% por consulta`
                                                        : defaultRule.payment_type === "FIXED"
                                                            ? `R$ ${defaultRule.default_fixed_value} fixo`
                                                            : "Por procedimento"}
                                                </span>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500">Sem regra configurada</p>
                                        )}

                                        {/* Regras por convênio */}
                                        {doctor.rules.filter((r) => r.insurance_plan_id).length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                {doctor.rules
                                                    .filter((r) => r.insurance_plan_id)
                                                    .map((rule) => (
                                                        <span
                                                            key={rule.id}
                                                            className="inline-block mr-2 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs"
                                                        >
                                                            {rule.insurance_plan?.name}: {rule.custom_value ? `R$ ${rule.custom_value}` : `${rule.default_percentage}%`}
                                                        </span>
                                                    ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2 text-right">
                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <p className="text-gray-500">Produzido</p>
                                                <p className="font-semibold text-purple-600">
                                                    {formatCurrency(doctor.totalProduced)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500">A Pagar</p>
                                                <p className="font-semibold text-blue-600">
                                                    {formatCurrency(doctor.totalDue)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500">Pendente</p>
                                                <p className={`font-semibold ${pendingAmount > 0 ? "text-yellow-600" : "text-green-600"}`}>
                                                    {formatCurrency(pendingAmount)}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => setEditingDoctor(isEditing ? null : doctor.id)}
                                            size="sm"
                                            variant="outline"
                                        >
                                            <Edit className="w-4 h-4 mr-1" />
                                            {isEditing ? "Cancelar" : "Configurar"}
                                        </Button>
                                    </div>
                                </div>

                                {/* Formulário de edição */}
                                {isEditing && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        className="mt-4 pt-4 border-t border-gray-200"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Tipo de Repasse
                                                </label>
                                                <select
                                                    value={newRule.payment_type}
                                                    onChange={(e) =>
                                                        setNewRule({ ...newRule, payment_type: e.target.value })
                                                    }
                                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500"
                                                >
                                                    <option value="PERCENTAGE">Porcentagem</option>
                                                    <option value="FIXED">Valor Fixo</option>
                                                    <option value="PER_PROCEDURE">Por Procedimento</option>
                                                </select>
                                            </div>

                                            {newRule.payment_type === "PERCENTAGE" && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Porcentagem
                                                    </label>
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            value={newRule.default_percentage}
                                                            onChange={(e) =>
                                                                setNewRule({ ...newRule, default_percentage: e.target.value })
                                                            }
                                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500"
                                                        />
                                                        <Percent className="w-4 h-4 text-gray-400" />
                                                    </div>
                                                </div>
                                            )}

                                            {newRule.payment_type === "FIXED" && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Valor Fixo
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={newRule.default_fixed_value}
                                                        onChange={(e) =>
                                                            setNewRule({ ...newRule, default_fixed_value: e.target.value })
                                                        }
                                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500"
                                                    />
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Convênio (opcional)
                                                </label>
                                                <select
                                                    value={newRule.insurance_plan_id}
                                                    onChange={(e) =>
                                                        setNewRule({ ...newRule, insurance_plan_id: e.target.value })
                                                    }
                                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500"
                                                >
                                                    <option value="">Todos (padrão)</option>
                                                    {insurancePlans.map((plan) => (
                                                        <option key={plan.id} value={plan.id}>
                                                            {plan.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="flex items-end">
                                                <Button
                                                    onClick={() => handleSaveRule(doctor.id)}
                                                    className="w-full gradient-primary text-white"
                                                >
                                                    <Save className="w-4 h-4 mr-1" />
                                                    Salvar
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

export default DoctorPayroll;
