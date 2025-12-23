import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
    Building2,
    Plus,
    Search,
    Filter,
    FileText,
    Send,
    CheckCircle,
    XCircle,
    Clock,
    Edit,
    Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/customSupabaseClient";
import { toast } from "@/components/ui/use-toast";
import {
    GUIDE_STATUS_LABELS,
    type GuideStatus,
    type InsuranceGuideWithRelations,
} from "@/types/financial.types";

interface InsuranceBillingProps {
    clinicId: string;
}

const InsuranceBilling: React.FC<InsuranceBillingProps> = ({ clinicId }) => {
    const [loading, setLoading] = useState(true);
    const [guides, setGuides] = useState<InsuranceGuideWithRelations[]>([]);
    const [insurancePlans, setInsurancePlans] = useState<{ id: string; name: string }[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [insuranceFilter, setInsuranceFilter] = useState<string>("all");
    const [showNewGuide, setShowNewGuide] = useState(false);
    const [newGuide, setNewGuide] = useState({
        insurance_plan_id: "",
        patient_id: "",
        guide_number: "",
        lot_number: "",
        procedure_code: "",
        procedure_name: "",
        presented_value: "",
        service_date: new Date().toISOString().split("T")[0],
        expected_payment_date: "",
    });
    const [patients, setPatients] = useState<{ id: string; name: string }[]>([]);

    const loadData = useCallback(async () => {
        if (!clinicId) return;
        setLoading(true);

        try {
            // Carregar guias
            const { data: guidesData, error: guidesError } = await supabase
                .from("insurance_guides")
                .select(`
          *,
          insurance_plan:insurance_plans(name),
          patient:patients(name),
          doctor:doctors(profile:profiles(name))
        `)
                .eq("clinic_id", clinicId)
                .order("created_at", { ascending: false })
                .limit(100);

            if (guidesError) throw guidesError;
            setGuides((guidesData as unknown as InsuranceGuideWithRelations[]) || []);

            // Carregar convênios
            const { data: plansData } = await supabase
                .from("insurance_plans")
                .select("id, name")
                .eq("clinic_id", clinicId)
                .eq("is_active", true);

            setInsurancePlans(plansData || []);

            // Carregar pacientes
            const { data: patientsData } = await supabase
                .from("patients")
                .select("id, name")
                .eq("clinic_id", clinicId)
                .order("name")
                .limit(500);

            setPatients(patientsData || []);
        } catch (error) {
            console.error("Error loading insurance billing:", error);
            toast({
                title: "Erro ao carregar guias",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [clinicId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleCreateGuide = async () => {
        if (!newGuide.insurance_plan_id || !newGuide.patient_id || !newGuide.guide_number) {
            toast({
                title: "Preencha os campos obrigatórios",
                variant: "destructive",
            });
            return;
        }

        try {
            const { error } = await supabase.from("insurance_guides").insert({
                clinic_id: clinicId,
                insurance_plan_id: newGuide.insurance_plan_id,
                patient_id: newGuide.patient_id,
                guide_number: newGuide.guide_number,
                lot_number: newGuide.lot_number || null,
                procedure_code: newGuide.procedure_code || null,
                procedure_name: newGuide.procedure_name || null,
                presented_value: parseFloat(newGuide.presented_value) || 0,
                service_date: newGuide.service_date,
                expected_payment_date: newGuide.expected_payment_date || null,
                status: "DRAFT",
            });

            if (error) throw error;

            toast({ title: "Guia criada com sucesso!" });
            setShowNewGuide(false);
            setNewGuide({
                insurance_plan_id: "",
                patient_id: "",
                guide_number: "",
                lot_number: "",
                procedure_code: "",
                procedure_name: "",
                presented_value: "",
                service_date: new Date().toISOString().split("T")[0],
                expected_payment_date: "",
            });
            loadData();
        } catch (error) {
            toast({
                title: "Erro ao criar guia",
                variant: "destructive",
            });
        }
    };

    const handleUpdateStatus = async (guideId: string, newStatus: GuideStatus) => {
        try {
            const updates: any = { status: newStatus };
            if (newStatus === "SENT") {
                updates.sent_at = new Date().toISOString();
            } else if (newStatus === "PAID") {
                updates.paid_at = new Date().toISOString();
            }

            const { error } = await supabase
                .from("insurance_guides")
                .update(updates)
                .eq("id", guideId);

            if (error) throw error;

            toast({ title: "Status atualizado!" });
            loadData();
        } catch (error) {
            toast({
                title: "Erro ao atualizar status",
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

    const filteredGuides = guides.filter((guide) => {
        const matchesSearch =
            !searchTerm ||
            guide.guide_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            guide.patient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            guide.lot_number?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "all" || guide.status === statusFilter;
        const matchesInsurance =
            insuranceFilter === "all" || guide.insurance_plan_id === insuranceFilter;

        return matchesSearch && matchesStatus && matchesInsurance;
    });

    // Estatísticas
    const totalPresented = guides.reduce((sum, g) => sum + g.presented_value, 0);
    const totalApproved = guides
        .filter((g) => g.status === "APPROVED" || g.status === "PAID")
        .reduce((sum, g) => sum + (g.approved_value || g.presented_value), 0);
    const totalPending = guides
        .filter((g) => ["DRAFT", "SENT", "ANALYZING"].includes(g.status))
        .reduce((sum, g) => sum + g.presented_value, 0);

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
                        <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Apresentado</p>
                            <p className="text-2xl font-bold text-blue-600">
                                {formatCurrency(totalPresented)}
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
                            <p className="text-sm text-gray-500">Aprovado/Pago</p>
                            <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(totalApproved)}
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
                            <p className="text-sm text-gray-500">Em Análise</p>
                            <p className="text-2xl font-bold text-yellow-600">
                                {formatCurrency(totalPending)}
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Botão Nova Guia */}
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Guias de Convênio</h3>
                <Button
                    onClick={() => setShowNewGuide(!showNewGuide)}
                    className="gradient-primary text-white"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Guia
                </Button>
            </div>

            {/* Formulário Nova Guia */}
            {showNewGuide && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="glass-effect rounded-xl p-6"
                >
                    <h4 className="font-semibold text-gray-900 mb-4">Cadastrar Nova Guia</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Convênio *
                            </label>
                            <select
                                value={newGuide.insurance_plan_id}
                                onChange={(e) =>
                                    setNewGuide({ ...newGuide, insurance_plan_id: e.target.value })
                                }
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="">Selecione...</option>
                                {insurancePlans.map((plan) => (
                                    <option key={plan.id} value={plan.id}>
                                        {plan.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Paciente *
                            </label>
                            <select
                                value={newGuide.patient_id}
                                onChange={(e) =>
                                    setNewGuide({ ...newGuide, patient_id: e.target.value })
                                }
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="">Selecione...</option>
                                {patients.map((patient) => (
                                    <option key={patient.id} value={patient.id}>
                                        {patient.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nº da Guia *
                            </label>
                            <input
                                type="text"
                                value={newGuide.guide_number}
                                onChange={(e) =>
                                    setNewGuide({ ...newGuide, guide_number: e.target.value })
                                }
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500"
                                placeholder="Ex: 12345678"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nº do Lote
                            </label>
                            <input
                                type="text"
                                value={newGuide.lot_number}
                                onChange={(e) =>
                                    setNewGuide({ ...newGuide, lot_number: e.target.value })
                                }
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Código TUSS
                            </label>
                            <input
                                type="text"
                                value={newGuide.procedure_code}
                                onChange={(e) =>
                                    setNewGuide({ ...newGuide, procedure_code: e.target.value })
                                }
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500"
                                placeholder="Ex: 40101010"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Procedimento
                            </label>
                            <input
                                type="text"
                                value={newGuide.procedure_name}
                                onChange={(e) =>
                                    setNewGuide({ ...newGuide, procedure_name: e.target.value })
                                }
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500"
                                placeholder="Ex: Consulta médica"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Valor Apresentado
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={newGuide.presented_value}
                                onChange={(e) =>
                                    setNewGuide({ ...newGuide, presented_value: e.target.value })
                                }
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500"
                                placeholder="0,00"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Data do Atendimento
                            </label>
                            <input
                                type="date"
                                value={newGuide.service_date}
                                onChange={(e) =>
                                    setNewGuide({ ...newGuide, service_date: e.target.value })
                                }
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Previsão de Pagamento
                            </label>
                            <input
                                type="date"
                                value={newGuide.expected_payment_date}
                                onChange={(e) =>
                                    setNewGuide({ ...newGuide, expected_payment_date: e.target.value })
                                }
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                        <Button onClick={handleCreateGuide} className="gradient-primary text-white">
                            Salvar Guia
                        </Button>
                        <Button onClick={() => setShowNewGuide(false)} variant="outline">
                            Cancelar
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar por guia, lote ou paciente..."
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
                    {Object.entries(GUIDE_STATUS_LABELS).map(([value, { label }]) => (
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

            {/* Lista de Guias */}
            <div className="space-y-3">
                {filteredGuides.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        Nenhuma guia encontrada
                    </div>
                ) : (
                    filteredGuides.map((guide) => {
                        const statusInfo = GUIDE_STATUS_LABELS[guide.status as GuideStatus];
                        return (
                            <motion.div
                                key={guide.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-effect rounded-xl p-4"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Building2 className="w-5 h-5 text-blue-600" />
                                            <span className="font-semibold text-gray-900">
                                                {guide.insurance_plan?.name}
                                            </span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                                                {statusInfo.label}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                            <span>Guia: {guide.guide_number}</span>
                                            {guide.lot_number && <span>Lote: {guide.lot_number}</span>}
                                            <span>Paciente: {guide.patient?.name}</span>
                                            {guide.procedure_code && (
                                                <span>TUSS: {guide.procedure_code}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-blue-600">
                                                {formatCurrency(guide.presented_value)}
                                            </p>
                                            {guide.approved_value && guide.approved_value !== guide.presented_value && (
                                                <p className="text-xs text-green-600">
                                                    Aprovado: {formatCurrency(guide.approved_value)}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex gap-1">
                                            {guide.status === "DRAFT" && (
                                                <Button
                                                    onClick={() => handleUpdateStatus(guide.id, "SENT")}
                                                    size="sm"
                                                    variant="outline"
                                                    title="Marcar como Enviado"
                                                >
                                                    <Send className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {guide.status === "SENT" && (
                                                <Button
                                                    onClick={() => handleUpdateStatus(guide.id, "ANALYZING")}
                                                    size="sm"
                                                    variant="outline"
                                                    title="Em Análise"
                                                >
                                                    <Clock className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {guide.status === "ANALYZING" && (
                                                <>
                                                    <Button
                                                        onClick={() => handleUpdateStatus(guide.id, "APPROVED")}
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-green-600"
                                                        title="Aprovar"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleUpdateStatus(guide.id, "DENIED")}
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-red-600"
                                                        title="Glosar"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            )}
                                            {guide.status === "APPROVED" && (
                                                <Button
                                                    onClick={() => handleUpdateStatus(guide.id, "PAID")}
                                                    size="sm"
                                                    className="gradient-primary text-white"
                                                    title="Marcar como Pago"
                                                >
                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                    Pago
                                                </Button>
                                            )}
                                        </div>
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

export default InsuranceBilling;
