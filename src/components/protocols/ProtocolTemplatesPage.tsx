import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Search, ClipboardList, Edit2, Trash2, Copy, MoreVertical, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/customSupabaseClient";
import { toast } from "@/components/ui/use-toast";
import { ProtocolBuilderModal } from "./ProtocolBuilderModal";
import type { Protocol, ProtocolPhase, ProtocolPhaseItem } from "@/types/database.types";

interface ProtocolTemplatesPageProps {
    clinicId: string;
    doctorId: string;
}

type FullProtocol = Protocol & {
    phases: (ProtocolPhase & { items: ProtocolPhaseItem[] })[]
};

export const ProtocolTemplatesPage = ({ clinicId, doctorId }: ProtocolTemplatesPageProps) => {
    const [loading, setLoading] = useState(true);
    const [protocols, setProtocols] = useState<FullProtocol[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [showBuilder, setShowBuilder] = useState(false);
    const [editingProtocol, setEditingProtocol] = useState<FullProtocol | null>(null);
    const [showMenuFor, setShowMenuFor] = useState<string | null>(null);

    const fetchProtocols = async () => {
        setLoading(true);

        const { data, error } = await supabase
            .from("protocols")
            .select(`
        *,
        phases:protocol_phases(
          *,
          items:protocol_phase_items(*)
        )
      `)
            .eq("clinic_id", clinicId)
            .order("created_at", { ascending: false });

        if (error) {
            toast({
                title: "Erro ao carregar protocolos",
                description: error.message,
                variant: "destructive"
            });
        } else {
            setProtocols(data || []);
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchProtocols();
    }, [clinicId]);

    const handleEdit = (protocol: FullProtocol) => {
        setEditingProtocol(protocol);
        setShowBuilder(true);
        setShowMenuFor(null);
    };

    const handleDuplicate = async (protocol: FullProtocol) => {
        setShowMenuFor(null);

        try {
            // Create new protocol as copy
            const { data: newProtocol, error: createError } = await supabase
                .from("protocols")
                .insert({
                    clinic_id: clinicId,
                    created_by: doctorId,
                    name: `${protocol.name} (Cópia)`,
                    description: protocol.description,
                    objective: protocol.objective,
                    duration_days: protocol.duration_days,
                    patient_type: protocol.patient_type,
                    specialty: protocol.specialty
                })
                .select()
                .single();

            if (createError) throw createError;

            // Duplicate phases with items
            for (const phase of protocol.phases) {
                const { data: newPhase, error: phaseError } = await supabase
                    .from("protocol_phases")
                    .insert({
                        protocol_id: newProtocol.id,
                        phase_number: phase.phase_number,
                        name: phase.name,
                        description: phase.description,
                        duration_days: phase.duration_days
                    })
                    .select()
                    .single();

                if (phaseError) throw phaseError;

                if (phase.items.length > 0) {
                    const itemsToInsert = phase.items.map(item => ({
                        phase_id: newPhase.id,
                        item_type: item.item_type,
                        title: item.title,
                        description: item.description,
                        is_required: item.is_required,
                        order_index: item.order_index
                    }));

                    const { error: itemsError } = await supabase
                        .from("protocol_phase_items")
                        .insert(itemsToInsert);

                    if (itemsError) throw itemsError;
                }
            }

            toast({ title: "Protocolo duplicado com sucesso! 📋" });
            fetchProtocols();
        } catch (error: any) {
            toast({
                title: "Erro ao duplicar",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    const handleDelete = async (protocolId: string) => {
        if (!confirm("Tem certeza que deseja excluir este protocolo? Esta ação não pode ser desfeita.")) {
            return;
        }

        setShowMenuFor(null);

        const { error } = await supabase
            .from("protocols")
            .delete()
            .eq("id", protocolId);

        if (error) {
            toast({
                title: "Erro ao excluir",
                description: error.message,
                variant: "destructive"
            });
        } else {
            toast({ title: "Protocolo excluído" });
            fetchProtocols();
        }
    };

    const handleToggleActive = async (protocol: FullProtocol) => {
        setShowMenuFor(null);

        const { error } = await supabase
            .from("protocols")
            .update({ is_active: !protocol.is_active })
            .eq("id", protocol.id);

        if (error) {
            toast({
                title: "Erro ao atualizar",
                description: error.message,
                variant: "destructive"
            });
        } else {
            toast({ title: protocol.is_active ? "Protocolo arquivado" : "Protocolo ativado" });
            fetchProtocols();
        }
    };

    const handleBuilderClose = () => {
        setShowBuilder(false);
        setEditingProtocol(null);
    };

    const handleBuilderSuccess = () => {
        handleBuilderClose();
        fetchProtocols();
    };

    const filteredProtocols = protocols.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.specialty?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.patient_type?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeProtocols = filteredProtocols.filter(p => p.is_active);
    const archivedProtocols = filteredProtocols.filter(p => !p.is_active);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Meus Protocolos</h2>
                    <p className="text-gray-600">Gerencie seus templates de protocolos clínicos</p>
                </div>
                <Button
                    onClick={() => setShowBuilder(true)}
                    className="gradient-primary text-white"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Protocolo
                </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Buscar por nome, especialidade ou tipo..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
                />
            </div>

            {/* Loading */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
            ) : protocols.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-effect rounded-2xl p-12 text-center"
                >
                    <ClipboardList className="w-20 h-20 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        Nenhum protocolo criado
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        Crie seu primeiro protocolo para começar a padronizar tratamentos e acompanhar pacientes de forma mais eficiente.
                    </p>
                    <Button
                        onClick={() => setShowBuilder(true)}
                        className="gradient-primary text-white"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Primeiro Protocolo
                    </Button>
                </motion.div>
            ) : (
                <>
                    {/* Active Protocols */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-700">Protocolos Ativos ({activeProtocols.length})</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeProtocols.map((protocol, index) => (
                                <motion.div
                                    key={protocol.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="glass-effect rounded-xl p-5 hover:shadow-lg transition-all relative"
                                >
                                    {/* Menu Button */}
                                    <div className="absolute top-3 right-3">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setShowMenuFor(showMenuFor === protocol.id ? null : protocol.id)}
                                            className="h-8 w-8"
                                        >
                                            <MoreVertical className="w-4 h-4" />
                                        </Button>

                                        {/* Dropdown Menu */}
                                        {showMenuFor === protocol.id && (
                                            <div className="absolute right-0 top-10 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[160px]">
                                                <button
                                                    onClick={() => handleEdit(protocol)}
                                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => handleDuplicate(protocol)}
                                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                    Duplicar
                                                </button>
                                                <button
                                                    onClick={() => handleToggleActive(protocol)}
                                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                >
                                                    <Clock className="w-4 h-4" />
                                                    Arquivar
                                                </button>
                                                <div className="border-t border-gray-100 my-1" />
                                                <button
                                                    onClick={() => handleDelete(protocol.id)}
                                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Excluir
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <h4 className="font-bold text-gray-900 pr-8">{protocol.name}</h4>
                                    {protocol.description && (
                                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{protocol.description}</p>
                                    )}

                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {protocol.specialty && (
                                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                                {protocol.specialty}
                                            </span>
                                        )}
                                        {protocol.patient_type && (
                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                                {protocol.patient_type}
                                            </span>
                                        )}
                                    </div>

                                    {/* Stats */}
                                    <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <ClipboardList className="w-3 h-3" />
                                            {protocol.phases.length} fases
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            {protocol.phases.reduce((acc, p) => acc + p.items.length, 0)} itens
                                        </span>
                                        {protocol.duration_days && (
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {protocol.duration_days} dias
                                            </span>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Archived Protocols */}
                    {archivedProtocols.length > 0 && (
                        <div className="space-y-4 mt-8">
                            <h3 className="font-semibold text-gray-500">Arquivados ({archivedProtocols.length})</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {archivedProtocols.map((protocol) => (
                                    <div
                                        key={protocol.id}
                                        className="bg-gray-50 rounded-xl p-5 opacity-60 hover:opacity-100 transition-all relative"
                                    >
                                        <div className="absolute top-3 right-3">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleToggleActive(protocol)}
                                                className="text-xs"
                                            >
                                                Reativar
                                            </Button>
                                        </div>
                                        <h4 className="font-medium text-gray-700 pr-16">{protocol.name}</h4>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {protocol.phases.length} fases • {protocol.phases.reduce((acc, p) => acc + p.items.length, 0)} itens
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Builder Modal */}
            {showBuilder && (
                <ProtocolBuilderModal
                    clinicId={clinicId}
                    doctorId={doctorId}
                    existingProtocol={editingProtocol || undefined}
                    onClose={handleBuilderClose}
                    onSuccess={handleBuilderSuccess}
                />
            )}
        </div>
    );
};

export default ProtocolTemplatesPage;
