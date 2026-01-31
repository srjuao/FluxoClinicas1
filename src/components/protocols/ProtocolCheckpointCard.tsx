import { motion } from "framer-motion";
import { Check, Clock, AlertTriangle, SkipForward, FileText, Stethoscope, Calendar, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PatientProtocolCheckpoint, ProtocolPhaseItem, CheckpointStatus } from "@/types/database.types";

interface ProtocolCheckpointCardProps {
    checkpoint: PatientProtocolCheckpoint;
    item: ProtocolPhaseItem;
    onComplete: (checkpointId: string) => void;
    onSkip: (checkpointId: string) => void;
    onAddNote: (checkpointId: string) => void;
    disabled?: boolean;
}

const statusConfig: Record<CheckpointStatus, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
    pending: {
        color: "text-amber-600",
        bg: "bg-amber-50 border-amber-200",
        icon: <Clock className="w-4 h-4" />,
        label: "Pendente"
    },
    completed: {
        color: "text-green-600",
        bg: "bg-green-50 border-green-200",
        icon: <Check className="w-4 h-4" />,
        label: "Concluído"
    },
    skipped: {
        color: "text-gray-500",
        bg: "bg-gray-50 border-gray-200",
        icon: <SkipForward className="w-4 h-4" />,
        label: "Pulado"
    },
    overdue: {
        color: "text-red-600",
        bg: "bg-red-50 border-red-200",
        icon: <AlertTriangle className="w-4 h-4" />,
        label: "Atrasado"
    }
};

const itemTypeIcon: Record<string, React.ReactNode> = {
    orientation: <FileText className="w-4 h-4 text-blue-500" />,
    task: <Check className="w-4 h-4 text-purple-500" />,
    exam: <Stethoscope className="w-4 h-4 text-green-500" />,
    return: <Calendar className="w-4 h-4 text-orange-500" />
};

const itemTypeLabel: Record<string, string> = {
    orientation: "Orientação",
    task: "Tarefa",
    exam: "Exame",
    return: "Retorno"
};

export const ProtocolCheckpointCard = ({
    checkpoint,
    item,
    onComplete,
    onSkip,
    onAddNote,
    disabled = false
}: ProtocolCheckpointCardProps) => {
    const config = statusConfig[checkpoint.status];
    const isActionable = checkpoint.status === "pending" || checkpoint.status === "overdue";

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl border ${config.bg} transition-all hover:shadow-md`}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    {itemTypeIcon[item.item_type]}
                    <span className="text-xs font-medium text-gray-500 uppercase">
                        {itemTypeLabel[item.item_type]}
                    </span>
                    {item.is_required && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                            Obrigatório
                        </span>
                    )}
                </div>
                <div className={`flex items-center gap-1 ${config.color}`}>
                    {config.icon}
                    <span className="text-xs font-medium">{config.label}</span>
                </div>
            </div>

            {/* Content */}
            <h4 className="font-semibold text-gray-900 mb-1">{item.title}</h4>
            {item.description && (
                <p className="text-sm text-gray-600 mb-3">{item.description}</p>
            )}

            {/* Notes */}
            {checkpoint.notes && (
                <div className="bg-white/60 rounded-lg p-2 mb-3 border border-gray-100">
                    <p className="text-xs text-gray-600 italic">{checkpoint.notes}</p>
                </div>
            )}

            {/* Completed info */}
            {checkpoint.completed_at && (
                <p className="text-xs text-gray-500 mb-3">
                    Concluído em: {new Date(checkpoint.completed_at).toLocaleDateString("pt-BR")}
                </p>
            )}

            {/* Actions */}
            {isActionable && !disabled && (
                <div className="flex gap-2 mt-3">
                    <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => onComplete(checkpoint.id)}
                    >
                        <Check className="w-3 h-3 mr-1" />
                        Concluir
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-300"
                        onClick={() => onSkip(checkpoint.id)}
                    >
                        <SkipForward className="w-3 h-3 mr-1" />
                        Pular
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onAddNote(checkpoint.id)}
                    >
                        <MessageSquare className="w-3 h-3" />
                    </Button>
                </div>
            )}
        </motion.div>
    );
};

export default ProtocolCheckpointCard;
