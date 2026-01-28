import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, ClipboardList, ChevronRight, FileText, Stethoscope, Calendar, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/customSupabaseClient";
import { toast } from "@/components/ui/use-toast";
import type { Protocol, ProtocolPhaseWithItems } from "@/types/database.types";

interface ApplyProtocolModalProps {
    patientId: string;
    clinicId: string;
    doctorId: string;
    onClose: () => void;
    onSuccess: () => void;
}

const itemTypeIcon: Record<string, React.ReactNode> = {
    orientation: <FileText className="w-3 h-3 text-blue-500" />,
    task: <Check className="w-3 h-3 text-purple-500" />,
    exam: <Stethoscope className="w-3 h-3 text-green-500" />,
    return: <Calendar className="w-3 h-3 text-orange-500" />
};

export const ApplyProtocolModal = ({
    patientId,
    clinicId,
    doctorId,
    onClose,
    onSuccess
}: ApplyProtocolModalProps) => {
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);
    const [protocols, setProtocols] = useState<Protocol[]>([]);
    const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
    const [phases, setPhases] = useState<ProtocolPhaseWithItems[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [notes, setNotes] = useState("");

    useEffect(() => {
        fetchProtocols();
    }, [clinicId]);

    const fetchProtocols = async () => {
        setLoading(true);

        const { data, error } = await supabase
            .from("protocols")
            .select("*")
            .eq("clinic_id", clinicId)
            .eq("is_active", true)
            .order("name", { ascending: true });

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

    const fetchProtocolPhases = async (protocolId: string) => {
        const { data } = await supabase
            .from("protocol_phases")
            .select(`
        *,
        items:protocol_phase_items(*)
      `)
            .eq("protocol_id", protocolId)
            .order("phase_number", { ascending: true });

        if (data) {
            setPhases(data);
        }
    };

    const handleSelectProtocol = (protocol: Protocol) => {
        setSelectedProtocol(protocol);
        fetchProtocolPhases(protocol.id);
    };

    const handleApplyProtocol = async () => {
        if (!selectedProtocol || phases.length === 0) return;

        setApplying(true);

        try {
            // 1. Create patient_protocol record
            const { data: patientProtocol, error: protocolError } = await supabase
                .from("patient_protocols")
                .insert({
                    patient_id: patientId,
                    protocol_id: selectedProtocol.id,
                    doctor_id: doctorId,
                    clinic_id: clinicId,
                    status: "active",
                    current_phase_id: phases[0].id,
                    notes: notes || null
                })
                .select()
                .single();

            if (protocolError) throw protocolError;

            // 2. Create checkpoints for all items
            const checkpoints = phases.flatMap(phase =>
                phase.items.map(item => ({
                    patient_protocol_id: patientProtocol.id,
                    phase_item_id: item.id,
                    status: "pending"
                }))
            );

            if (checkpoints.length > 0) {
                const { error: checkpointsError } = await supabase
                    .from("patient_protocol_checkpoints")
                    .insert(checkpoints);

                if (checkpointsError) throw checkpointsError;
            }

            toast({ title: "Protocolo iniciado com sucesso! 🎉" });
            onSuccess();
        } catch (error: any) {
            toast({
                title: "Erro ao aplicar protocolo",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setApplying(false);
        }
    };

    const filteredProtocols = protocols.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.specialty?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.patient_type?.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="gradient-primary p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <ClipboardList className="w-6 h-6" />
                                <h2 className="text-xl font-bold">Iniciar Protocolo</h2>
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

                    <div className="flex h-[calc(90vh-120px)]">
                        {/* Left Panel - Protocol List */}
                        <div className="w-1/2 border-r border-gray-200 flex flex-col">
                            <div className="p-4 border-b border-gray-100">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Buscar protocolo..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4">
                                {loading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                                    </div>
                                ) : filteredProtocols.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>Nenhum protocolo encontrado</p>
                                        <p className="text-sm mt-1">Crie um protocolo primeiro no menu "Protocolos"</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {filteredProtocols.map(protocol => (
                                            <div
                                                key={protocol.id}
                                                onClick={() => handleSelectProtocol(protocol)}
                                                className={`p-4 rounded-xl cursor-pointer transition-all ${selectedProtocol?.id === protocol.id
                                                        ? "bg-purple-50 border-2 border-purple-300"
                                                        : "bg-gray-50 border-2 border-transparent hover:border-gray-200"
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-semibold text-gray-900">{protocol.name}</h4>
                                                    <ChevronRight className={`w-4 h-4 transition-transform ${selectedProtocol?.id === protocol.id ? "rotate-90 text-purple-600" : "text-gray-400"
                                                        }`} />
                                                </div>
                                                {protocol.description && (
                                                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{protocol.description}</p>
                                                )}
                                                <div className="flex gap-2 mt-2">
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
                                                    {protocol.duration_days && (
                                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                                            {protocol.duration_days} dias
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Panel - Preview & Apply */}
                        <div className="w-1/2 flex flex-col">
                            {!selectedProtocol ? (
                                <div className="flex-1 flex items-center justify-center text-gray-500">
                                    <div className="text-center">
                                        <ClipboardList className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                        <p>Selecione um protocolo para ver os detalhes</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex-1 overflow-y-auto p-4">
                                        {/* Protocol Info */}
                                        <div className="mb-6">
                                            <h3 className="text-lg font-bold text-gray-900">{selectedProtocol.name}</h3>
                                            {selectedProtocol.objective && (
                                                <p className="text-sm text-gray-600 mt-2">
                                                    <strong>Objetivo:</strong> {selectedProtocol.objective}
                                                </p>
                                            )}
                                        </div>

                                        {/* Phases Preview */}
                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-gray-700">Fases do Tratamento</h4>
                                            {phases.map((phase, index) => (
                                                <div key={phase.id} className="bg-gray-50 rounded-lg p-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">
                                                            {index + 1}
                                                        </span>
                                                        <h5 className="font-medium text-gray-900">{phase.name}</h5>
                                                        {phase.duration_days && (
                                                            <span className="text-xs text-gray-500">({phase.duration_days} dias)</span>
                                                        )}
                                                    </div>
                                                    {phase.items.length > 0 && (
                                                        <div className="ml-8 space-y-1">
                                                            {phase.items.sort((a, b) => a.order_index - b.order_index).map(item => (
                                                                <div key={item.id} className="flex items-center gap-2 text-sm text-gray-600">
                                                                    {itemTypeIcon[item.item_type]}
                                                                    <span>{item.title}</span>
                                                                    {item.is_required && (
                                                                        <span className="text-xs text-red-500">*</span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Notes */}
                                        <div className="mt-6">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Notas Iniciais (opcional)
                                            </label>
                                            <textarea
                                                value={notes}
                                                onChange={e => setNotes(e.target.value)}
                                                placeholder="Observações sobre o início do tratamento..."
                                                className="w-full p-3 border border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none resize-none"
                                                rows={3}
                                            />
                                        </div>
                                    </div>

                                    {/* Apply Button */}
                                    <div className="p-4 border-t border-gray-200">
                                        <Button
                                            onClick={handleApplyProtocol}
                                            disabled={applying || phases.length === 0}
                                            className="w-full gradient-primary text-white py-3"
                                        >
                                            {applying ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                    Iniciando...
                                                </>
                                            ) : (
                                                <>
                                                    <ClipboardList className="w-4 h-4 mr-2" />
                                                    Iniciar Protocolo para este Paciente
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ApplyProtocolModal;
