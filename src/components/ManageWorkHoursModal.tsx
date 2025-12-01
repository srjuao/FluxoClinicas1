// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Clock, Plus, Trash2, Calendar, Utensils, Edit, Save, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";

const WEEKDAYS = [
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

const parseDate = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
};

// Converte formato ISO (YYYY-MM-DD) para brasileiro (DD/MM/YYYY)
const formatDateToBR = (isoDate) => {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
};

// Converte formato brasileiro (DD/MM/YYYY) para ISO (YYYY-MM-DD)
const formatDateToISO = (brDate) => {
  if (!brDate) return "";
  // Remove caracteres não numéricos
  const cleaned = brDate.replace(/\D/g, "");
  if (cleaned.length !== 8) return "";
  const day = cleaned.substring(0, 2);
  const month = cleaned.substring(2, 4);
  const year = cleaned.substring(4, 8);
  return `${year}-${month}-${day}`;
};

// Valida e formata data no formato brasileiro
const formatDateInput = (value) => {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, "");
  
  // Aplica máscara DD/MM/YYYY
  if (numbers.length <= 2) {
    return numbers;
  } else if (numbers.length <= 4) {
    return `${numbers.substring(0, 2)}/${numbers.substring(2, 4)}`;
  } else {
    return `${numbers.substring(0, 2)}/${numbers.substring(2, 4)}/${numbers.substring(4, 8)}`;
  }
};

// Valida se a data está correta
const isValidDate = (brDate) => {
  const isoDate = formatDateToISO(brDate);
  if (!isoDate || isoDate.length !== 10) return false;
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    year >= 1900 &&
    year <= 2100
  );
};

const ManageWorkHoursModal = ({ doctor, user, clinicId, onClose }) => {
  const [workHours, setWorkHours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [specificDateBR, setSpecificDateBR] = useState(""); // Formato brasileiro para exibição
  const [newHour, setNewHour] = useState({
    weekday: 1,
    specific_date: "",
    start_time: "08:00",
    end_time: "12:00",
    slot_minutes: 30,
    lunch_start: "",
    lunch_end: "",
  });

  const loadWorkHours = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("doctor_work_hours")
      .select("*")
      .eq("doctor_id", doctor.id);

    if (error) {
      toast({
        title: "Erro ao carregar horários",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setWorkHours(data);
    }
    setLoading(false);
  }, [doctor.id]);

  useEffect(() => {
    loadWorkHours();
  }, [loadWorkHours]);

  const resetForm = () => {
    setNewHour({
      weekday: 1,
      specific_date: "",
      start_time: "08:00",
      end_time: "12:00",
      slot_minutes: 30,
      lunch_start: "",
      lunch_end: "",
    });
    setSpecificDateBR("");
    setEditingId(null);
  };

  // Helper para garantir formato de hora correto (HH:MM:SS)
  const formatTime = (timeStr) => {
    if (!timeStr) return null;
    // Se já tem segundos, retorna como está
    if (timeStr.split(":").length === 3) return timeStr;
    // Adiciona segundos se necessário
    return timeStr + ":00";
  };

  const handleAdd = async () => {
    if (!newHour.start_time || !newHour.end_time) {
      toast({
        title: "Preencha os horários de início e fim",
        variant: "destructive",
      });
      return;
    }

    const existing = workHours.find((wh) =>
      wh.id !== editingId &&
      (newHour.specific_date
        ? wh.specific_date === newHour.specific_date
        : wh.weekday === newHour.weekday)
    );

    if (existing) {
      toast({
        title: "Horário já existe",
        description: "Já existe um horário cadastrado para este dia",
        variant: "destructive",
      });
      return;
    }

    if (editingId) {
      // Atualizar horário existente
      const { error } = await supabase
        .from("doctor_work_hours")
        .update({
          weekday: newHour.weekday,
          specific_date: newHour.specific_date || null,
          start_time: formatTime(newHour.start_time),
          end_time: formatTime(newHour.end_time),
          slot_minutes: newHour.slot_minutes,
          lunch_start: formatTime(newHour.lunch_start),
          lunch_end: formatTime(newHour.lunch_end),
        })
        .eq("id", editingId);

      if (error) {
        toast({
          title: "Erro ao atualizar horário",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Horário atualizado! ✅" });
        resetForm();
        loadWorkHours();
      }
    } else {
      // Adicionar novo horário
      const { error } = await supabase.from("doctor_work_hours").insert({
        clinic_id: clinicId,
        doctor_id: doctor.id,
        weekday: newHour.weekday,
        specific_date: newHour.specific_date || null,
        start_time: formatTime(newHour.start_time),
        end_time: formatTime(newHour.end_time),
        slot_minutes: newHour.slot_minutes,
        lunch_start: formatTime(newHour.lunch_start),
        lunch_end: formatTime(newHour.lunch_end),
      });

      if (error) {
        toast({
          title: "Erro ao adicionar horário",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Horário adicionado! ✅" });
        resetForm();
        loadWorkHours();
      }
    }
  };

  const handleEdit = (wh) => {
    setEditingId(wh.id);
    const isoDate = wh.specific_date || "";
    setNewHour({
      weekday: wh.weekday,
      specific_date: isoDate,
      start_time: wh.start_time.substring(0, 5), // Remove segundos se houver
      end_time: wh.end_time.substring(0, 5),
      slot_minutes: wh.slot_minutes,
      lunch_start: wh.lunch_start ? wh.lunch_start.substring(0, 5) : "",
      lunch_end: wh.lunch_end ? wh.lunch_end.substring(0, 5) : "",
    });
    // Converte para formato brasileiro para exibição
    setSpecificDateBR(isoDate ? formatDateToBR(isoDate) : "");
    // Scroll para o formulário
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    const { error } = await supabase
      .from("doctor_work_hours")
      .delete()
      .eq("id", id);
    if (error) {
      toast({
        title: "Erro ao remover horário",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Horário removido" });
      loadWorkHours();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-effect rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full gradient-secondary flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Horários de Trabalho
              </h2>
              <p className="text-sm text-gray-600">
                {user.name} - CRM {doctor.crm}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Adicionar/Editar Horário */}
          <div className="glass-effect rounded-xl p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900">
                {editingId ? "Editar Horário" : "Adicionar Horário"}
              </h3>
              {editingId && (
                <Button
                  onClick={resetForm}
                  variant="outline"
                  size="sm"
                  className="text-gray-600"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancelar Edição
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Dia da Semana */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dia da Semana
                </label>
                <select
                  value={newHour.weekday}
                  onChange={(e) => {
                    setNewHour({
                      ...newHour,
                      weekday: parseInt(e.target.value),
                      specific_date: "",
                    });
                    setSpecificDateBR(""); // Limpa a data específica quando muda o dia da semana
                  }}
                  disabled={!!specificDateBR}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200"
                >
                  {WEEKDAYS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Data específica */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data específica (opcional)
                </label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="DD/MM/AAAA"
                    value={specificDateBR}
                    onChange={(e) => {
                      const formatted = formatDateInput(e.target.value);
                      setSpecificDateBR(formatted);
                      
                      // Converte para ISO quando a data estiver completa e válida
                      if (formatted.length === 10 && isValidDate(formatted)) {
                        const isoDate = formatDateToISO(formatted);
                        const localDate = parseDate(isoDate);
                        if (localDate) {
                          const weekday = localDate.getDay();
                          setNewHour({
                            ...newHour,
                            specific_date: isoDate,
                            weekday,
                          });
                        }
                      } else {
                        // Se a data não está completa ou é inválida, limpa o campo interno
                        setNewHour({
                          ...newHour,
                          specific_date: "",
                          weekday: 1,
                        });
                      }
                    }}
                    maxLength={10}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                {specificDateBR.length === 10 && !isValidDate(specificDateBR) && (
                  <p className="text-xs text-red-500 mt-1">
                    Data inválida. Use o formato DD/MM/AAAA
                  </p>
                )}
              </div>

              {/* Início e Fim */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Início
                </label>
                <input
                  type="time"
                  value={newHour.start_time}
                  onChange={(e) =>
                    setNewHour({ ...newHour, start_time: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fim
                </label>
                <input
                  type="time"
                  value={newHour.end_time}
                  onChange={(e) =>
                    setNewHour({ ...newHour, end_time: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-200"
                />
              </div>

              {/* Intervalo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Intervalo (minutos)
                </label>
                <input
                  type="number"
                  value={newHour.slot_minutes}
                  onChange={(e) =>
                    setNewHour({
                      ...newHour,
                      slot_minutes: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-200"
                  min="15"
                  step="15"
                />
              </div>

              {/* Horário de Almoço */}
              <div className="col-span-2 border-t pt-4 mt-2">
                <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-2">
                  <Utensils className="w-4 h-4" /> Horário de Almoço (opcional)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Início do Almoço
                    </label>
                    <input
                      type="time"
                      value={newHour.lunch_start}
                      onChange={(e) =>
                        setNewHour({ ...newHour, lunch_start: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fim do Almoço
                    </label>
                    <input
                      type="time"
                      value={newHour.lunch_end}
                      onChange={(e) =>
                        setNewHour({ ...newHour, lunch_end: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleAdd}
              className="w-full mt-4 gradient-primary text-white"
            >
              {editingId ? (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </>
              )}
            </Button>
          </div>

          {/* Horários Cadastrados */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">
              Horários Cadastrados
            </h3>
            {loading ? (
              <p>Carregando...</p>
            ) : (
              <div className="space-y-2">
                {workHours.map((wh) => {
                  const day = WEEKDAYS.find((d) => d.value === wh.weekday);
                  const displayDate = wh.specific_date
                    ? parseDate(wh.specific_date).toLocaleDateString("pt-BR")
                    : day?.label;

                  return (
                    <div
                      key={wh.id}
                      className="glass-effect rounded-lg p-3 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {wh.specific_date ? `📅 ${displayDate}` : displayDate}
                        </p>
                        <p className="text-sm text-gray-600">
                          {wh.start_time.substring(0, 5)} - {wh.end_time.substring(0, 5)} ({wh.slot_minutes}min)
                        </p>
                        {wh.lunch_start && wh.lunch_end && (
                          <p className="text-xs text-gray-500">
                            🍽 Almoço: {wh.lunch_start.substring(0, 5)} - {wh.lunch_end.substring(0, 5)}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleEdit(wh)}
                          variant="outline"
                          size="sm"
                          className="text-blue-600 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(wh.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {workHours.length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    Nenhum horário cadastrado
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ManageWorkHoursModal;
