import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
    Users,
    DollarSign,
    Percent,
    Edit,
    Save,
    Calculator,
    CheckCircle,
    Building2,
    Search,
    Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/customSupabaseClient";
import { toast } from "@/components/ui/use-toast";
import type { DoctorPaymentRuleWithRelations, DoctorPaymentWithRelations } from "@/types/financial.types";

interface DoctorPayrollProps {
    clinicId: string;
    isRestricted?: boolean;
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

const DoctorPayroll: React.FC<DoctorPayrollProps> = ({ clinicId, isRestricted = false }) => {
    const [loading, setLoading] = useState(true);
    const [doctors, setDoctors] = useState<DoctorWithRules[]>([]);
    const [_payments, setPayments] = useState<DoctorPaymentWithRelations[]>([]);
    const [insurancePlans, setInsurancePlans] = useState<{ id: string; name: string }[]>([]);
    const [editingDoctor, setEditingDoctor] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
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

            // Carregar regras de repasse (sem join - relacionamento pode não existir)
            const { data: rulesData, error: rulesError } = await supabase
                .from("doctor_payment_rules")
                .select("*")
                .eq("clinic_id", clinicId);

            console.log("Loaded rules:", rulesData, "Error:", rulesError);

            // Carregar pagamentos
            let paymentsQuery = supabase
                .from("doctor_payments")
                .select("*")
                .eq("clinic_id", clinicId)
                .order("period_end", { ascending: false });

            // Carregar totais por médico dos agendamentos
            let appointmentsQuery = supabase
                .from("appointments")
                .select("doctor_id, final_value, doctor_amount")
                .eq("clinic_id", clinicId)
                .eq("status", "COMPLETED");

            if (isRestricted) {
                const now = new Date();
                const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
                const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

                // Filter payments made today (assuming created_at is the relevant timestamp)
                paymentsQuery = paymentsQuery.gte("created_at", startOfDay).lte("created_at", endOfDay);

                // Filter appointments for today
                appointmentsQuery = appointmentsQuery.gte("scheduled_start", startOfDay).lte("scheduled_start", endOfDay);
            }

            const { data: paymentsData } = await paymentsQuery;
            const { data: appointmentsData } = await appointmentsQuery;

            // Carregar convênios (no filtering needed for reference data)
            const { data: plansData } = await supabase
                .from("insurance_plans")
                .select("id, name")
                .eq("clinic_id", clinicId);


            const doctorTotals: { [key: string]: { produced: number; due: number } } = {};
            (appointmentsData || []).forEach((apt: any) => {
                if (!doctorTotals[apt.doctor_id]) {
                    doctorTotals[apt.doctor_id] = { produced: 0, due: 0 };
                }
                doctorTotals[apt.doctor_id].produced += apt.final_value || 0;
                doctorTotals[apt.doctor_id].due += apt.doctor_amount || 0;
            });

            // ... rest of logic ...

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
    }, [clinicId, isRestricted]);

    // Carregar dados ao montar o componente
    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSaveRule = async (doctorId: string) => {
        try {
            // First, check if a rule already exists for this doctor/clinic/insurance combination
            const insurancePlanId = newRule.insurance_plan_id || null;

            let query = supabase
                .from("doctor_payment_rules")
                .select("id")
                .eq("clinic_id", clinicId)
                .eq("doctor_id", doctorId);

            if (insurancePlanId) {
                query = query.eq("insurance_plan_id", insurancePlanId);
            } else {
                query = query.is("insurance_plan_id", null);
            }

            const { data: existingRules } = await query;

            const ruleData = {
                clinic_id: clinicId,
                doctor_id: doctorId,
                payment_type: newRule.payment_type,
                default_percentage: parseFloat(newRule.default_percentage) || 60,
                default_fixed_value: parseFloat(newRule.default_fixed_value) || 0,
                insurance_plan_id: insurancePlanId,
                custom_value: newRule.custom_value ? parseFloat(newRule.custom_value) : null,
            };

            let error;

            if (existingRules && existingRules.length > 0) {
                // Update existing rule
                const result = await supabase
                    .from("doctor_payment_rules")
                    .update(ruleData)
                    .eq("id", existingRules[0].id);
                error = result.error;
            } else {
                // Insert new rule with generated UUID
                const result = await supabase
                    .from("doctor_payment_rules")
                    .insert({
                        id: crypto.randomUUID(),
                        ...ruleData
                    });
                error = result.error;
            }

            if (error) throw error;

            console.log("Rule saved successfully, reloading data...");
            toast({ title: "Regra de repasse salva!" });
            setEditingDoctor(null);
            setNewRule({
                payment_type: "PERCENTAGE",
                default_percentage: "60",
                default_fixed_value: "0",
                insurance_plan_id: "",
                custom_value: "",
            });
            // Small delay to ensure database is updated
            await new Promise(resolve => setTimeout(resolve, 300));
            await loadData();
            console.log("Data reloaded after save");
        } catch (error) {
            console.error("Error saving rule:", error);
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

    // Filtrar médicos pela busca
    const filteredDoctors = doctors.filter((doctor) =>
        doctor.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Estatísticas gerais (baseado nos médicos filtrados quando há busca, senão todos)
    const displayDoctors = searchTerm ? filteredDoctors : doctors;
    const totalProduced = displayDoctors.reduce((sum, d) => sum + d.totalProduced, 0);
    const totalDue = displayDoctors.reduce((sum, d) => sum + d.totalDue, 0);
    const totalPaid = displayDoctors.reduce((sum, d) => sum + d.totalPaid, 0);
    const totalPending = totalDue - totalPaid;

    // Função para imprimir recibo de pagamento
    const handlePrintReceipt = (doctor: DoctorWithRules) => {
        const pendingAmount = doctor.totalDue - doctor.totalPaid;
        const today = new Date().toLocaleDateString("pt-BR");

        const receiptContent = `
            <html>
            <head>
                <title>Recibo de Repasse - ${doctor.name}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
                    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
                    .header h1 { margin: 0; color: #6b21a8; }
                    .header p { color: #666; margin: 5px 0; }
                    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #ccc; }
                    .info-row.total { border-bottom: 2px solid #333; font-weight: bold; font-size: 1.2em; }
                    .label { color: #666; }
                    .value { font-weight: bold; }
                    .value.blue { color: #2563eb; }
                    .value.green { color: #16a34a; }
                    .value.yellow { color: #ca8a04; }
                    .footer { margin-top: 50px; text-align: center; }
                    .signature { margin-top: 60px; border-top: 1px solid #333; width: 200px; margin-left: auto; margin-right: auto; padding-top: 10px; }
                    @media print { body { padding: 20px; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>RECIBO DE REPASSE MÉDICO</h1>
                    <p>Data: ${today}</p>
                </div>
                
                <div class="info-row">
                    <span class="label">Médico:</span>
                    <span class="value">${doctor.name}</span>
                </div>
                <div class="info-row">
                    <span class="label">CRM:</span>
                    <span class="value">${doctor.crm}</span>
                </div>
                
                <div style="margin-top: 30px;"></div>
                
                <div class="info-row">
                    <span class="label">Total Produzido:</span>
                    <span class="value">${formatCurrency(doctor.totalProduced)}</span>
                </div>
                <div class="info-row">
                    <span class="label">Repasse Devido:</span>
                    <span class="value blue">${formatCurrency(doctor.totalDue)}</span>
                </div>
                <div class="info-row">
                    <span class="label">Já Pago:</span>
                    <span class="value green">${formatCurrency(doctor.totalPaid)}</span>
                </div>
                <div class="info-row total">
                    <span class="label">PENDENTE:</span>
                    <span class="value yellow">${formatCurrency(pendingAmount)}</span>
                </div>
                
                <div class="footer">
                    <div class="signature">Assinatura</div>
                </div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(receiptContent);
            printWindow.document.close();
            printWindow.print();
        }
    };

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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                            <p className="text-sm text-gray-500">Repasse Médicos</p>
                            <p className="text-2xl font-bold text-blue-600">
                                {formatCurrency(totalDue)}
                            </p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="glass-effect rounded-xl p-5"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Retenção Clínica</p>
                            <p className="text-2xl font-bold text-indigo-600">
                                {formatCurrency(totalProduced - totalDue)}
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
                            <p className="text-sm text-gray-500">Já Pago</p>
                            <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(totalPaid)}
                            </p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
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
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-600" />
                        {isRestricted ? "Repasse do Dia" : "Configuração de Repasse por Médico"}
                    </h3>

                    {/* Campo de busca */}
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar médico..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        />
                    </div>
                </div>

                {filteredDoctors.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        {searchTerm ? `Nenhum médico encontrado para "${searchTerm}"` : "Nenhum médico cadastrado"}
                    </div>
                ) : (
                    filteredDoctors.map((doctor) => {
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
                                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                                <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                                                    Médico: {defaultRule.payment_type === "PERCENTAGE"
                                                        ? `${defaultRule.default_percentage}%`
                                                        : `R$ ${defaultRule.default_fixed_value}`}
                                                </span>
                                                {defaultRule.payment_type === "PERCENTAGE" && (
                                                    <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">
                                                        Clínica: {100 - (defaultRule.default_percentage || 0)}%
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-yellow-600 font-medium">
                                                ⚠️ Sem regra configurada - clique em "Configurar"
                                            </p>
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
                                        <div className="flex gap-2">
                                            {/* Botão Imprimir Recibo */}
                                            <Button
                                                onClick={() => handlePrintReceipt(doctor)}
                                                size="sm"
                                                variant="outline"
                                                className="text-green-600 border-green-300 hover:bg-green-50"
                                            >
                                                <Printer className="w-4 h-4 mr-1" />
                                                Recibo
                                            </Button>

                                            {!isRestricted && (
                                                <Button
                                                    onClick={() => setEditingDoctor(isEditing ? null : doctor.id)}
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    <Edit className="w-4 h-4 mr-1" />
                                                    {isEditing ? "Cancelar" : "Configurar"}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Formulário de edição */}
                                {isEditing && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        className="mt-4 pt-4 border-t border-gray-200"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                                                    <option value="FIXED">Valor Fixo por Consulta</option>
                                                </select>
                                            </div>

                                            {newRule.payment_type === "PERCENTAGE" && (
                                                <>
                                                    <div>
                                                        <label className="block text-sm font-medium text-blue-600 mb-1">
                                                            % Médico Recebe
                                                        </label>
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                value={newRule.default_percentage}
                                                                onChange={(e) => {
                                                                    const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                                                                    setNewRule({ ...newRule, default_percentage: String(val) });
                                                                }}
                                                                className="w-full px-3 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 bg-blue-50"
                                                            />
                                                            <Percent className="w-4 h-4 text-blue-500" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-indigo-600 mb-1">
                                                            % Clínica Recebe
                                                        </label>
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                value={100 - (parseFloat(newRule.default_percentage) || 0)}
                                                                onChange={(e) => {
                                                                    const clinicVal = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                                                                    const doctorVal = 100 - clinicVal;
                                                                    setNewRule({ ...newRule, default_percentage: String(doctorVal) });
                                                                }}
                                                                className="w-full px-3 py-2 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-500 bg-indigo-50"
                                                            />
                                                            <Percent className="w-4 h-4 text-indigo-500" />
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            {newRule.payment_type === "FIXED" && (
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-blue-600 mb-1">
                                                        Valor Fixo por Consulta (R$)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={newRule.default_fixed_value}
                                                        onChange={(e) =>
                                                            setNewRule({ ...newRule, default_fixed_value: e.target.value })
                                                        }
                                                        className="w-full px-3 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 bg-blue-50"
                                                        placeholder="Ex: 150.00"
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
