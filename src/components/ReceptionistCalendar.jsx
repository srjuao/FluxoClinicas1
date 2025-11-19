// ======================== ReceptionistCalendar.jsx (PLANNER SEMANAL) ========================

import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/customSupabaseClient";

// Dias da semana
const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const ReceptionistCalendar = ({ clinicId, doctorId }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [workHours, setWorkHours] = useState([]);
  const [loading, setLoading] = useState(true);

  // ----------------- Funções de Datas -----------------
  const startOfWeek = (date) => {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    return d;
  };

  const getLocalDateString = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  };

  // ----------------- Gerar Horários -----------------
  const generateTimeSlots = (workHour) => {
    if (!workHour) return [];

    const slots = [];
    const [startH, startM] = workHour.start_time.split(":").map(Number);
    const [endH, endM] = workHour.end_time.split(":").map(Number);

    let current = startH * 60 + startM;
    const end = endH * 60 + endM;

    while (current < end) {
      const h = Math.floor(current / 60);
      const m = current % 60;

      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      current += workHour.slot_minutes;
    }

    return slots;
  };

  // ----------------- Carregar dados da semana -----------------
  const loadData = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);

    const weekStart = startOfWeek(selectedDate);
    const weekEnd = addDays(weekStart, 6);

    const startStr = `${getLocalDateString(weekStart)}T00:00:00`;
    const endStr = `${getLocalDateString(weekEnd)}T23:59:59`;

    const [{ data: appointmentsData }, { data: workHoursData }] = await Promise.all([
      supabase
        .from("appointments")
        .select("*")
        .eq("clinic_id", clinicId)
        .gte("scheduled_start", startStr)
        .lte("scheduled_start", endStr),

      supabase.from("doctor_work_hours").select("*").eq("clinic_id", clinicId)
    ]);

    setAppointments(appointmentsData || []);
    setWorkHours(workHoursData || []);
    setLoading(false);
  }, [clinicId, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ----------------- Work Hours por médico -----------------
  const getDoctorWorkHours = (doctorId, date) => {
    if (!doctorId) return null;

    const dateStr = getLocalDateString(date);
    const weekday = date.getDay();

    const specific = workHours.find(
      (wh) => wh.doctor_id === doctorId && wh.specific_date === dateStr
    );
    if (specific) return specific;

    return workHours.find((wh) => wh.doctor_id === doctorId && wh.weekday === weekday);
  };

  // ----------------- Verificar agendamentos -----------------
  const isBooked = (doctorId, date, timeStr) => {
    if (!doctorId) return false;

    const dt = new Date(`${getLocalDateString(date)}T${timeStr}:00`);
    return appointments.some(
      (apt) =>
        apt.doctor_id === doctorId &&
        new Date(apt.scheduled_start).getTime() === dt.getTime()
    );
  };

  // ----------------- Semana Selecionada -----------------
  const previousWeek = () => setSelectedDate(addDays(selectedDate, -7));
  const nextWeek = () => setSelectedDate(addDays(selectedDate, 7));

  const weekStart = startOfWeek(selectedDate);
  const weekDays = [...Array(7)].map((_, i) => addDays(weekStart, i));

  const workHour = doctorId ? getDoctorWorkHours(doctorId, selectedDate) : null;
  const allSlots = workHour ? generateTimeSlots(workHour) : [];

  return (
    <div className="glass-effect rounded-2xl p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold">{`Semana de ${weekStart.toLocaleDateString(
          "pt-BR"
        )}`}</h3>

        <div className="flex space-x-2">
          <Button onClick={previousWeek} variant="outline" size="sm" disabled={loading}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button onClick={nextWeek} variant="outline" size="sm" disabled={loading}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-purple-600 mx-auto" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          {/* GRID SEMANAL */}
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-left text-gray-700">Horário</th>
                {weekDays.map((day, idx) => (
                  <th key={idx} className="p-2 text-center text-gray-700">
                    {weekdays[day.getDay()]} <br />
                    <span className="text-xs text-gray-500">{day.toLocaleDateString("pt-BR")}</span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {allSlots.map((time) => (
                <tr key={time} className="border-t">
                  <td className="p-2 font-medium text-gray-800">{time}</td>

                  {weekDays.map((day, idx) => {
                    const booked = isBooked(doctorId, day, time);

                    return (
                      <td key={idx} className="p-2">
                        <div
                          className={`p-2 rounded-lg text-center text-sm flex items-center justify-center gap-2 ${
                            booked
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {booked ? "Ocupado" : "Livre"}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {allSlots.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center py-6 text-gray-500">
                    Este médico não possui horários configurados para esta semana.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ReceptionistCalendar;
