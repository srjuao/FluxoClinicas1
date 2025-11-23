import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar as CalendarIcon,
  Edit,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/customSupabaseClient";
import { getDaysInMonth } from "@/utils/calendar";
import { AppointmentWithPatientName, DoctorWorkHours } from "@/types/database";
import {
  DoctorMonthlyCalendarProps,
  DayStatus,
  TimeSlot,
} from "@/types/calendar";
import QuickAppointmentModal from "./QuickAppointmentModal";
import EditAppointmentModal from "./EditAppointmentModal";

const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const weekDays = ["D", "S", "T", "Q", "QU", "S", "S"];

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-white text-gray-900"; // fechado (black)
    case "available":
      return "bg-green-500 text-white"; // disponível (green)
    case "scheduled":
      return "bg-purple-500 text-white"; // esgotado (purple/pink)
    default:
      return "bg-white text-gray-900";
  }
};

const DoctorMonthlyCalendar: React.FC<DoctorMonthlyCalendarProps> = ({
  clinicId,
  doctorId,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [appointments, setAppointments] = useState<
    AppointmentWithPatientName[]
  >([]);
  const [workHours, setWorkHours] = useState<DoctorWorkHours[]>([]);
  const [loading, setLoading] = useState(false);
  const [showQuickAppointment, setShowQuickAppointment] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [editingAppointment, setEditingAppointment] =
    useState<AppointmentWithPatientName | null>(null);

  // Memoize work hours map by weekday for faster lookups
  const workHoursMap = useMemo(() => {
    const map = new Map<string, DoctorWorkHours>();
    workHours.forEach((wh) => {
      if (wh.specific_date) {
        map.set(`date-${wh.specific_date}`, wh);
      } else if (wh.weekday !== null) {
        map.set(`weekday-${wh.weekday}`, wh);
      }
    });
    return map;
  }, [workHours]);

  // Memoize appointments by date for faster lookups
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, AppointmentWithPatientName[]>();
    appointments.forEach((apt) => {
      const dateStr = apt.scheduled_start.split("T")[0];
      if (!map.has(dateStr)) {
        map.set(dateStr, []);
      }
      map.get(dateStr)!.push(apt);
    });
    return map;
  }, [appointments]);

  // Load appointments for the current month
  useEffect(() => {
    if (!clinicId || !doctorId) return;
    loadMonthData();
  }, [clinicId, doctorId, currentDate]);

  const loadMonthData = async () => {
    if (!doctorId) return;

    setLoading(true);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).toISOString().split("T")[0];
    const lastDay = new Date(year, month + 1, 0).toISOString().split("T")[0];

    // Load appointments with patient name
    const { data: appointmentsData } = await supabase
      .from("appointments")
      .select("*, patient:patients(name)")
      .eq("doctor_id", doctorId)
      .gte("scheduled_start", firstDay)
      .lte("scheduled_start", lastDay + "T23:59:59");

    setAppointments((appointmentsData as AppointmentWithPatientName[]) || []);

    // Load work hours - returns array of work hours for each weekday
    const { data: workHoursData } = await supabase
      .from("doctor_work_hours")
      .select("*")
      .eq("doctor_id", doctorId);

    setWorkHours((workHoursData as DoctorWorkHours[]) || []);
    setLoading(false);
  };

  // Memoize day statuses for all days in the month
  const dayStatusMap = useMemo(() => {
    const map = new Map<string, DayStatus>();

    const calculateStatus = (date: Date): DayStatus => {
      if (!date || workHoursMap.size === 0) return "available";

      const dateStr = date.toISOString().split("T")[0];
      const dayOfWeek = date.getDay();

      // Fast lookup using memoized map
      const workHour =
        workHoursMap.get(`date-${dateStr}`) ||
        workHoursMap.get(`weekday-${dayOfWeek}`);

      // If doctor doesn't work on this day, mark as completed (closed)
      if (!workHour) return "completed";

      // Fast lookup using memoized map
      const dayAppointments = appointmentsByDate.get(dateStr) || [];

      // If no appointments, day is available
      if (dayAppointments.length === 0) return "available";

      // Calculate total available slots for the day
      const [startHour, startMin] = workHour.start_time.split(":").map(Number);
      const [endHour, endMin] = workHour.end_time.split(":").map(Number);
      const slotMinutes = workHour.slot_minutes || 30;

      // Calculate lunch break duration in slots
      let lunchSlots = 0;
      if (workHour.lunch_start && workHour.lunch_end) {
        const [lunchStartHour, lunchStartMin] = workHour.lunch_start
          .split(":")
          .map(Number);
        const [lunchEndHour, lunchEndMin] = workHour.lunch_end
          .split(":")
          .map(Number);
        const lunchMinutes =
          lunchEndHour * 60 +
          lunchEndMin -
          (lunchStartHour * 60 + lunchStartMin);
        lunchSlots = Math.floor(lunchMinutes / slotMinutes);
      }

      // Calculate total work minutes and slots
      const totalWorkMinutes =
        endHour * 60 + endMin - (startHour * 60 + startMin);
      const totalSlots =
        Math.floor(totalWorkMinutes / slotMinutes) - lunchSlots;

      if (dayAppointments.length >= totalSlots) {
        return "scheduled"; // Fully booked (esgotado)
      }

      // Has some appointments but still has availability
      return "available";
    };

    // Pre-calculate status for all days in current month
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split("T")[0];
      map.set(dateStr, calculateStatus(date));
    }

    return map;
  }, [currentDate, workHoursMap, appointmentsByDate]);

  const getDayStatus = useCallback(
    (date: Date) => {
      const dateStr = date.toISOString().split("T")[0];
      return dayStatusMap.get(dateStr) || "available";
    },
    [dayStatusMap]
  );

  const generateTimeSlots = useMemo((): TimeSlot[] => {
    if (!selectedDate || workHoursMap.size === 0) return [];

    const dateStr = selectedDate.toISOString().split("T")[0];
    const dayOfWeek = selectedDate.getDay();

    // Fast lookup using memoized map
    const workHour =
      workHoursMap.get(`date-${dateStr}`) ||
      workHoursMap.get(`weekday-${dayOfWeek}`);

    if (!workHour) return [];

    // Parse start and end times (format: "HH:MM:SS" or "HH:MM")
    const [startHour, startMin] = workHour.start_time.split(":").map(Number);
    const [endHour, endMin] = workHour.end_time.split(":").map(Number);
    const slotMinutes = workHour.slot_minutes || 30;

    // Parse lunch break if exists
    let lunchStart = null;
    let lunchEnd = null;
    if (workHour.lunch_start && workHour.lunch_end) {
      const [lunchStartHour, lunchStartMin] = workHour.lunch_start
        .split(":")
        .map(Number);
      const [lunchEndHour, lunchEndMin] = workHour.lunch_end
        .split(":")
        .map(Number);
      lunchStart = lunchStartHour * 60 + lunchStartMin;
      lunchEnd = lunchEndHour * 60 + lunchEndMin;
    }

    // Get appointments for this day using memoized map
    const dayAppointments = appointmentsByDate.get(dateStr) || [];

    // Create appointment time map for O(1) lookup
    const appointmentTimeMap = new Map<string, AppointmentWithPatientName>();
    dayAppointments.forEach((apt) => {
      const time = new Date(apt.scheduled_start).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      appointmentTimeMap.set(time, apt);
    });

    const slots: TimeSlot[] = [];
    let currentTimeInMinutes = startHour * 60 + startMin;
    const endTimeInMinutes = endHour * 60 + endMin;

    // Safety check to prevent infinite loops
    let iterations = 0;
    const maxIterations = 100; // Max slots per day

    while (
      currentTimeInMinutes < endTimeInMinutes &&
      iterations < maxIterations
    ) {
      iterations++;

      // Skip lunch break
      if (
        lunchStart !== null &&
        lunchEnd !== null &&
        currentTimeInMinutes >= lunchStart &&
        currentTimeInMinutes < lunchEnd
      ) {
        currentTimeInMinutes += slotMinutes;
        continue;
      }

      const currentHour = Math.floor(currentTimeInMinutes / 60);
      const currentMin = currentTimeInMinutes % 60;

      const timeStr = `${String(currentHour).padStart(2, "0")}:${String(
        currentMin
      ).padStart(2, "0")}`;

      // Fast lookup using map
      const appointment = appointmentTimeMap.get(timeStr);

      slots.push({
        time: timeStr,
        appointment,
        isBooked: !!appointment,
      });

      currentTimeInMinutes += slotMinutes;
    }

    return slots;
  }, [selectedDate, workHoursMap, appointmentsByDate]);

  const previousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
    setSelectedDate(null);
  };

  const handleDateClick = (date: Date) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleTimeSlotClick = (time: string) => {
    setSelectedTimeSlot(time);
    setShowQuickAppointment(true);
  };

  const handleEditAppointment = (appointment: AppointmentWithPatientName) => {
    setEditingAppointment(appointment);
  };

  const handleModalSuccess = () => {
    loadMonthData();
  };

  const getCurrentSlotMinutes = () => {
    if (!selectedDate || workHoursMap.size === 0) return 30;
    const dateStr = selectedDate.toISOString().split("T")[0];
    const dayOfWeek = selectedDate.getDay();
    const workHour =
      workHoursMap.get(`date-${dateStr}`) ||
      workHoursMap.get(`weekday-${dayOfWeek}`);
    return workHour?.slot_minutes || 30;
  };

  const days = getDaysInMonth(currentDate);
  const timeSlots = generateTimeSlots;
  const selectedDateAppointments = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = selectedDate.toISOString().split("T")[0];
    return appointmentsByDate.get(dateStr) || [];
  }, [selectedDate, appointmentsByDate]);

  if (!doctorId) {
    return (
      <div className="glass-effect rounded-2xl p-8 text-center">
        <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Selecione um médico para ver a agenda</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-effect rounded-2xl p-6"
        >
          {/* Month Selector */}
          <div className="flex items-center justify-between mb-6">
            <Button
              onClick={previousMonth}
              variant="outline"
              size="sm"
              className="rounded-full"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <h3 className="text-lg font-bold text-gray-900">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>

            <Button
              onClick={nextMonth}
              variant="outline"
              size="sm"
              className="rounded-full"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mb-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-gray-900"></div>
              <span>fechado</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>disponível</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span>esgotado</span>
            </div>
          </div>

          {/* Week Days */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map((day, index) => (
              <div
                key={index}
                className="text-center text-sm font-semibold text-gray-600"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((dayInfo, index) => {
              const status = dayInfo.isCurrentMonth
                ? getDayStatus(dayInfo.date)
                : "disabled";
              const isSelected =
                selectedDate?.toDateString() === dayInfo.date.toDateString();
              const isToday =
                new Date().toDateString() === dayInfo.date.toDateString();

              return (
                <button
                  key={index}
                  onClick={() =>
                    dayInfo.isCurrentMonth && handleDateClick(dayInfo.date)
                  }
                  disabled={!dayInfo.isCurrentMonth}
                  className={`
                  aspect-square rounded-full flex items-center justify-center text-sm font-medium
                  transition-all
                  ${
                    !dayInfo.isCurrentMonth
                      ? "text-gray-300 cursor-not-allowed"
                      : ""
                  }
                  ${dayInfo.isCurrentMonth ? getStatusColor(status) : ""}
                  ${isSelected ? "ring-2 ring-purple-600 ring-offset-2" : ""}
                  ${isToday && !isSelected ? "ring-1 ring-purple-400" : ""}
                `}
                >
                  {dayInfo.day}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Appointments List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-effect rounded-2xl p-6"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {selectedDate
              ? `Agendamentos - ${selectedDate.toLocaleDateString("pt-BR")}`
              : "Lista de Agendados"}
          </h3>

          {!selectedDate ? (
            <p className="text-sm text-gray-500 text-center py-8">
              Selecione um dia no calendário
            </p>
          ) : (
            <div className="space-y-4">
              {/* Appointments */}
              {selectedDateAppointments.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Agendamentos ({selectedDateAppointments.length})
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedDateAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="p-3 bg-purple-50 rounded-lg border border-purple-200 hover:border-purple-400 transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">
                              {apt.patient?.name || "Paciente"}
                            </p>
                            <p className="text-xs text-gray-600">
                              ID: {apt.id.slice(0, 8)}...
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="text-sm font-semibold text-purple-700">
                                {new Date(
                                  apt.scheduled_start
                                ).toLocaleTimeString("pt-BR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${
                                  apt.status === "COMPLETED"
                                    ? "bg-green-100 text-green-700"
                                    : apt.status === "CANCELLED"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-purple-100 text-purple-700"
                                }`}
                              >
                                {apt.status === "COMPLETED"
                                  ? "Concluído"
                                  : apt.status === "CANCELLED"
                                  ? "Cancelado"
                                  : "Agendado"}
                              </span>
                            </div>
                            <button
                              onClick={() => handleEditAppointment(apt)}
                              className="p-2 rounded-lg hover:bg-purple-100 transition-colors opacity-0 group-hover:opacity-100"
                              title="Editar agendamento"
                            >
                              <Edit className="w-4 h-4 text-purple-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Times */}
              {timeSlots.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Horários Disponíveis
                  </h4>
                  <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                    {timeSlots
                      .filter((slot) => !slot.isBooked)
                      .map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => handleTimeSlotClick(slot.time)}
                          className="p-2 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 hover:border-green-400 transition-all group"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="w-3 h-3 text-green-600" />
                            <span className="text-xs font-medium text-green-700">
                              {slot.time}
                            </span>
                            <Plus className="w-3 h-3 text-green-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      ))}
                  </div>
                  {timeSlots.filter((slot) => !slot.isBooked).length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Sem horários disponíveis
                    </p>
                  )}
                </div>
              )}

              {timeSlots.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8">
                  Médico não trabalha neste dia
                </p>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Quick Appointment Modal */}
      {showQuickAppointment && selectedDate && selectedTimeSlot && doctorId && (
        <QuickAppointmentModal
          clinicId={clinicId}
          doctorId={doctorId}
          selectedDate={selectedDate.toISOString().split("T")[0]}
          selectedTime={selectedTimeSlot}
          slotMinutes={getCurrentSlotMinutes()}
          onClose={() => {
            setShowQuickAppointment(false);
            setSelectedTimeSlot(null);
          }}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* Edit Appointment Modal */}
      {editingAppointment && (
        <EditAppointmentModal
          appointment={editingAppointment}
          onClose={() => setEditingAppointment(null)}
          onSuccess={handleModalSuccess}
        />
      )}
    </>
  );
};

export default DoctorMonthlyCalendar;
