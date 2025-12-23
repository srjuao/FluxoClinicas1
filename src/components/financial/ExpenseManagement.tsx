import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
    Receipt,
    Plus,
    Search,
    Trash2,
    Save,
    X,
    CheckCircle,
    Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/customSupabaseClient";
import { toast } from "@/components/ui/use-toast";
import {
    EXPENSE_CATEGORIES,
    PAYMENT_STATUS_LABELS,
    type Expense,
    type ExpenseCategory,
    type ExpenseType,
    type PaymentStatus,
} from "@/types/financial.types";

interface ExpenseManagementProps {
    clinicId: string;
}

const ExpenseManagement: React.FC<ExpenseManagementProps> = ({ clinicId }) => {
    const [loading, setLoading] = useState(true);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [showNewExpense, setShowNewExpense] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [newExpense, setNewExpense] = useState({
        category: "OTHER" as ExpenseCategory,
        expense_type: "ADMINISTRATIVE" as ExpenseType,
        description: "",
        supplier: "",
        amount: "",
        due_date: new Date().toISOString().split("T")[0],
        recurrence: "ONCE",
    });

    const loadData = useCallback(async () => {
        if (!clinicId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("expenses")
                .select("*")
                .eq("clinic_id", clinicId)
                .order("due_date", { ascending: false })
                .limit(100);
            if (error) throw error;
            setExpenses((data as unknown as Expense[]) || []);
        } catch (error) {
            toast({ title: "Erro ao carregar despesas", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [clinicId]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleCreateExpense = async () => {
        if (!newExpense.description || !newExpense.amount) {
            toast({ title: "Preencha descrição e valor", variant: "destructive" });
            return;
        }
        try {
            const { error } = await supabase.from("expenses").insert({
                clinic_id: clinicId,
                category: newExpense.category,
                expense_type: newExpense.expense_type,
                description: newExpense.description,
                supplier: newExpense.supplier || null,
                amount: parseFloat(newExpense.amount),
                due_date: newExpense.due_date,
                recurrence: newExpense.recurrence,
                status: "PENDING",
            });
            if (error) throw error;
            toast({ title: "Despesa cadastrada!" });
            setShowNewExpense(false);
            loadData();
        } catch {
            toast({ title: "Erro ao cadastrar despesa", variant: "destructive" });
        }
    };

    const handleMarkAsPaid = async (id: string) => {
        try {
            await supabase.from("expenses").update({ status: "PAID", paid_at: new Date().toISOString() }).eq("id", id);
            toast({ title: "Despesa paga!" });
            loadData();
        } catch {
            toast({ title: "Erro", variant: "destructive" });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Excluir?")) return;
        try {
            await supabase.from("expenses").delete().eq("id", id);
            loadData();
        } catch {
            toast({ title: "Erro", variant: "destructive" });
        }
    };

    const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

    const filtered = expenses.filter((e) => {
        const matchSearch = !searchTerm || e.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCat = categoryFilter === "all" || e.category === categoryFilter;
        return matchSearch && matchCat;
    });

    const totalPaid = expenses.filter(e => e.status === "PAID").reduce((s, e) => s + e.amount, 0);
    const totalPending = expenses.filter(e => e.status === "PENDING").reduce((s, e) => s + e.amount, 0);

    if (loading) return <div className="text-center py-8">Carregando...</div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-effect rounded-xl p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Pago</p>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
                        </div>
                    </div>
                </motion.div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-effect rounded-xl p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-yellow-500 flex items-center justify-center">
                            <Clock className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Pendente</p>
                            <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPending)}</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Despesas</h3>
                <Button onClick={() => setShowNewExpense(!showNewExpense)} className="gradient-primary text-white">
                    <Plus className="w-4 h-4 mr-2" />Nova Despesa
                </Button>
            </div>

            {showNewExpense && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-effect rounded-xl p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <select value={newExpense.category} onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value as ExpenseCategory })} className="px-3 py-2 rounded-lg border">
                            {EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                        <select value={newExpense.expense_type} onChange={(e) => setNewExpense({ ...newExpense, expense_type: e.target.value as ExpenseType })} className="px-3 py-2 rounded-lg border">
                            <option value="ADMINISTRATIVE">Administrativo</option>
                            <option value="ASSISTENTIAL">Assistencial</option>
                        </select>
                        <input type="text" placeholder="Descrição" value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} className="px-3 py-2 rounded-lg border" />
                        <input type="number" placeholder="Valor" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} className="px-3 py-2 rounded-lg border" />
                        <input type="date" value={newExpense.due_date} onChange={(e) => setNewExpense({ ...newExpense, due_date: e.target.value })} className="px-3 py-2 rounded-lg border" />
                        <div className="flex gap-2">
                            <Button onClick={handleCreateExpense} className="gradient-primary text-white"><Save className="w-4 h-4 mr-1" />Salvar</Button>
                            <Button onClick={() => setShowNewExpense(false)} variant="outline"><X className="w-4 h-4" /></Button>
                        </div>
                    </div>
                </motion.div>
            )}

            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border" />
                </div>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-4 py-2 rounded-lg border">
                    <option value="all">Todas</option>
                    {EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
            </div>

            <div className="space-y-3">
                {filtered.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">Nenhuma despesa</div>
                ) : filtered.map((exp) => {
                    const status = exp.status as PaymentStatus;
                    const statusInfo = PAYMENT_STATUS_LABELS[status];
                    const catLabel = EXPENSE_CATEGORIES.find((c) => c.value === exp.category)?.label;
                    return (
                        <motion.div key={exp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-effect rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Receipt className="w-4 h-4 text-purple-600" />
                                        <span className="font-semibold">{exp.description}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs ${statusInfo.color}`}>{statusInfo.label}</span>
                                    </div>
                                    <div className="flex gap-3 text-sm text-gray-500">
                                        <span>{catLabel}</span>
                                        <span>{new Date(exp.due_date).toLocaleDateString("pt-BR")}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <p className="text-lg font-bold text-purple-600">{formatCurrency(exp.amount)}</p>
                                    {status !== "PAID" && <Button onClick={() => handleMarkAsPaid(exp.id)} size="sm" variant="outline" className="text-green-600"><CheckCircle className="w-4 h-4" /></Button>}
                                    <Button onClick={() => handleDelete(exp.id)} size="sm" variant="outline" className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default ExpenseManagement;
