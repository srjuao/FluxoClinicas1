import { useState } from "react";
import { motion } from "framer-motion";
import { Trash2, GripVertical, FileText, Stethoscope, Calendar, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProtocolPhaseItemType } from "@/types/database.types";

interface PhaseItemForm {
    id: string;
    item_type: ProtocolPhaseItemType;
    title: string;
    description: string;
    is_required: boolean;
    order_index: number;
}

interface ProtocolStepEditorProps {
    phaseId: string;
    phaseName: string;
    phaseNumber: number;
    items: PhaseItemForm[];
    onUpdateItems: (items: PhaseItemForm[]) => void;
    onRemovePhase: () => void;
}

const itemTypeConfig: Record<ProtocolPhaseItemType, { icon: React.ReactNode; label: string; color: string }> = {
    orientation: {
        icon: <FileText className="w-4 h-4" />,
        label: "Orientação",
        color: "bg-blue-100 text-blue-700 border-blue-200"
    },
    task: {
        icon: <Check className="w-4 h-4" />,
        label: "Tarefa",
        color: "bg-purple-100 text-purple-700 border-purple-200"
    },
    exam: {
        icon: <Stethoscope className="w-4 h-4" />,
        label: "Exame",
        color: "bg-green-100 text-green-700 border-green-200"
    },
    return: {
        icon: <Calendar className="w-4 h-4" />,
        label: "Retorno",
        color: "bg-orange-100 text-orange-700 border-orange-200"
    }
};

export const ProtocolStepEditor = ({
    phaseId,
    phaseName,
    phaseNumber,
    items,
    onUpdateItems,
    onRemovePhase
}: ProtocolStepEditorProps) => {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const addItem = (type: ProtocolPhaseItemType) => {
        const newItem: PhaseItemForm = {
            id: `temp-${Date.now()}`,
            item_type: type,
            title: "",
            description: "",
            is_required: false,
            order_index: items.length
        };
        onUpdateItems([...items, newItem]);
    };

    const updateItem = (index: number, field: keyof PhaseItemForm, value: any) => {
        const updated = [...items];
        updated[index] = { ...updated[index], [field]: value };
        onUpdateItems(updated);
    };

    const removeItem = (index: number) => {
        const updated = items.filter((_, i) => i !== index);
        // Reorder remaining items
        updated.forEach((item, i) => item.order_index = i);
        onUpdateItems(updated);
    };

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const updated = [...items];
        const dragged = updated[draggedIndex];
        updated.splice(draggedIndex, 1);
        updated.splice(index, 0, dragged);
        updated.forEach((item, i) => item.order_index = i);

        setDraggedIndex(index);
        onUpdateItems(updated);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
        >
            {/* Phase Header */}
            <div className="bg-gray-50 p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full gradient-primary text-white flex items-center justify-center font-bold">
                            {phaseNumber}
                        </span>
                        <h4 className="font-semibold text-gray-900">{phaseName || `Fase ${phaseNumber}`}</h4>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onRemovePhase}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Items List */}
            <div className="p-4 space-y-3">
                {items.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                        Adicione itens a esta fase usando os botões abaixo
                    </p>
                ) : (
                    items
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((item, index) => (
                            <div
                                key={item.id}
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragEnd={handleDragEnd}
                                className={`border rounded-lg p-3 transition-all ${draggedIndex === index ? "opacity-50 scale-95" : ""
                                    } ${itemTypeConfig[item.item_type].color}`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="cursor-grab pt-1">
                                        <GripVertical className="w-4 h-4 text-gray-400" />
                                    </div>

                                    <div className="flex-1 space-y-2">
                                        {/* Item Type Badge */}
                                        <div className="flex items-center gap-2">
                                            {itemTypeConfig[item.item_type].icon}
                                            <span className="text-xs font-medium uppercase">
                                                {itemTypeConfig[item.item_type].label}
                                            </span>
                                        </div>

                                        {/* Title Input */}
                                        <input
                                            type="text"
                                            value={item.title}
                                            onChange={(e) => updateItem(index, "title", e.target.value)}
                                            placeholder="Título do item..."
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
                                        />

                                        {/* Description Input */}
                                        <textarea
                                            value={item.description}
                                            onChange={(e) => updateItem(index, "description", e.target.value)}
                                            placeholder="Descrição (opcional)..."
                                            rows={2}
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none resize-none"
                                        />

                                        {/* Required Toggle */}
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={item.is_required}
                                                onChange={(e) => updateItem(index, "is_required", e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                            />
                                            <span className="text-xs text-gray-600">Item obrigatório</span>
                                        </label>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeItem(index)}
                                        className="text-gray-400 hover:text-red-500"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                )}
            </div>

            {/* Add Item Buttons */}
            <div className="p-4 bg-gray-50 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Adicionar item:</p>
                <div className="flex flex-wrap gap-2">
                    {(Object.keys(itemTypeConfig) as ProtocolPhaseItemType[]).map((type) => (
                        <Button
                            key={type}
                            variant="outline"
                            size="sm"
                            onClick={() => addItem(type)}
                            className={`${itemTypeConfig[type].color} border`}
                        >
                            {itemTypeConfig[type].icon}
                            <span className="ml-1">{itemTypeConfig[type].label}</span>
                        </Button>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

export default ProtocolStepEditor;
