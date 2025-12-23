import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    Clock,
    Users,
    CreditCard,
    XCircle,
    Building2,
    ArrowUpRight,
    ArrowDownRight,
    PieChart,
    BarChart3,
} from "lucide-react";
import { supabase } from "@/lib/customSupabaseClient";
import { toast } from "@/components/ui/use-toast";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart as RechartsPie,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

interface FinancialOverviewProps {
    clinicId: string;
}

interface OverviewStats {
    grossRevenue: number;
    insuranceBilled: number;
    insuranceReceivable: number;
    totalDenials: number;
    particularReceived: number;
    operationalProfit: number;
    doctorCosts: number;
    totalExpenses: number;
    // Growth percentages
    revenueGrowth: number;
    insuranceGrowth: number;
    particularGrowth: number;
}

interface InsurancePaymentTime {
    name: string;
    avgDays: number;
    totalGuides: number;
}

interface RevenueByType {
    name: string;
    value: number;
}

const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

const FinancialOverview: React.FC<FinancialOverviewProps> = ({ clinicId }) => {
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");
    const [stats, setStats] = useState<OverviewStats>({
        grossRevenue: 0,
        insuranceBilled: 0,
        insuranceReceivable: 0,
        totalDenials: 0,
        particularReceived: 0,
        operationalProfit: 0,
        doctorCosts: 0,
        totalExpenses: 0,
        revenueGrowth: 0,
        insuranceGrowth: 0,
        particularGrowth: 0,
    });
    const [insurancePaymentTimes, setInsurancePaymentTimes] = useState<InsurancePaymentTime[]>([]);
    const [revenueByType, setRevenueByType] = useState<RevenueByType[]>([]);
    const [monthlyRevenue, setMonthlyRevenue] = useState<{ month: string; particular: number; insurance: number }[]>([]);

    const loadData = useCallback(async () => {
        if (!clinicId) return;
        setLoading(true);

        try {
            const now = new Date();
            let startDate: Date;
            let prevStartDate: Date;
            let prevEndDate: Date;

            switch (period) {
                case "month":
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
                    break;
                case "quarter":
                    const currentQuarter = Math.floor(now.getMonth() / 3);
                    startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
                    prevStartDate = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
                    prevEndDate = new Date(now.getFullYear(), currentQuarter * 3, 0);
                    break;
                case "year":
                    startDate = new Date(now.getFullYear(), 0, 1);
                    prevStartDate = new Date(now.getFullYear() - 1, 0, 1);
                    prevEndDate = new Date(now.getFullYear() - 1, 11, 31);
                    break;
            }

            // Buscar agendamentos concluídos (período atual)
            const { data: currentAppointments } = await supabase
                .from("appointments")
                .select("*")
                .eq("clinic_id", clinicId)
                .eq("status", "COMPLETED")
                .gte("scheduled_start", startDate.toISOString())
                .lte("scheduled_start", now.toISOString());

            // Buscar agendamentos concluídos (período anterior)
            const { data: prevAppointments } = await supabase
                .from("appointments")
                .select("*")
                .eq("clinic_id", clinicId)
                .eq("status", "COMPLETED")
                .gte("scheduled_start", prevStartDate.toISOString())
                .lte("scheduled_start", prevEndDate.toISOString());

            // Calcular estatísticas do período atual
            const appointments = currentAppointments || [];
            const prevAppts = prevAppointments || [];

            // Receita bruta (particular + convênio)
            const grossRevenue = appointments.reduce((sum, apt) => sum + (apt.final_value || 0), 0);
            const prevGrossRevenue = prevAppts.reduce((sum, apt) => sum + (apt.final_value || 0), 0);

            // Particular recebido
            const particularReceived = appointments
                .filter(apt => !apt.is_insurance)
                .reduce((sum, apt) => sum + (apt.final_value || 0), 0);
            const prevParticularReceived = prevAppts
                .filter(apt => !apt.is_insurance)
                .reduce((sum, apt) => sum + (apt.final_value || 0), 0);

            // Convênios faturados
            const insuranceBilled = appointments
                .filter(apt => apt.is_insurance)
                .reduce((sum, apt) => sum + (apt.final_value || 0), 0);
            const prevInsuranceBilled = prevAppts
                .filter(apt => apt.is_insurance)
                .reduce((sum, apt) => sum + (apt.final_value || 0), 0);

            // Custo com médicos
            const doctorCosts = appointments.reduce((sum, apt) => sum + (apt.doctor_amount || 0), 0);

            // Buscar despesas
            const { data: expensesData } = await supabase
                .from("expenses")
                .select("*")
                .eq("clinic_id", clinicId)
                .gte("due_date", startDate.toISOString().split("T")[0])
                .lte("due_date", now.toISOString().split("T")[0]);

            const totalExpenses = (expensesData || []).reduce((sum, exp) => sum + (exp.amount || 0), 0);

            // Buscar glosas
            const { data: denialsData } = await supabase
                .from("insurance_denials")
                .select("denied_value")
                .eq("clinic_id", clinicId)
                .gte("created_at", startDate.toISOString());

            const totalDenials = (denialsData || []).reduce((sum, d) => sum + (d.denied_value || 0), 0);

            // Convênios a receber (guias enviadas mas não pagas)
            const { data: receivableGuides } = await supabase
                .from("insurance_guides")
                .select("presented_value")
                .eq("clinic_id", clinicId)
                .in("status", ["SENT", "ANALYZING", "APPROVED"]);

            const insuranceReceivable = (receivableGuides || []).reduce((sum, g) => sum + (g.presented_value || 0), 0);

            // Calcular crescimento
            const revenueGrowth = prevGrossRevenue > 0
                ? ((grossRevenue - prevGrossRevenue) / prevGrossRevenue) * 100
                : 0;
            const insuranceGrowth = prevInsuranceBilled > 0
                ? ((insuranceBilled - prevInsuranceBilled) / prevInsuranceBilled) * 100
                : 0;
            const particularGrowth = prevParticularReceived > 0
                ? ((particularReceived - prevParticularReceived) / prevParticularReceived) * 100
                : 0;

            // Lucro operacional
            const operationalProfit = grossRevenue - doctorCosts - totalExpenses;

            setStats({
                grossRevenue,
                insuranceBilled,
                insuranceReceivable,
                totalDenials,
                particularReceived,
                operationalProfit,
                doctorCosts,
                totalExpenses,
                revenueGrowth,
                insuranceGrowth,
                particularGrowth,
            });

            // Receita por tipo (para gráfico de pizza)
            setRevenueByType([
                { name: "Particular", value: particularReceived },
                { name: "Convênio", value: insuranceBilled },
            ]);

            // Tempo médio de pagamento por convênio
            const { data: insuranceStats } = await supabase
                .from("insurance_payment_stats")
                .select("*, insurance_plan:insurance_plans(name)")
                .eq("clinic_id", clinicId);

            if (insuranceStats) {
                setInsurancePaymentTimes(
                    insuranceStats.map((s: any) => ({
                        name: s.insurance_plan?.name || "Convênio",
                        avgDays: s.avg_days_to_payment || 0,
                        totalGuides: s.total_guides || 0,
                    }))
                );
            }

            // Receita mensal (últimos 6 meses)
            const monthlyData: { [key: string]: { particular: number; insurance: number } } = {};
            const allAppointments = [...appointments];

            for (let i = 5; i >= 0; i--) {
                const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthKey = monthDate.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
                monthlyData[monthKey] = { particular: 0, insurance: 0 };
            }

            allAppointments.forEach((apt) => {
                const aptDate = new Date(apt.scheduled_start);
                const monthKey = aptDate.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
                if (monthlyData[monthKey]) {
                    if (apt.is_insurance) {
                        monthlyData[monthKey].insurance += apt.final_value || 0;
                    } else {
                        monthlyData[monthKey].particular += apt.final_value || 0;
                    }
                }
            });

            setMonthlyRevenue(
                Object.entries(monthlyData).map(([month, data]) => ({
                    month,
                    ...data,
                }))
            );

        } catch (error) {
            console.error("Error loading financial data:", error);
            toast({
                title: "Erro ao carregar dados financeiros",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [clinicId, period]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value);
    };

    const formatPercent = (value: number) => {
        const sign = value >= 0 ? "+" : "";
        return `${sign}${value.toFixed(1)}%`;
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="glass-effect rounded-xl p-6 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                        <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                    </div>
                ))}
            </div>
        );
    }

    const kpiCards = [
        {
            title: "Faturamento Bruto",
            value: stats.grossRevenue,
            growth: stats.revenueGrowth,
            icon: DollarSign,
            color: "purple",
        },
        {
            title: "Convênios Faturados",
            value: stats.insuranceBilled,
            growth: stats.insuranceGrowth,
            icon: Building2,
            color: "blue",
        },
        {
            title: "Convênios a Receber",
            value: stats.insuranceReceivable,
            icon: Clock,
            color: "yellow",
        },
        {
            title: "Glosas",
            value: stats.totalDenials,
            icon: XCircle,
            color: "red",
        },
        {
            title: "Particular Recebido",
            value: stats.particularReceived,
            growth: stats.particularGrowth,
            icon: CreditCard,
            color: "green",
        },
        {
            title: "Lucro Operacional",
            value: stats.operationalProfit,
            icon: TrendingUp,
            color: "emerald",
        },
        {
            title: "Custo com Médicos",
            value: stats.doctorCosts,
            icon: Users,
            color: "indigo",
        },
        {
            title: "Despesas",
            value: stats.totalExpenses,
            icon: TrendingDown,
            color: "orange",
        },
    ];

    const colorClasses: { [key: string]: { bg: string; text: string; icon: string } } = {
        purple: { bg: "bg-purple-100", text: "text-purple-600", icon: "bg-purple-500" },
        blue: { bg: "bg-blue-100", text: "text-blue-600", icon: "bg-blue-500" },
        yellow: { bg: "bg-yellow-100", text: "text-yellow-600", icon: "bg-yellow-500" },
        red: { bg: "bg-red-100", text: "text-red-600", icon: "bg-red-500" },
        green: { bg: "bg-green-100", text: "text-green-600", icon: "bg-green-500" },
        emerald: { bg: "bg-emerald-100", text: "text-emerald-600", icon: "bg-emerald-500" },
        indigo: { bg: "bg-indigo-100", text: "text-indigo-600", icon: "bg-indigo-500" },
        orange: { bg: "bg-orange-100", text: "text-orange-600", icon: "bg-orange-500" },
    };

    return (
        <div className="space-y-6">
            {/* Filtro de Período */}
            <div className="flex flex-wrap justify-end gap-2">
                {(["month", "quarter", "year"] as const).map((p) => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${period === p
                            ? "gradient-primary text-white"
                            : "bg-white text-gray-600 hover:bg-gray-50"
                            }`}
                    >
                        {p === "month" ? "Mês" : p === "quarter" ? "Trimestre" : "Ano"}
                    </button>
                ))}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpiCards.map((card, index) => {
                    const Icon = card.icon;
                    const colors = colorClasses[card.color];
                    return (
                        <motion.div
                            key={card.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="glass-effect rounded-xl p-5 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <p className="text-sm text-gray-500 mb-1">{card.title}</p>
                                    <p className={`text-2xl font-bold ${colors.text}`}>
                                        {formatCurrency(card.value)}
                                    </p>
                                    {card.growth !== undefined && (
                                        <div className={`flex items-center gap-1 mt-2 text-sm ${card.growth >= 0 ? "text-green-600" : "text-red-600"
                                            }`}>
                                            {card.growth >= 0 ? (
                                                <ArrowUpRight className="w-4 h-4" />
                                            ) : (
                                                <ArrowDownRight className="w-4 h-4" />
                                            )}
                                            <span>{formatPercent(card.growth)}</span>
                                            <span className="text-gray-400 text-xs">vs período anterior</span>
                                        </div>
                                    )}
                                </div>
                                <div className={`w-12 h-12 rounded-xl ${colors.icon} flex items-center justify-center`}>
                                    <Icon className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Tempo Médio de Recebimento por Convênio */}
            {insurancePaymentTimes.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-effect rounded-xl p-6"
                >
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-purple-600" />
                        Tempo Médio de Recebimento por Convênio
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {insurancePaymentTimes.map((ins, index) => (
                            <div
                                key={index}
                                className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4"
                            >
                                <p className="font-semibold text-gray-900">{ins.name}</p>
                                <p className="text-2xl font-bold text-purple-600 mt-1">
                                    {ins.avgDays} dias
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {ins.totalGuides} guias processadas
                                </p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico de Pizza - Receita por Tipo */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-effect rounded-xl p-6"
                >
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-purple-600" />
                        Receita por Tipo
                    </h3>
                    {revenueByType.some(r => r.value > 0) ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <RechartsPie>
                                <Pie
                                    data={revenueByType}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    dataKey="value"
                                >
                                    {revenueByType.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Legend />
                            </RechartsPie>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-gray-500">
                            Nenhum dado disponível
                        </div>
                    )}
                </motion.div>

                {/* Gráfico de Barras - Receita Mensal */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-effect rounded-xl p-6"
                >
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-purple-600" />
                        Receita Particular x Convênio
                    </h3>
                    {monthlyRevenue.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={monthlyRevenue}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Legend />
                                <Bar dataKey="particular" fill="#10b981" name="Particular" />
                                <Bar dataKey="insurance" fill="#3b82f6" name="Convênio" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-gray-500">
                            Nenhum dado disponível
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default FinancialOverview;
