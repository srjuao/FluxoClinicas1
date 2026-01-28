import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, ClipboardList, Clock, Check, Pause, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/customSupabaseClient";
import { toast } from "@/components/ui/use-toast";
import { ProtocolTimelineView } from "./ProtocolTimelineView";
import { ApplyProtocolModal } from "./ApplyProtocolModal";
import type {
    PatientProtocolWithDetails,
    ProtocolPhaseWithItems,
    Protocol
} from "@/types/database.types";

interface PatientProtocolsTabProps {
    patientId: string;
    clinicId: string;
    doctorId?: string;
}

export const PatientProtocolsTab = ({ patientId, clinicId, doctorId }: PatientProtocolsTabProps) => {
    const [loading, setLoading] = useState(true);
    const [patientProtocols, setPatientProtocols] = useState<PatientProtocolWithDetails[]>([]);
    const [selectedProtocol, setSelectedProtocol] = useState<PatientProtocolWithDetails | null>(null);
    const [phases, setPhases] = useState<ProtocolPhaseWithItems[]>([]);
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const fetchPatientProtocols = async () => {
        setLoading(true);

        const { data, error } = await supabase
            .from("patient_protocols")
            .select(`
        *,
        protocol:protocols(*),
        doctor:doctors(profile:profiles(name)),
        current_phase:protocol_phases(*),
        checkpoints:patient_protocol_checkpoints(*)
      `)
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false });

        if (error) {
            toast({
                title: "Erro ao carregar protocolos",
                description: error.message,
                variant: "destructive"
            });
        } else {
            setPatientProtocols(data || []);

            // Auto-select active protocol
            const active = data?.find(p => p.status === "active");
            if (active) {
                setSelectedProtocol(active);
                fetchProtocolPhases(active.protocol_id);
            }
        }

        setLoading(false);
    };

    const fetchProtocolPhases = async (protocolId: string) => {
        const { data: phasesData } = await supabase
            .from("protocol_phases")
            .select(`
        *,
        items:protocol_phase_items(*)
      `)
            .eq("protocol_id", protocolId)
            .order("phase_number", { ascending: true });

        if (phasesData) {
            setPhases(phasesData);
        }
    };

    useEffect(() => {
        fetchPatientProtocols();
    }, [patientId]);

    const handleCompleteCheckpoint = async (checkpointId: string) => {
        const { error } = await supabase
            .from("patient_protocol_checkpoints")
            .update({
                status: "completed",
                completed_at: new Date().toISOString()
            })
            .eq("id", checkpointId);

        if (error) {
            toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Checkpoint concluído! ✅" });
            fetchPatientProtocols();
        }
    };

    const handleSkipCheckpoint = async (checkpointId: string) => {
        const { error } = await supabase
            .from("patient_protocol_checkpoints")
            .update({ status: "skipped" })
            .eq("id", checkpointId);

        if (error) {
            toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Checkpoint pulado" });
            fetchPatientProtocols();
        }
    };

    const handleAddNote = async (checkpointId: string) => {
        const note = prompt("Adicionar nota:");
        if (!note) return;

        const { error } = await supabase
            .from("patient_protocol_checkpoints")
            .update({ notes: note })
            .eq("id", checkpointId);

        if (error) {
            toast({ title: "Erro ao adicionar nota", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Nota adicionada" });
            fetchPatientProtocols();
        }
    };

    const handleAdvancePhase = async () => {
        if (!selectedProtocol) return;

        const currentPhaseIndex = phases.findIndex(p => p.id === selectedProtocol.current_phase_id);
        const nextPhase = phases[currentPhaseIndex + 1];

        if (!nextPhase) return;

        const { error } = await supabase
            .from("patient_protocols")
            .update({ current_phase_id: nextPhase.id })
            .eq("id", selectedProtocol.id);

        if (error) {
            toast({ title: "Erro ao avançar fase", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Avançado para próxima fase! 🎉" });
            fetchPatientProtocols();
        }
    };

    const handlePauseProtocol = async () => {
        if (!selectedProtocol) return;

        const { error } = await supabase
            .from("patient_protocols")
            .update({ status: "paused", paused_at: new Date().toISOString() })
            .eq("id", selectedProtocol.id);

        if (error) {
            toast({ title: "Erro ao pausar", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Protocolo pausado" });
            fetchPatientProtocols();
        }
    };

    const handleResumeProtocol = async () => {
        if (!selectedProtocol) return;

        const { error } = await supabase
            .from("patient_protocols")
            .update({ status: "active", paused_at: null })
            .eq("id", selectedProtocol.id);

        if (error) {
            toast({ title: "Erro ao retomar", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Protocolo retomado! ▶️" });
            fetchPatientProtocols();
        }
    };

    const handleCompleteProtocol = async () => {
        if (!selectedProtocol) return;

        const { error } = await supabase
            .from("patient_protocols")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("id", selectedProtocol.id);

        if (error) {
            toast({ title: "Erro ao finalizar", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Protocolo finalizado com sucesso! 🎉" });
            fetchPatientProtocols();
        }
    };

    const handleProtocolApplied = () => {
        setShowApplyModal(false);
        fetchPatientProtocols();
    };

    const activeProtocols = patientProtocols.filter(p => p.status === "active" || p.status === "paused");
    const completedProtocols = patientProtocols.filter(p => p.status === "completed" || p.status === "cancelled");

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <ClipboardList className="w-6 h-6 text-purple-600" />
                    <h2 className="text-xl font-bold text-gray-900">Protocolos Clínicos</h2>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setShowHistory(!showHistory)}
                        className={showHistory ? "bg-gray-100" : ""}
                    >
                        <History className="w-4 h-4 mr-2" />
                        Histórico
                    </Button>
                    {doctorId && (
                        <Button
                            onClick={() => setShowApplyModal(true)}
                            className="gradient-primary text-white"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Iniciar Protocolo
                        </Button>
                    )}
                </div>
            </div>

            {/* Active Protocols List */}
            {!selectedProtocol && !showHistory && (
                <div className="space-y-4">
                    {activeProtocols.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-effect rounded-2xl p-8 text-center"
                        >
                            <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Nenhum protocolo ativo
                            </h3>
                            <p className="text-gray-600 mb-4">
                                Este paciente não possui protocolos de tratamento em andamento.
                            </p>
                            {doctorId && (
                                <Button
                                    onClick={() => setShowApplyModal(true)}
                                    className="gradient-primary text-white"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Iniciar Primeiro Protocolo
                                </Button>
                            )}
                        </motion.div>
                    ) : (
                        <div className="grid gap-4">
                            {activeProtocols.map((protocol, index) => (
                                <motion.div
                                    key={protocol.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    onClick={() => {
                                        setSelectedProtocol(protocol);
                                        fetchProtocolPhases(protocol.protocol_id);
                                    }}
                                    className="glass-effect rounded-xl p-5 cursor-pointer hover:shadow-lg transition-all border-2 border-transparent hover:border-purple-200"
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-bold text-gray-900">{protocol.protocol.name}</h3>
                                            <p className="text-sm text-gray-600 mt-1">{protocol.protocol.description}</p>
                                            <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                                                <span>Dr(a). {protocol.doctor?.profile?.name}</span>
                                                <span>•</span>
                                                <span>Iniciado: {new Date(protocol.started_at).toLocaleDateString("pt-BR")}</span>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${protocol.status === "active"
                                                ? "bg-blue-100 text-blue-700"
                                                : "bg-amber-100 text-amber-700"
                                            }`}>
                                            {protocol.status === "active" ? (
                                                <><Clock className="w-3 h-3 inline mr-1" />Em Andamento</>
                                            ) : (
                                                <><Pause className="w-3 h-3 inline mr-1" />Pausado</>
                                            )}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* History View */}
            {showHistory && !selectedProtocol && (
                <div className="space-y-4">
                    <h3 className="font-semibold text-gray-700">Protocolos Finalizados</h3>
                    {completedProtocols.length === 0 ? (
                        <p className="text-gray-500 text-sm">Nenhum protocolo finalizado ainda.</p>
                    ) : (
                        <div className="grid gap-3">
                            {completedProtocols.map((protocol) => (
                                <div
                                    key={protocol.id}
                                    onClick={() => {
                                        setSelectedProtocol(protocol);
                                        fetchProtocolPhases(protocol.protocol_id);
                                    }}
                                    className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-all"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-medium text-gray-900">{protocol.protocol.name}</h4>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(protocol.started_at).toLocaleDateString("pt-BR")} -
                                                {protocol.completed_at && new Date(protocol.completed_at).toLocaleDateString("pt-BR")}
                                            </p>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs ${protocol.status === "completed"
                                                ? "bg-green-100 text-green-700"
                                                : "bg-gray-200 text-gray-600"
                                            }`}>
                                            {protocol.status === "completed" ? "Concluído" : "Cancelado"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Selected Protocol Timeline */}
            {selectedProtocol && (
                <div>
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setSelectedProtocol(null);
                            setShowHistory(false);
                        }}
                        className="mb-4"
                    >
                        ← Voltar para lista
                    </Button>

                    <ProtocolTimelineView
                        patientProtocol={selectedProtocol}
                        phases={phases}
                        onCompleteCheckpoint={handleCompleteCheckpoint}
                        onSkipCheckpoint={handleSkipCheckpoint}
                        onAddNote={handleAddNote}
                        onAdvancePhase={handleAdvancePhase}
                        onPauseProtocol={handlePauseProtocol}
                        onResumeProtocol={handleResumeProtocol}
                        onCompleteProtocol={handleCompleteProtocol}
                    />
                </div>
            )}

            {/* Apply Protocol Modal */}
            {showApplyModal && doctorId && (
                <ApplyProtocolModal
                    patientId={patientId}
                    clinicId={clinicId}
                    doctorId={doctorId}
                    onClose={() => setShowApplyModal(false)}
                    onSuccess={handleProtocolApplied}
                />
            )}
        </div>
    );
};

export default PatientProtocolsTab;
