// ======================== ReceptionistCalendar2.jsx (GOOGLE CALENDAR STYLE) ========================

import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar, Clock, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/customSupabaseClient";

const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const weekdaysFull = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const statusColors = {
  SCHEDULED: { bg: "bg-blue-500", text: "text-white", label: "Agendado" },
  CONFIRMED: { bg: "bg-green-500", text: "text-white", label: "Confirmado" },
  COMPLETED: { bg: "bg-gray-500", text: "text-white", label: "Concluído" },
  CANCELLED: { bg: "bg-red-500", text: "text-white", label: "Cancelado" },
  NO_SHOW: { bg: "bg-orange-500", text: "text-white", label: "Faltou" }
};

const ReceptionistCalendar = ({ clinicId, doctorId }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [workHours, setWorkHours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState("week"); // "week" or "day"
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [patients, setPatients] = useState({});

  // ----------------- Date Utilities -----------------
  const startOfWeek = (date) => {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
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

  const isSameDay = (d1, d2) => {
    return getLocalDateString(d1) === getLocalDateString(d2);
  };

  // ----------------- Generate Time Slots -----------------
  const generateTimeSlots = () => {
    const slots = [];
    for (let h = 6; h < 22; h++) {
      slots.push(`${String(h).padStart(2, "0")}:00`);
      slots.push(`${String(h).padStart(2, "0")}:30`);
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // ----------------- Load Data -----------------
  const loadData = useCallback(async () => {
    try {
    if (!clinicId || !doctorId) return;
    setLoading(true);

    const weekStart = startOfWeek(selectedDate);
    const weekEnd = addDays(weekStart, 6);

    const startStr = `${getLocalDateString(weekStart)}T00:00:00`;
    const endStr = `${getLocalDateString(weekEnd)}T23:59:59`;
    console.log(startStr, endStr);

    const [{ data: appointmentsData }, { data: workHoursData }] = await Promise.all([
      supabase
        .from("appointments")
        .select("*, patients(id, name, cpf)")
        .eq("clinic_id", clinicId)
        // .eq("doctor_id", doctorId)
        .gte("scheduled_start", startStr)
        .lte("scheduled_start", endStr)
        .order("scheduled_start", { ascending: true }),

      supabase
        .from("doctor_work_hours")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("doctor_id", doctorId)
    ]);

    console.log(appointmentsData, workHoursData);

    setAppointments(appointmentsData || []);
    setWorkHours(workHoursData || []);
    
    // Build patient map
    const patientMap = {};
    (appointmentsData || []).forEach(apt => {
      if (apt.patients) {
        patientMap[apt.patient_id] = apt.patients;
      }
    });
    setPatients(patientMap);
    console.log(patientMap);
    
    setLoading(false);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setLoading(false);
    }
  }, [clinicId, doctorId, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ----------------- Get Work Hours -----------------
  const getDoctorWorkHours = (date) => {
    const dateStr = getLocalDateString(date);
    const weekday = date.getDay();

    const specific = workHours.find(
      (wh) => wh.specific_date === dateStr
    );
    if (specific) return specific;

    return workHours.find((wh) => wh.weekday === weekday);
  };

  // ----------------- Get Appointments for Day/Time -----------------
  const getAppointmentsForSlot = (date, timeStr) => {
    const slotTime = new Date(`${getLocalDateString(date)}T${timeStr}:00`);
    
    return appointments.filter(apt => {
      const aptStart = new Date(apt.scheduled_start);
      const aptEnd = new Date(apt.scheduled_end);
      
      return aptStart <= slotTime && slotTime < aptEnd;
    });
  };

  const getAppointmentsForDay = (date) => {
    return appointments.filter(apt => {
      const aptStart = new Date(apt.scheduled_start);
      return isSameDay(aptStart, date);
    });
  };

  // ----------------- Calculate Appointment Position -----------------
  const calculateAppointmentStyle = (appointment, date) => {
    const aptStart = new Date(appointment.scheduled_start);
    const aptEnd = new Date(appointment.scheduled_end);
    
    const startHour = aptStart.getHours();
    const startMin = aptStart.getMinutes();
    const endHour = aptEnd.getHours();
    const endMin = aptEnd.getMinutes();
    
    const startMinutes = (startHour - 6) * 60 + startMin;
    const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    
    const slotHeight = 48; // Height of each 30-min slot in pixels
    const top = (startMinutes / 30) * slotHeight;
    const height = (duration / 30) * slotHeight;
    
    return { top, height };
  };

  // ----------------- Navigation -----------------
  const previousWeek = () => setSelectedDate(addDays(selectedDate, -7));
  const nextWeek = () => setSelectedDate(addDays(selectedDate, 7));
  const previousDay = () => setSelectedDate(addDays(selectedDate, -1));
  const nextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const goToToday = () => setSelectedDate(new Date());

  const weekStart = startOfWeek(selectedDate);
  const weekDays = [...Array(7)].map((_, i) => addDays(weekStart, i));
  const daysToShow = viewMode === "week" ? weekDays : [selectedDate];

  // ----------------- Render Appointment Card -----------------
  const renderAppointmentCard = (apt, style = {}) => {
    const status = statusColors[apt.status] || statusColors.SCHEDULED;
    const patient = patients[apt.patient_id];
    const aptStart = new Date(apt.scheduled_start);
    const aptEnd = new Date(apt.scheduled_end);
    
    return (
      <div
        key={apt.id}
        className={`absolute left-1 right-1 ${status.bg} ${status.text} rounded-lg p-2 cursor-pointer hover:opacity-90 transition-opacity overflow-hidden shadow-md border-l-4 border-white`}
        style={style}
        onClick={() => setSelectedAppointment(apt)}
      >
        <div className="text-xs font-semibold">
          {aptStart.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} - 
          {aptEnd.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="text-sm font-bold truncate">
          {patient?.name || "Paciente"}
        </div>
        <div className="text-xs opacity-90">
          {status.label}
        </div>
      </div>
    );
  };

  // ----------------- Appointment Detail Modal -----------------
  const renderAppointmentModal = () => {
    if (!selectedAppointment) return null;
    
    const apt = selectedAppointment;
    const patient = patients[apt.patient_id];
    const status = statusColors[apt.status] || statusColors.SCHEDULED;
    const aptStart = new Date(apt.scheduled_start);
    const aptEnd = new Date(apt.scheduled_end);
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedAppointment(null)}>
        <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold text-gray-900">Detalhes da Consulta</h3>
            <button onClick={() => setSelectedAppointment(null)} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-3">
            <div className={`${status.bg} ${status.text} px-3 py-2 rounded-lg text-center font-semibold`}>
              {status.label}
            </div>
            
            <div className="flex items-center gap-2 text-gray-700">
              <User className="w-4 h-4" />
              <span className="font-semibold">Paciente:</span>
              <span>{patient?.name || "N/A"}</span>
            </div>
            
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar className="w-4 h-4" />
              <span className="font-semibold">Data:</span>
              <span>{aptStart.toLocaleDateString("pt-BR")}</span>
            </div>
            
            <div className="flex items-center gap-2 text-gray-700">
              <Clock className="w-4 h-4" />
              <span className="font-semibold">Horário:</span>
              <span>
                {aptStart.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} - 
                {aptEnd.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            
            {patient?.cpf && (
              <div className="flex items-center gap-2 text-gray-700">
                <span className="font-semibold">CPF:</span>
                <span>{patient.cpf}</span>
              </div>
            )}
            
            {patient?.phone && (
              <div className="flex items-center gap-2 text-gray-700">
                <span className="font-semibold">Telefone:</span>
                <span>{patient.phone}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="glass-effect rounded-2xl p-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">
            {viewMode === "week" 
              ? `Semana de ${weekStart.toLocaleDateString("pt-BR")}`
              : selectedDate.toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
            }
          </h3>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={goToToday} variant="outline" size="sm">
            Hoje
          </Button>
          
          <div className="flex gap-1">
            <Button 
              onClick={viewMode === "week" ? previousWeek : previousDay} 
              variant="outline" 
              size="sm" 
              disabled={loading}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button 
              onClick={viewMode === "week" ? nextWeek : nextDay} 
              variant="outline" 
              size="sm" 
              disabled={loading}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex gap-1 border rounded-lg">
            <Button 
              onClick={() => setViewMode("day")} 
              variant={viewMode === "day" ? "default" : "ghost"}
              size="sm"
              className="rounded-r-none"
            >
              Dia
            </Button>
            <Button 
              onClick={() => setViewMode("week")} 
              variant={viewMode === "week" ? "default" : "ghost"}
              size="sm"
              className="rounded-l-none"
            >
              Semana
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-purple-600 mx-auto" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          {/* CALENDAR GRID */}
          <div className="min-w-[800px]">
            {/* Header with days */}
            <div className="grid grid-cols-[80px_1fr] border-b-2 border-gray-300">
              <div className="p-2"></div>
              <div className={`grid grid-cols-${daysToShow.length}`}>
                {daysToShow.map((day, idx) => {
                  const isToday = isSameDay(day, new Date());
                  const dayAppointments = getAppointmentsForDay(day);
                  
                  return (
                    <div key={idx} className="text-center p-3 border-l border-gray-200">
                      <div className={`text-sm font-semibold ${isToday ? "text-purple-600" : "text-gray-700"}`}>
                        {viewMode === "week" ? weekdays[day.getDay()] : weekdaysFull[day.getDay()]}
                      </div>
                      <div className={`text-2xl font-bold mt-1 ${isToday ? "bg-purple-600 text-white rounded-full w-10 h-10 flex items-center justify-center mx-auto" : "text-gray-900"}`}>
                        {day.getDate()}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {dayAppointments.length} consulta{dayAppointments.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Time slots and appointments */}
            <div className="relative">
              <div className="grid grid-cols-[80px_1fr]">
                {/* Time column */}
                <div>
                  {timeSlots.map((time, idx) => (
                    <div key={time} className="h-12 border-b border-gray-200 p-2 text-xs text-gray-600 text-right pr-3">
                      {idx % 2 === 0 ? time : ""}
                    </div>
                  ))}
                </div>

                {/* Days columns */}
                <div className={`grid grid-cols-${daysToShow.length}`}>
                  {daysToShow.map((day, dayIdx) => {
                    const workHour = getDoctorWorkHours(day);
                    
                    return (
                      <div key={dayIdx} className="relative border-l border-gray-200">
                        {/* Time slot backgrounds */}
                        {timeSlots.map((time) => (
                          <div key={time} className="h-12 border-b border-gray-100 hover:bg-gray-50 transition-colors"></div>
                        ))}
                        
                        {/* Work hours overlay */}
                        {workHour && (
                          <div className="absolute inset-0 pointer-events-none">
                            <div 
                              className="bg-blue-50 opacity-30"
                              style={{
                                top: `${((parseInt(workHour.start_time.split(':')[0]) - 6) * 2) * 48}px`,
                                height: `${((parseInt(workHour.end_time.split(':')[0]) - parseInt(workHour.start_time.split(':')[0])) * 2) * 48}px`
                              }}
                            />
                          </div>
                        )}
                        
                        {/* Appointments */}
                        <div className="absolute inset-0">
                          {getAppointmentsForDay(day).map(apt => {
                            const style = calculateAppointmentStyle(apt, day);
                            return renderAppointmentCard(apt, { 
                              top: `${style.top}px`, 
                              height: `${style.height}px`,
                              minHeight: '40px'
                            });
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* No appointments message */}
          {appointments.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma consulta agendada para este período.</p>
            </div>
          )}
        </div>
      )}
      
      {/* Appointment Detail Modal */}
      {renderAppointmentModal()}
    </div>
  );
};

export default ReceptionistCalendar;
