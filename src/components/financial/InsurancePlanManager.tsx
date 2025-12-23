
import { useState, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Check, X } from "lucide-react";
import { supabase } from "@/lib/customSupabaseClient";
import { toast } from "@/components/ui/use-toast";

interface InsurancePlan {
    id: string;
    name: string;
    code: string;
    is_active: boolean;
}

interface InsurancePlanManagerProps {
    clinicId: string;
}

export function InsurancePlanManager({ clinicId }: InsurancePlanManagerProps) {
    const [plans, setPlans] = useState<InsurancePlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<InsurancePlan | null>(null);
    const [formData, setFormData] = useState({ name: "", code: "" });

    useEffect(() => {
        if (clinicId) loadPlans();
    }, [clinicId]);

    async function loadPlans() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("insurance_plans")
                .select("*")
                .eq("clinic_id", clinicId)
                .order("name");

            if (error) throw error;
            setPlans(data || []);
        } catch (error) {
            toast({ title: "Erro ao carregar convênios", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        try {
            if (!formData.name) return;

            const payload = {
                clinic_id: clinicId,
                name: formData.name,
                code: formData.code,
                is_active: true
            };

            let result;
            if (editingPlan) {
                result = await supabase
                    .from("insurance_plans")
                    .update(payload)
                    .eq("id", editingPlan.id);
            } else {
                result = await supabase
                    .from("insurance_plans")
                    .insert(payload);
            }

            if (result.error) throw result.error;

            toast({ title: "Convênio salvo com sucesso!" });
            setIsDialogOpen(false);
            setEditingPlan(null);
            setFormData({ name: "", code: "" });
            loadPlans();
        } catch (error) {
            toast({ title: "Erro ao salvar convênio", variant: "destructive" });
        }
    }

    async function toggleActive(plan: InsurancePlan) {
        try {
            const { error } = await supabase
                .from("insurance_plans")
                .update({ is_active: !plan.is_active })
                .eq("id", plan.id);

            if (error) throw error;
            loadPlans();
        } catch (error) {
            toast({ title: "Erro ao atualizar status", variant: "destructive" });
        }
    }

    function openEdit(plan: InsurancePlan) {
        setEditingPlan(plan);
        setFormData({ name: plan.name, code: plan.code || "" });
        setIsDialogOpen(true);
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Gerenciar Convênios</h3>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => { setEditingPlan(null); setFormData({ name: "", code: "" }); }}>
                            <Plus className="w-4 h-4 mr-2" />
                            Novo Convênio
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingPlan ? "Editar Convênio" : "Novo Convênio"}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nome do Convênio</label>
                                <Input
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ex: Unimed"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Código (Opcional)</label>
                                <Input
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                    placeholder="Código ANS ou interno"
                                />
                            </div>
                            <Button onClick={handleSave} className="w-full">Salvar</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Código</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {plans.map((plan) => (
                            <TableRow key={plan.id}>
                                <TableCell className="font-medium">{plan.name}</TableCell>
                                <TableCell>{plan.code || "-"}</TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs ${plan.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                                        {plan.is_active ? "Ativo" : "Inativo"}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => openEdit(plan)}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => toggleActive(plan)} title={plan.is_active ? "Desativar" : "Ativar"}>
                                            {plan.is_active ? <X className="w-4 h-4 text-red-500" /> : <Check className="w-4 h-4 text-green-500" />}
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {plans.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                    Nenhum convênio cadastrado
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
