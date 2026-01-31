import { motion } from "framer-motion";
import { ChevronRight, Check, Clock, AlertTriangle, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProtocolCheckpointCard } from "./ProtocolCheckpointCard";
import type {
    PatientProtocolWithDetails,
    ProtocolPhaseWithItems,
    PatientProtocolCheckpoint
} from "@/types/database.types";

interface ProtocolTimelineViewProps {
    patientProtocol: PatientProtocolWithDetails;
    phases: ProtocolPhaseWithItems[];
    onCompleteCheckpoint: (checkpointId: string) => void;
    onSkipCheckpoint: (checkpointId: string) => void;
    onAddNote: (checkpointId: string) => void;
    onAdvancePhase: () => void;
    onPauseProtocol: () => void;
    onResumeProtocol: () => void;
    onCompleteProtocol: () => void;
}

export const ProtocolTimelineView = ({
    patientProtocol,
    phases,
    onCompleteCheckpoint,
    onSkipCheckpoint,
    onAddNote,
    onAdvancePhase,
    onPauseProtocol,
    onResumeProtocol,
    onCompleteProtocol
}: ProtocolTimelineViewProps) => {
    const currentPhaseIndex = phases.findIndex(p => p.id === patientProtocol.current_phase_id);
    const isPaused = patientProtocol.status === "paused";
    const isCompleted = patientProtocol.status === "completed";

    const getPhaseCheckpoints = (phaseId: string): PatientProtocolCheckpoint[] => {
        return patientProtocol.checkpoints.filter(cp => {
            const item = phases.flatMap(p => p.items).find(i => i.id === cp.phase_item_id);
            return item && phases.find(p => p.id === phaseId)?.items.some(i => i.id === cp.phase_item_id);
        });
    };

    const isPhaseComplete = (phase: ProtocolPhaseWithItems): boolean => {
        const checkpoints = getPhaseCheckpoints(phase.id);
        return checkpoints.length > 0 && checkpoints.every(cp =>
            cp.status === "completed" || cp.status === "skipped"
        );
    };

    const getPhaseStatus = (phase: ProtocolPhaseWithItems, index: number) => {
        if (index < currentPhaseIndex) return "completed";
        if (index === currentPhaseIndex) {
            if (isPhaseComplete(phase)) return "ready";
            return "active";
        }
        return "pending";
    };

    return (
        <div className="space-y-6">
            {/* Protocol Header */}
            <div className="glass-effect rounded-2xl p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            {patientProtocol.protocol.name}
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            {patientProtocol.protocol.description}
                        </p>
                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                            <span>Iniciado: {new Date(patientProtocol.started_at).toLocaleDateString("pt-BR")}</span>
                            {patientProtocol.protocol.duration_days && (
                                <span>Duração: {patientProtocol.protocol.duration_days} dias</span>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {!isCompleted && (
                            <>
                                {isPaused ? (
                                    <Button
                                        onClick={onResumeProtocol}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        <Play className="w-4 h-4 mr-2" />
                                        Retomar
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={onPauseProtocol}
                                        variant="outline"
                                        className="border-amber-300 text-amber-700 hover:bg-amber-50"
                                    >
                                        <Pause className="w-4 h-4 mr-2" />
                                        Pausar
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Status Badge */}
                <div className="mt-4">
                    {isCompleted ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                            <Check className="w-4 h-4" />
                            Protocolo Concluído
                        </span>
                    ) : isPaused ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                            <Pause className="w-4 h-4" />
                            Protocolo Pausado
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                            <Clock className="w-4 h-4" />
                            Em Andamento - Fase {currentPhaseIndex + 1} de {phases.length}
                        </span>
                    )}
                </div>
            </div>

            {/* Timeline */}
            <div className="relative">
                {/* Vertical Line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

                {phases.map((phase, index) => {
                    const status = getPhaseStatus(phase, index);
                    const checkpoints = getPhaseCheckpoints(phase.id);
                    const isCurrentPhase = index === currentPhaseIndex;
                    const canAdvance = isCurrentPhase && isPhaseComplete(phase) && !isPaused && !isCompleted;

                    return (
                        <motion.div
                            key={phase.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="relative pl-16 pb-8"
                        >
                            {/* Phase Indicator */}
                            <div
                                className={`absolute left-3 w-7 h-7 rounded-full flex items-center justify-center border-2 ${status === "completed"
                                        ? "bg-green-500 border-green-500 text-white"
                                        : status === "active" || status === "ready"
                                            ? "bg-blue-500 border-blue-500 text-white"
                                            : "bg-white border-gray-300 text-gray-400"
                                    }`}
                            >
                                {status === "completed" ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    <span className="text-xs font-bold">{index + 1}</span>
                                )}
                            </div>

                            {/* Phase Card */}
                            <div
                                className={`rounded-xl p-5 transition-all ${isCurrentPhase
                                        ? "glass-effect border-2 border-blue-200 shadow-lg"
                                        : status === "completed"
                                            ? "bg-green-50/50 border border-green-100"
                                            : "bg-gray-50/50 border border-gray-100"
                                    }`}
                            >
                                {/* Phase Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="font-bold text-gray-900">{phase.name}</h3>
                                        {phase.description && (
                                            <p className="text-sm text-gray-600 mt-1">{phase.description}</p>
                                        )}
                                        {phase.duration_days && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                Duração estimada: {phase.duration_days} dias
                                            </p>
                                        )}
                                    </div>
                                    {canAdvance && index < phases.length - 1 && (
                                        <Button
                                            onClick={onAdvancePhase}
                                            className="bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                            Avançar Fase
                                            <ChevronRight className="w-4 h-4 ml-1" />
                                        </Button>
                                    )}
                                    {canAdvance && index === phases.length - 1 && (
                                        <Button
                                            onClick={onCompleteProtocol}
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                        >
                                            Finalizar Protocolo
                                            <Check className="w-4 h-4 ml-1" />
                                        </Button>
                                    )}
                                </div>

                                {/* Checkpoints */}
                                {(isCurrentPhase || status === "completed") && phase.items.length > 0 && (
                                    <div className="space-y-3 mt-4">
                                        {phase.items
                                            .sort((a, b) => a.order_index - b.order_index)
                                            .map((item) => {
                                                const checkpoint = checkpoints.find(cp => cp.phase_item_id === item.id);
                                                if (!checkpoint) return null;

                                                return (
                                                    <ProtocolCheckpointCard
                                                        key={checkpoint.id}
                                                        checkpoint={checkpoint}
                                                        item={item}
                                                        onComplete={onCompleteCheckpoint}
                                                        onSkip={onSkipCheckpoint}
                                                        onAddNote={onAddNote}
                                                        disabled={isPaused || isCompleted || !isCurrentPhase}
                                                    />
                                                );
                                            })}
                                    </div>
                                )}

                                {/* Pending Phase Summary */}
                                {status === "pending" && (
                                    <div className="text-sm text-gray-500 italic">
                                        {phase.items.length} itens nesta fase
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default ProtocolTimelineView;
