import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Clock, Plus, Trash2, Calendar, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const WEEKDAYS = [
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

const parseDate = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const ManageWorkHoursModal = ({ doctor, clinicId, onClose }) => {
  const [workHours, setWorkHours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newHour, setNewHour] = useState({
    weekday: 1,
    specific_date: '',
    start_time: '08:00',
    end_time: '12:00',
    slot_minutes: 30,
    lunch_start: '',
    lunch_end: '',
  });

  const loadWorkHours = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('doctor_work_hours')
      .select('*')
      .eq('doctor_id', doctor.id);

    if (error) {
      toast({
        title: 'Erro ao carregar horários',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setWorkHours(data);
    }
    setLoading(false);
  }, [doctor.id]);

  useEffect(() => {
    loadWorkHours();
  }, [loadWorkHours]);

  const handleAdd = async () => {
    if (!newHour.start_time || !newHour.end_time) {
      toast({
        title: 'Preencha os horários de início e fim',
        variant: 'destructive',
      });
      return;
    }

    const existing = workHours.find(
      (wh) =>
        (newHour.specific_date
          ? wh.specific_date === newHour.specific_date
          : wh.weekday === newHour.weekday)
    );

    if (existing) {
      toast({
        title: 'Horário já existe',
        description: 'Já existe um horário cadastrado para este dia',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase.from('doctor_work_hours').insert({
      clinic_id: clinicId,
      doctor_id: doctor.id,
      weekday: newHour.weekday,
      specific_date: newHour.specific_date || null,
      start_time: newHour.start_time,
      end_time: newHour.end_time,
      slot_minutes: newHour.slot_minutes,
      lunch_start: newHour.lunch_start || null,
      lunch_end: newHour.lunch_end || null,
    });

    if (error) {
      toast({
        title: 'Erro ao adicionar horário',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Horário adicionado! ✅' });
      setNewHour({
        weekday: 1,
        specific_date: '',
        start_time: '08:00',
        end_time: '12:00',
        slot_minutes: 30,
        lunch_start: '',
        lunch_end: '',
      });
      loadWorkHours();
    }
  };

  const handleDelete = async (id) => {
    const { error } = await supabase
      .from('doctor_work_hours')
      .delete()
      .eq('id', id);
    if (error) {
      toast({
        title: 'Erro ao remover horário',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Horário removido' });
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
              <p className="text-sm text-gray-600">CRM: {doctor.crm}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Adicionar Horário */}
          <div className="glass-effect rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Adicionar Horário</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Dia da Semana */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dia da Semana
                </label>
                <select
                  value={newHour.weekday}
                  onChange={(e) =>
                    setNewHour({
                      ...newHour,
                      weekday: parseInt(e.target.value),
                      specific_date: '',
                    })
                  }
                  disabled={!!newHour.specific_date}
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
                    type="date"
                    value={newHour.specific_date}
                    onChange={(e) => {
                      const selectedDate = e.target.value;
                      if (!selectedDate) {
                        setNewHour({ ...newHour, specific_date: '', weekday: 1 });
                        return;
                      }
                      const localDate = parseDate(selectedDate);
                      const weekday = localDate.getDay();
                      setNewHour({ ...newHour, specific_date: selectedDate, weekday });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200"
                  />
                </div>
              </div>

              {/* Início e Fim */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Início
                </label>
                <input
                  type="time"
                  value={newHour.start_time}
                  onChange={(e) => setNewHour({ ...newHour, start_time: e.target.value })}
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
                  onChange={(e) => setNewHour({ ...newHour, end_time: e.target.value })}
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
                    setNewHour({ ...newHour, slot_minutes: parseInt(e.target.value) })
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

            <Button onClick={handleAdd} className="w-full mt-4 gradient-primary text-white">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>

          {/* Horários Cadastrados */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Horários Cadastrados</h3>
            {loading ? (
              <p>Carregando...</p>
            ) : (
              <div className="space-y-2">
                {workHours.map((wh) => {
                  const day = WEEKDAYS.find((d) => d.value === wh.weekday);
                  const displayDate = wh.specific_date
                    ? parseDate(wh.specific_date).toLocaleDateString('pt-BR')
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
                          {wh.start_time} - {wh.end_time} ({wh.slot_minutes}min)
                        </p>
                        {wh.lunch_start && wh.lunch_end && (
                          <p className="text-xs text-gray-500">
                            🍽 Almoço: {wh.lunch_start} - {wh.lunch_end}
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={() => handleDelete(wh.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
