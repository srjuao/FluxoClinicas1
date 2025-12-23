import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
    FileBarChart,
    Download,
    Building2,
    Users,
    TrendingUp,
    XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/customSupabaseClient";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts";

interface FinancialReportsProps {
    clinicId: string;
}

const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

const FinancialReports: React.FC<FinancialReportsProps> = ({ clinicId }) => {
    const [loading, setLoading] = useState(true);
    const [revenueByInsurance, setRevenueByInsurance] = useState<{ name: string; value: number }[]>([]);
    const [productionByDoctor, setProductionByDoctor] = useState<{ name: string; value: number; count: number }[]>([]);
    const [denialsByInsurance, setDenialsByInsurance] = useState<{ name: string; value: number; count: number }[]>([]);
    const [topProcedures, setTopProcedures] = useState<{ name: string; value: number; count: number }[]>([]);

    const loadData = useCallback(async () => {
        if (!clinicId) return;
        setLoading(true);

        try {
            // Receita por convênio
            const { data: insuranceApts } = await supabase
                .from("appointments")
                .select("insurance_plan_id, final_value, insurance_plan:insurance_plans(name)")
                .eq("clinic_id", clinicId)
                .eq("status", "COMPLETED")
                .eq("is_insurance", true);

            const insuranceMap: { [key: string]: { name: string; value: number } } = {};
            (insuranceApts || []).forEach((apt: any) => {
                const name = apt.insurance_plan?.name || "Outro";
                if (!insuranceMap[name]) insuranceMap[name] = { name, value: 0 };
                insuranceMap[name].value += apt.final_value || 0;
            });
            setRevenueByInsurance(Object.values(insuranceMap).sort((a, b) => b.value - a.value));

            // Produção por médico
            const { data: doctorApts } = await supabase
                .from("appointments")
                .select("doctor_id, final_value, doctor:doctors(profile:profiles(name))")
                .eq("clinic_id", clinicId)
                .eq("status", "COMPLETED");

            const doctorMap: { [key: string]: { name: string; value: number; count: number } } = {};
            (doctorApts || []).forEach((apt: any) => {
                const name = apt.doctor?.profile?.name || "Médico";
                if (!doctorMap[name]) doctorMap[name] = { name, value: 0, count: 0 };
                doctorMap[name].value += apt.final_value || 0;
                doctorMap[name].count += 1;
            });
            setProductionByDoctor(Object.values(doctorMap).sort((a, b) => b.value - a.value));

            // Glosas por convênio
            const { data: denials } = await supabase
                .from("insurance_denials")
                .select("insurance_plan_id, denied_value, insurance_plan:insurance_plans(name)")
                .eq("clinic_id", clinicId);

            const denialMap: { [key: string]: { name: string; value: number; count: number } } = {};
            (denials || []).forEach((d: any) => {
                const name = d.insurance_plan?.name || "Outro";
                if (!denialMap[name]) denialMap[name] = { name, value: 0, count: 0 };
                denialMap[name].value += d.denied_value || 0;
                denialMap[name].count += 1;
            });
            setDenialsByInsurance(Object.values(denialMap).sort((a, b) => b.value - a.value));

            // Procedimentos mais rentáveis (usando guias)
            const { data: guides } = await supabase
                .from("insurance_guides")
                .select("procedure_name, approved_value, presented_value")
                .eq("clinic_id", clinicId)
                .eq("status", "PAID");

            const procMap: { [key: string]: { name: string; value: number; count: number } } = {};
            (guides || []).forEach((g: any) => {
                const name = g.procedure_name || "Procedimento";
                if (!procMap[name]) procMap[name] = { name, value: 0, count: 0 };
                procMap[name].value += g.approved_value || g.presented_value || 0;
                procMap[name].count += 1;
            });
            setTopProcedures(Object.values(procMap).sort((a, b) => b.value - a.value).slice(0, 10));

        } catch (error) {
            console.error("Error loading reports:", error);
        } finally {
            setLoading(false);
        }
    }, [clinicId]);

    useEffect(() => { loadData(); }, [loadData]);

    const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

    const exportCSV = (data: any[], filename: string) => {
        if (data.length === 0) return;
        const headers = Object.keys(data[0]).join(",");
        const rows = data.map((row) => Object.values(row).join(",")).join("\n");
        const csv = `${headers}\n${rows}`;
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filename}.csv`;
        a.click();
    };

    if (loading) return <div className="text-center py-8">Carregando relatórios...</div>;

    return (
        <div className="space-y-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <FileBarChart className="w-6 h-6 text-purple-600" />
                    Relatórios Financeiros
                </h2>
                <p className="text-gray-600">Análise completa para gestão da clínica</p>
            </motion.div>

            {/* Faturamento por Convênio */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-effect rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-blue-600" />
                        Faturamento por Convênio
                    </h3>
                    <Button onClick={() => exportCSV(revenueByInsurance, "faturamento_convenios")} size="sm" variant="outline">
                        <Download className="w-4 h-4 mr-1" />CSV
                    </Button>
                </div>
                {revenueByInsurance.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={revenueByInsurance}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(v: number) => formatCurrency(v)} />
                            <Bar dataKey="value" fill="#3b82f6" name="Receita" />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <p className="text-center text-gray-500 py-8">Sem dados</p>
                )}
            </motion.div>

            {/* Produção por Médico */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-effect rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-green-600" />
                        Produção por Médico
                    </h3>
                    <Button onClick={() => exportCSV(productionByDoctor, "producao_medicos")} size="sm" variant="outline">
                        <Download className="w-4 h-4 mr-1" />CSV
                    </Button>
                </div>
                {productionByDoctor.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie data={productionByDoctor} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                    {productionByDoctor.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-2 overflow-y-auto max-h-[250px] pr-2">
                            {productionByDoctor.map((doc, i) => (
                                <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                                    <div className="flex items-center gap-2 truncate">
                                        <div
                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: COLORS[i % COLORS.length] }}
                                        />
                                        <span className="font-medium truncate" title={doc.name}>{doc.name}</span>
                                    </div>
                                    <span className="text-green-600 font-bold ml-2 whitespace-nowrap">{formatCurrency(doc.value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <p className="text-center text-gray-500 py-8">Sem dados</p>
                )}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Glosas por Convênio */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-effect rounded-xl p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-red-600" />
                            Glosas por Convênio
                        </h3>
                        <Button onClick={() => exportCSV(denialsByInsurance, "glosas_convenios")} size="sm" variant="outline">
                            <Download className="w-4 h-4 mr-1" />CSV
                        </Button>
                    </div>
                    {denialsByInsurance.length > 0 ? (
                        <div className="space-y-2">
                            {denialsByInsurance.map((ins, i) => (
                                <div key={i} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                                    <div>
                                        <span className="font-medium">{ins.name}</span>
                                        <span className="text-xs text-gray-500 ml-2">({ins.count} glosas)</span>
                                    </div>
                                    <span className="text-red-600 font-bold">{formatCurrency(ins.value)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-8">Nenhuma glosa</p>
                    )}
                </motion.div>

                {/* Procedimentos Rentáveis */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-effect rounded-xl p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-purple-600" />
                            Top Procedimentos
                        </h3>
                        <Button onClick={() => exportCSV(topProcedures, "top_procedimentos")} size="sm" variant="outline">
                            <Download className="w-4 h-4 mr-1" />CSV
                        </Button>
                    </div>
                    {topProcedures.length > 0 ? (
                        <div className="space-y-2">
                            {topProcedures.map((proc, i) => (
                                <div key={i} className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                                    <div>
                                        <span className="font-medium">{proc.name}</span>
                                        <span className="text-xs text-gray-500 ml-2">({proc.count}x)</span>
                                    </div>
                                    <span className="text-purple-600 font-bold">{formatCurrency(proc.value)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-8">Sem dados</p>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default FinancialReports;
