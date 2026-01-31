import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Save, ClipboardList, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/customSupabaseClient";
import { toast } from "@/components/ui/use-toast";
import { ProtocolStepEditor } from "./ProtocolStepEditor";
import type { Protocol, ProtocolPhase, ProtocolPhaseItem, ProtocolPhaseItemType } from "@/types/database.types";

interface PhaseForm {
    id: string;
    phase_number: number;
    name: string;
    description: string;
    duration_days: number | null;
    items: ItemForm[];
}

interface ItemForm {
    id: string;
    item_type: ProtocolPhaseItemType;
    title: string;
    description: string;
    is_required: boolean;
    order_index: number;
}

interface ProtocolBuilderModalProps {
    clinicId: string;
    doctorId: string;
    existingProtocol?: Protocol & { phases: (ProtocolPhase & { items: ProtocolPhaseItem[] })[] };
    onClose: () => void;
    onSuccess: () => void;
}

export const ProtocolBuilderModal = ({
    clinicId,
    doctorId,
    existingProtocol,
    onClose,
    onSuccess
}: ProtocolBuilderModalProps) => {
    const [saving, setSaving] = useState(false);

    // Form state
    const [name, setName] = useState(existingProtocol?.name || "");
    const [description, setDescription] = useState(existingProtocol?.description || "");
    const [objective, setObjective] = useState(existingProtocol?.objective || "");
    const [durationDays, setDurationDays] = useState<number | "">(existingProtocol?.duration_days || "");
    const [patientType, setPatientType] = useState(existingProtocol?.patient_type || "");
    const [specialty, setSpecialty] = useState(existingProtocol?.specialty || "");

    const [phases, setPhases] = useState<PhaseForm[]>([]);

    // Initialize phases from existing protocol
    useEffect(() => {
        if (existingProtocol?.phases) {
            setPhases(
                existingProtocol.phases.map(phase => ({
                    id: phase.id,
                    phase_number: phase.phase_number,
                    name: phase.name,
                    description: phase.description || "",
                    duration_days: phase.duration_days,
                    items: phase.items.map(item => ({
                        id: item.id,
                        item_type: item.item_type,
                        title: item.title,
                        description: item.description || "",
                        is_required: item.is_required,
                        order_index: item.order_index
                    }))
                }))
            );
        }
    }, [existingProtocol]);

    const addPhase = () => {
        const newPhase: PhaseForm = {
            id: `temp-${Date.now()}`,
            phase_number: phases.length + 1,
            name: `Fase ${phases.length + 1}`,
            description: "",
            duration_days: null,
            items: []
        };
        setPhases([...phases, newPhase]);
    };

    const updatePhase = (index: number, field: keyof PhaseForm, value: any) => {
        const updated = [...phases];
        updated[index] = { ...updated[index], [field]: value };
        setPhases(updated);
    };

    const removePhase = (index: number) => {
        const updated = phases.filter((_, i) => i !== index);
        // Renumber phases
        updated.forEach((phase, i) => phase.phase_number = i + 1);
        setPhases(updated);
    };

    const updatePhaseItems = (phaseIndex: number, items: ItemForm[]) => {
        const updated = [...phases];
        updated[phaseIndex] = { ...updated[phaseIndex], items };
        setPhases(updated);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast({ title: "Nome é obrigatório", variant: "destructive" });
            return;
        }

        if (phases.length === 0) {
            toast({ title: "Adicione pelo menos uma fase", variant: "destructive" });
            return;
        }

        // Check if all phases have names
        const invalidPhases = phases.filter(p => !p.name.trim());
        if (invalidPhases.length > 0) {
            toast({ title: "Todas as fases precisam ter nome", variant: "destructive" });
            return;
        }

        setSaving(true);

        try {
            let protocolId: string;

            if (existingProtocol) {
                // Update existing protocol
                const { error: updateError } = await supabase
                    .from("protocols")
                    .update({
                        name,
                        description: description || null,
                        objective: objective || null,
                        duration_days: durationDays || null,
                        patient_type: patientType || null,
                        specialty: specialty || null,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", existingProtocol.id);

                if (updateError) throw updateError;
                protocolId = existingProtocol.id;

                // Delete existing phases and items
                await supabase
                    .from("protocol_phases")
                    .delete()
                    .eq("protocol_id", protocolId);
            } else {
                // Create new protocol
                const { data: newProtocol, error: createError } = await supabase
                    .from("protocols")
                    .insert({
                        clinic_id: clinicId,
                        created_by: doctorId,
                        name,
                        description: description || null,
                        objective: objective || null,
                        duration_days: durationDays || null,
                        patient_type: patientType || null,
                        specialty: specialty || null
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                protocolId = newProtocol.id;
            }

            // Insert phases
            for (const phase of phases) {
                const { data: newPhase, error: phaseError } = await supabase
                    .from("protocol_phases")
                    .insert({
                        protocol_id: protocolId,
                        phase_number: phase.phase_number,
                        name: phase.name,
                        description: phase.description || null,
                        duration_days: phase.duration_days
                    })
                    .select()
                    .single();

                if (phaseError) throw phaseError;

                // Insert items for this phase
                if (phase.items.length > 0) {
                    const itemsToInsert = phase.items.map(item => ({
                        phase_id: newPhase.id,
                        item_type: item.item_type,
                        title: item.title,
                        description: item.description || null,
                        is_required: item.is_required,
                        order_index: item.order_index
                    }));

                    const { error: itemsError } = await supabase
                        .from("protocol_phase_items")
                        .insert(itemsToInsert);

                    if (itemsError) throw itemsError;
                }
            }

            toast({
                title: existingProtocol
                    ? "Protocolo atualizado com sucesso! ✅"
                    : "Protocolo criado com sucesso! 🎉"
            });
            onSuccess();
        } catch (error: any) {
            toast({
                title: "Erro ao salvar protocolo",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="gradient-primary p-6 text-white flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <ClipboardList className="w-6 h-6" />
                                <h2 className="text-xl font-bold">
                                    {existingProtocol ? "Editar Protocolo" : "Novo Protocolo"}
                                </h2>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="text-white hover:bg-white/20"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nome do Protocolo *
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Ex: Acompanhamento Gestacional, Tratamento Diabetes Tipo 2..."
                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Descrição
                                </label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Descreva brevemente o protocolo..."
                                    rows={2}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none resize-none"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Objetivo
                                </label>
                                <input
                                    type="text"
                                    value={objective}
                                    onChange={e => setObjective(e.target.value)}
                                    placeholder="Qual o objetivo principal deste protocolo?"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Especialidade
                                </label>
                                <input
                                    type="text"
                                    value={specialty}
                                    onChange={e => setSpecialty(e.target.value)}
                                    placeholder="Ex: Cardiologia, Endocrinologia..."
                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tipo de Paciente
                                </label>
                                <input
                                    type="text"
                                    value={patientType}
                                    onChange={e => setPatientType(e.target.value)}
                                    placeholder="Ex: Gestante, Diabético, Cardiopata..."
                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Duração Estimada (dias)
                                </label>
                                <input
                                    type="number"
                                    value={durationDays}
                                    onChange={e => setDurationDays(e.target.value ? parseInt(e.target.value) : "")}
                                    placeholder="Ex: 90"
                                    min="1"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
                                />
                            </div>
                        </div>

                        {/* Phases Section */}
                        <div className="border-t border-gray-200 pt-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900">Fases do Protocolo</h3>
                                <Button
                                    onClick={addPhase}
                                    variant="outline"
                                    className="border-purple-300 text-purple-700 hover:bg-purple-50"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Adicionar Fase
                                </Button>
                            </div>

                            {phases.length === 0 ? (
                                <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                    <AlertTriangle className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                                    <p className="text-gray-600">Nenhuma fase adicionada ainda.</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Clique no botão acima para adicionar a primeira fase do protocolo.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {phases.map((phase, index) => (
                                        <div key={phase.id}>
                                            {/* Phase Name Input */}
                                            <div className="mb-3 flex gap-3">
                                                <input
                                                    type="text"
                                                    value={phase.name}
                                                    onChange={e => updatePhase(index, "name", e.target.value)}
                                                    placeholder="Nome da fase..."
                                                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
                                                />
                                                <input
                                                    type="number"
                                                    value={phase.duration_days || ""}
                                                    onChange={e => updatePhase(index, "duration_days", e.target.value ? parseInt(e.target.value) : null)}
                                                    placeholder="Dias"
                                                    min="1"
                                                    className="w-24 px-3 py-2 border border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
                                                />
                                            </div>

                                            {/* Phase Editor */}
                                            <ProtocolStepEditor
                                                phaseId={phase.id}
                                                phaseName={phase.name}
                                                phaseNumber={phase.phase_number}
                                                items={phase.items}
                                                onUpdateItems={items => updatePhaseItems(index, items)}
                                                onRemovePhase={() => removePhase(index)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                        <Button variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="gradient-primary text-white"
                        >
                            {saving ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Salvar Protocolo
                                </>
                            )}
                        </Button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ProtocolBuilderModal;
