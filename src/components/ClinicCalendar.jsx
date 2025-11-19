
    import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';

const ClinicCalendar = ({ clinicId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).toISOString();
    const lastDayOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

    const { data: appointmentData, error } = await supabase
      .from('appointments')
      .select('id, scheduled_start')
      .eq('clinic_id', clinicId)
      .gte('scheduled_start', firstDayOfMonth)
      .lte('scheduled_start', lastDayOfMonth);

    if (error) {
      toast({ title: 'Erro ao carregar agendamentos', variant: 'destructive' });
    } else {
      const appointmentsByDay = appointmentData.reduce((acc, apt) => {
        const day = new Date(apt.scheduled_start).getDate();
        acc[day] = (acc[day] || 0) + 1;
        return acc;
      }, {});
      setAppointments(appointmentsByDay);
    }
    setLoading(false);
  }, [clinicId, currentDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Add blank days for the start of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const totalAppointments = Object.values(appointments).reduce((sum, count) => sum + count, 0);
  
  return (
    <div className="glass-effect rounded-2xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 capitalize">{monthName}</h3>
        <div className="flex space-x-2">
          <Button onClick={previousMonth} variant="outline" size="sm" disabled={loading}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button onClick={nextMonth} variant="outline" size="sm" disabled={loading}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
          <div key={day} className="text-center font-semibold text-gray-600 text-sm py-2">
            {day}
          </div>
        ))}

        {getDaysInMonth().map((day, index) => {
          const dayAppointmentsCount = day ? appointments[day.getDate()] || 0 : 0;
          const isToday = day && day.toDateString() === new Date().toDateString();

          return (
            <motion.div
              key={index}
              whileHover={day ? { scale: 1.05 } : {}}
              className={`min-h-[80px] p-2 rounded-lg border transition-all ${
                !day ? 'bg-transparent border-transparent' :
                isToday ? 'bg-purple-100 border-purple-300' :
                'bg-white border-gray-200 hover:border-purple-300'
              }`}
            >
              {day && (
                <>
                  <div className="text-sm font-semibold text-gray-900 mb-1">
                    {day.getDate()}
                  </div>
                  {dayAppointmentsCount > 0 && (
                    <div className="text-xs bg-blue-100 text-blue-700 rounded px-1 py-0.5 text-center">
                      {dayAppointmentsCount} agend.
                    </div>
                  )}
                </>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-xl">
        <p className="text-sm text-blue-900">
          <strong>{totalAppointments}</strong> agendamentos neste mês
        </p>
      </div>
    </div>
  );
};

export default ClinicCalendar;
  