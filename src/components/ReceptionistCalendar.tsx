// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/customSupabaseClient";
import { toast } from "@/components/ui/use-toast";

const ReceptionistCalendar = ({ clinicId }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [doctors, setDoctors] = useState([]);

  const [appointments, setAppointments] = useState([]);
  const [workHours, setWorkHours] = useState([]);
  const [loading, setLoading] = useState(true);

  // Função para formatar data sem UTC

  const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Carregar dados: médicos, horários e agendamentos
  const loadData = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);

    const dateStr = getLocalDateString(selectedDate);
    const weekday = selectedDate.getDay();

    const [
      { data: doctorsData, error: doctorsError },
      { data: appointmentsData, error: appointmentsError },
      { data: workHoursData, error: workHoursError },
    ] = await Promise.all([
      supabase
        .from("doctors")
        .select("*, profile:profiles(name)")
        .eq("clinic_id", clinicId),
      supabase
        .from("appointments")
        .select("*")
        .eq("clinic_id", clinicId)
        .gte("scheduled_start", `${dateStr}T00:00:00`)
        .lte("scheduled_start", `${dateStr}T23:59:59`),
      supabase.from("doctor_work_hours").select("*").eq("clinic_id", clinicId),
    ]);

    if (doctorsError || appointmentsError || workHoursError) {
      toast({
        title: "Erro ao carregar dados da agenda",
        variant: "destructive",
      });
    } else {
      setDoctors(doctorsData);
      setAppointments(appointmentsData);
      setWorkHours(workHoursData);
    }

    setLoading(false);
  }, [clinicId, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Pega horários de um médico para a data selecionada
  const getDoctorWorkHours = (doctorId) => {
    const dateStr = getLocalDateString(selectedDate);

    // Primeiro, horários específicos para a data
    const specific = workHours.find(
      (wh) => wh.doctor_id === doctorId && wh.specific_date === dateStr
    );
    if (specific) return specific;

    // Depois, horários do dia da semana
    return workHours.find(
      (wh) => wh.doctor_id === doctorId && wh.weekday === selectedDate.getDay()
    );
  };

  // Gera os horários em intervalos definidos
  const generateTimeSlots = (workHour) => {
    if (!workHour) return [];
    const slots = [];
    const [startHour, startMin] = workHour.start_time.split(":").map(Number);
    const [endHour, endMin] = workHour.end_time.split(":").map(Number);

    let currentTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    while (currentTime < endTime) {
      const hour = Math.floor(currentTime / 60);
      const min = currentTime % 60;
      slots.push(
        `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`
      );
      currentTime += workHour.slot_minutes;
    }
    return slots;
  };

  // Verifica se o horário já está reservado
  const isSlotBooked = (doctorId, timeStr) => {
    const date = new Date(`${getLocalDateString(selectedDate)}T${timeStr}:00`);
    return appointments.some(
      (apt) =>
        apt.doctor_id === doctorId &&
        new Date(apt.scheduled_start).getTime() === date.getTime()
    );
  };

  const previousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const nextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  return (
    <div className="glass-effect rounded-2xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900">
          {selectedDate.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </h3>
        <div className="flex space-x-2">
          <Button
            onClick={previousDay}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            onClick={nextDay}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map((doctor, index) => {
            const workHour = getDoctorWorkHours(doctor.id);
            const timeSlots = generateTimeSlots(workHour);

            return (
              <motion.div
                key={doctor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-effect rounded-xl p-4"
              >
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900">
                    {doctor.profile?.name}
                  </h4>
                  <p className="text-sm text-gray-600">CRM: {doctor.crm}</p>
                </div>

                {workHour ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {timeSlots.map((time) => {
                      const booked = isSlotBooked(doctor.id, time);
                      return (
                        <div
                          key={time}
                          className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                            booked
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <Clock className="w-3 h-3" />
                            <span>{time}</span>
                          </div>
                          <span className="text-xs font-semibold">
                            {booked ? "Ocupado" : "Livre"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    Sem horários neste dia
                  </div>
                )}
              </motion.div>
            );
          })}

          {doctors.length === 0 && !loading && (
            <div className="col-span-full text-center py-12">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                Nenhum médico cadastrado para esta clínica
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReceptionistCalendar;
