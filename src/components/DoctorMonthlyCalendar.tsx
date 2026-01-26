import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar as CalendarIcon,
  Edit,
  Plus,
  Printer,
  Phone,
  CheckCircle,
  Check,
  CheckCheck,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
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
import PreScheduleModal from "./PreScheduleModal";
import ConfirmPreScheduleModal from "./ConfirmPreScheduleModal";

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

const getDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

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
  const [showQuickAppointment, setShowQuickAppointment] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [editingAppointment, setEditingAppointment] =
    useState<AppointmentWithPatientName | null>(null);
  const [doctorName, setDoctorName] = useState<string>("");
  // Estados para pré-agendamento
  const [showPreSchedule, setShowPreSchedule] = useState(false);
  const [confirmingPreSchedule, setConfirmingPreSchedule] = useState<AppointmentWithPatientName | null>(null);;

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

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = getDateString(new Date(year, month, 1));
    const lastDay = getDateString(new Date(year, month + 1, 0));

    // Load doctor name
    const { data: doctorData } = await supabase
      .from("doctors")
      .select("*, profile:profiles(name)")
      .eq("id", doctorId)
      .single();

    if (doctorData?.profile?.name) {
      setDoctorName(doctorData.profile.name);
    }

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
  };

  const setStatusToConfirmed = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "CONFIRMED" })
        .eq("id", appointmentId);

      if (error) throw error;
      toast({ title: "Presença confirmada!" });
      loadMonthData();
    } catch (error) {
      console.error("Erro ao confirmar:", error);
      toast({ title: "Erro ao confirmar", variant: "destructive" });
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", appointmentId);

      if (error) throw error;
      toast({ title: `Status atualizado para ${newStatus === 'COMPLETED' ? 'Concluído' : 'Cancelado'}!` });
      loadMonthData();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  // Memoize day statuses for all days in the month
  const dayStatusMap = useMemo(() => {
    const map = new Map<string, DayStatus>();

    const calculateStatus = (date: Date): DayStatus => {
      if (!date || workHoursMap.size === 0) return "available";

      const dateStr = getDateString(date);
      const dayOfWeek = date.getDay();

      // Fast lookup using memoized map
      const workHour =
        workHoursMap.get(`date-${dateStr}`) ||
        workHoursMap.get(`weekday-${dayOfWeek}`);

      // If doctor doesn't work on this day, mark as completed (closed)
      if (!workHour) return "completed";

      // Fast lookup using memoized map
      const dayAppointments = (appointmentsByDate.get(dateStr) || []).filter(
        (apt) => apt.status !== "CANCELLED"
      );

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
      const dateStr = getDateString(date);
      map.set(dateStr, calculateStatus(date));
    }

    return map;
  }, [currentDate, workHoursMap, appointmentsByDate]);

  const getDayStatus = useCallback(
    (date: Date) => {
      const dateStr = getDateString(date);
      return dayStatusMap.get(dateStr) || "available";
    },
    [dayStatusMap]
  );

  const generateTimeSlots = useMemo((): TimeSlot[] => {
    if (!selectedDate || workHoursMap.size === 0) return [];

    const dateStr = getDateString(selectedDate);
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

    // Get appointments for this day using memoized map (exclude cancelled)
    const dayAppointments = (appointmentsByDate.get(dateStr) || []).filter(
      (apt) => apt.status !== "CANCELLED"
    );

    // Create appointment time map for O(1) lookup
    const appointmentTimeMap = new Map<string, AppointmentWithPatientName>();
    dayAppointments.forEach((apt) => {
      const d = new Date(apt.scheduled_start);
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      const time = `${h}:${m}`;
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

  const handlePrintDailyAgenda = () => {
    if (!selectedDate || selectedDateAppointments.length === 0) return;

    const formattedDate = selectedDate.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const appointmentsHtml = selectedDateAppointments
      .map((apt, index) => {
        const time = new Date(apt.scheduled_start).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const statusText =
          apt.status === "COMPLETED"
            ? "Concluído"
            : apt.status === "CANCELLED"
              ? "Cancelado"
              : "Agendado";
        const statusClass =
          apt.status === "COMPLETED"
            ? "status-completed"
            : apt.status === "CANCELLED"
              ? "status-cancelled"
              : "status-scheduled";

        return `
          <tr>
            <td class="order">${index + 1}</td>
            <td class="time">${time}</td>
            <td class="patient">${apt.patient?.name || "Paciente não informado"}</td>
            <td class="reason">${apt.reason || "-"}</td>
            <td class="status ${statusClass}">${statusText}</td>
            <td class="notes"></td>
          </tr>
        `;
      })
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Agenda do Dia - ${doctorName}</title>
          <style>
            @page { 
              size: A4 landscape; 
              margin: 15mm; 
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              line-height: 1.4;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 2px solid #7c3aed;
            }
            .header h1 {
              font-size: 20px;
              color: #7c3aed;
              margin-bottom: 5px;
            }
            .header .subtitle {
              font-size: 14px;
              color: #666;
            }
            .header .date {
              font-size: 16px;
              font-weight: bold;
              margin-top: 8px;
              color: #333;
            }
            .summary {
              display: flex;
              justify-content: space-between;
              margin-bottom: 15px;
              padding: 10px;
              background: #f3f4f6;
              border-radius: 8px;
            }
            .summary-item {
              text-align: center;
            }
            .summary-item .number {
              font-size: 18px;
              font-weight: bold;
              color: #7c3aed;
            }
            .summary-item .label {
              font-size: 10px;
              color: #666;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background: #7c3aed;
              color: white;
              font-weight: bold;
              font-size: 11px;
            }
            tr:nth-child(even) {
              background: #f9fafb;
            }
            tr:hover {
              background: #f3f4f6;
            }
            .order {
              width: 30px;
              text-align: center;
            }
            .time {
              width: 60px;
              font-weight: bold;
              text-align: center;
            }
            .patient {
              width: 200px;
            }
            .reason {
              width: 150px;
            }
            .status {
              width: 80px;
              text-align: center;
              font-weight: bold;
              border-radius: 4px;
            }
            .status-scheduled {
              color: #7c3aed;
            }
            .status-completed {
              color: #059669;
            }
            .status-cancelled {
              color: #dc2626;
            }
            .notes {
              width: auto;
            }
            .footer {
              margin-top: 20px;
              padding-top: 10px;
              border-top: 1px solid #ddd;
              font-size: 10px;
              color: #666;
              display: flex;
              justify-content: space-between;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📋 Agenda do Dia</h1>
            <div class="subtitle">Dr(a). ${doctorName}</div>
            <div class="date">${formattedDate}</div>
          </div>

          <div class="summary">
            <div class="summary-item">
              <div class="number">${selectedDateAppointments.length}</div>
              <div class="label">Total de Consultas</div>
            </div>
            <div class="summary-item">
              <div class="number">${selectedDateAppointments.filter(a => a.status === "SCHEDULED").length}</div>
              <div class="label">Agendados</div>
            </div>
            <div class="summary-item">
              <div class="number">${selectedDateAppointments.filter(a => a.status === "COMPLETED").length}</div>
              <div class="label">Concluídos</div>
            </div>
            <div class="summary-item">
              <div class="number">${selectedDateAppointments.filter(a => a.status === "CANCELLED").length}</div>
              <div class="label">Cancelados</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th class="order">#</th>
                <th class="time">Horário</th>
                <th class="patient">Paciente</th>
                <th class="reason">Motivo</th>
                <th class="status">Status</th>
                <th class="notes">Observações</th>
              </tr>
            </thead>
            <tbody>
              ${appointmentsHtml}
            </tbody>
          </table>

          <div class="footer">
            <span>Impresso em: ${new Date().toLocaleString("pt-BR")}</span>
            <span>Sistema de Gestão de Clínicas</span>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    }, 200);
  };

  // Função para imprimir pré-agendamentos
  const handlePrintPreSchedules = () => {
    if (!selectedDate) return;

    // Incluir PRE_SCHEDULED e CONFIRMED que não tem paciente vinculado
    const preSchedules = selectedDateAppointments.filter(apt =>
      (apt.status === "PRE_SCHEDULED" || apt.status === "CONFIRMED") && !apt.patient_id
    );
    if (preSchedules.length === 0) return;

    const formattedDate = selectedDate.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const preSchedulesHtml = preSchedules
      .map((apt, index) => {
        const time = new Date(apt.scheduled_start).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const name = (apt as any).pre_schedule_name || "Nome não informado";
        const phone = (apt as any).pre_schedule_phone || "-";

        return `
          <tr>
            <td class="order">${index + 1}</td>
            <td class="time">${time}</td>
            <td class="patient">${name}</td>
            <td class="phone">${phone}</td>
            <td class="reason">${apt.reason || "-"}</td>
            <td class="status">${apt.status === "CONFIRMED" ? "✅ Confirmado" : "⏳ Aguardando"}</td>
            <td class="notes"></td>
          </tr>
        `;
      })
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pré-Agendamentos - ${doctorName}</title>
          <style>
            @page { 
              size: A4 landscape; 
              margin: 15mm; 
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              line-height: 1.4;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 3px solid #f59e0b;
            }
            .header h1 {
              font-size: 22px;
              color: #f59e0b;
              margin-bottom: 5px;
            }
            .header .subtitle {
              font-size: 14px;
              color: #666;
            }
            .header .date {
              font-size: 16px;
              font-weight: bold;
              margin-top: 8px;
              color: #333;
            }
            .info-box {
              background: #fef3c7;
              border: 2px solid #f59e0b;
              border-radius: 8px;
              padding: 12px;
              margin-bottom: 20px;
              text-align: center;
            }
            .info-box .count {
              font-size: 28px;
              font-weight: bold;
              color: #d97706;
            }
            .info-box .label {
              font-size: 12px;
              color: #92400e;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 10px 8px;
              text-align: left;
            }
            th {
              background: #f59e0b;
              color: white;
              font-weight: bold;
              font-size: 11px;
            }
            tr:nth-child(even) {
              background: #fffbeb;
            }
            tr:hover {
              background: #fef3c7;
            }
            .order {
              width: 30px;
              text-align: center;
            }
            .time {
              width: 70px;
              font-weight: bold;
              text-align: center;
              font-size: 14px;
            }
            .patient {
              width: 180px;
              font-weight: bold;
            }
            .phone {
              width: 130px;
            }
            .reason {
              width: 100px;
            }
            .status {
              width: 100px;
              text-align: center;
              color: #d97706;
              font-weight: bold;
            }
            .notes {
              width: auto;
              min-width: 150px;
            }
            .footer {
              margin-top: 20px;
              padding-top: 10px;
              border-top: 1px solid #ddd;
              font-size: 10px;
              color: #666;
              display: flex;
              justify-content: space-between;
            }
            .legend {
              margin-top: 15px;
              padding: 10px;
              background: #f3f4f6;
              border-radius: 6px;
              font-size: 11px;
            }
            .legend-title {
              font-weight: bold;
              margin-bottom: 5px;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📞 Lista de Pré-Agendamentos</h1>
            <div class="subtitle">Dr(a). ${doctorName}</div>
            <div class="date">${formattedDate}</div>
          </div>

          <div class="info-box">
            <div class="count">${preSchedules.length}</div>
            <div class="label">Pacientes aguardando confirmação de cadastro</div>
          </div>

          <table>
            <thead>
              <tr>
                <th class="order">#</th>
                <th class="time">Horário</th>
                <th class="patient">Nome</th>
                <th class="phone">Telefone</th>
                <th class="reason">Motivo</th>
                <th class="status">Status</th>
                <th class="notes">Observações / Cadastro</th>
              </tr>
            </thead>
            <tbody>
              ${preSchedulesHtml}
            </tbody>
          </table>

          <div class="legend">
            <div class="legend-title">📋 Instruções:</div>
            <p>• Quando o paciente chegar, realize o cadastro completo no sistema</p>
            <p>• Confirme o agendamento para que apareça na agenda do médico</p>
            <p>• Use a coluna "Observações" para anotações durante o atendimento</p>
          </div>

          <div class="footer">
            <span>Impresso em: ${new Date().toLocaleString("pt-BR")}</span>
            <span>Sistema de Gestão de Clínicas</span>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    }, 200);
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
    const appointments = appointmentsByDate.get(dateStr) || [];
    // Sort by scheduled_start time
    return [...appointments].sort(
      (a, b) =>
        new Date(a.scheduled_start).getTime() -
        new Date(b.scheduled_start).getTime()
    );
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
                  ${!dayInfo.isCurrentMonth
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              {selectedDate
                ? `Agendamentos - ${selectedDate.toLocaleDateString("pt-BR")}`
                : "Lista de Agendados"}
            </h3>
            {selectedDate && selectedDateAppointments.length > 0 && (
              <Button
                onClick={handlePrintDailyAgenda}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 text-purple-600 border-purple-300 hover:bg-purple-50"
              >
                <Printer className="w-4 h-4" />
                Imprimir Agenda
              </Button>
            )}
          </div>

          {!selectedDate ? (
            <p className="text-sm text-gray-500 text-center py-8">
              Selecione um dia no calendário
            </p>
          ) : (
            <div className="space-y-4">
              {/* Appointments (excluindo pré-agendamentos) */}
              {selectedDateAppointments.filter(apt => apt.status !== "PRE_SCHEDULED").length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Agendamentos ({selectedDateAppointments.filter(apt => apt.status !== "PRE_SCHEDULED").length})
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedDateAppointments.filter(apt => apt.status !== "PRE_SCHEDULED").map((apt) => (
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
                              {apt.reason}
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
                                className={`text-xs px-2 py-1 rounded-full ${apt.status === "COMPLETED"
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

              {/* Pré-Agendamentos (PRE_SCHEDULED e CONFIRMED sem paciente) */}
              {selectedDateAppointments.filter(apt => (apt.status === "PRE_SCHEDULED" || apt.status === "CONFIRMED") && !apt.patient_id).length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-amber-700 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Pré-Agendamentos ({selectedDateAppointments.filter(apt => (apt.status === "PRE_SCHEDULED" || apt.status === "CONFIRMED") && !apt.patient_id).length})
                    </h4>
                    <Button
                      onClick={handlePrintPreSchedules}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 text-amber-600 border-amber-300 hover:bg-amber-50 text-xs py-1 h-7"
                    >
                      <Printer className="w-3 h-3" />
                      Imprimir
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedDateAppointments
                      .filter(apt => (apt.status === "PRE_SCHEDULED" || apt.status === "CONFIRMED") && !apt.patient_id)
                      .map((apt) => (
                        <div
                          key={apt.id}
                          className={`p-3 rounded-lg border transition-all group ${apt.status === "CONFIRMED"
                            ? "bg-blue-50 border-blue-300 hover:border-blue-500"
                            : "bg-amber-50 border-amber-300 hover:border-amber-500"
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 text-sm flex items-center gap-1">
                                {apt.status === "CONFIRMED" ? (
                                  <CheckCircle className="w-3 h-3 text-blue-600" />
                                ) : (
                                  <Phone className="w-3 h-3 text-amber-600" />
                                )}
                                {(apt as any).pre_schedule_name || "Nome não informado"}
                              </p>
                              <p className="text-xs text-gray-600">
                                Tel: {(apt as any).pre_schedule_phone || "-"} • {apt.reason}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <p className={`text-sm font-semibold ${apt.status === "CONFIRMED" ? "text-blue-700" : "text-amber-700"}`}>
                                  {new Date(apt.scheduled_start).toLocaleTimeString("pt-BR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                                <span className={`text-xs px-2 py-1 rounded-full ${apt.status === "CONFIRMED" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                                  }`}>
                                  {apt.status === "CONFIRMED" ? "Confirmado" : "Aguardando"}
                                </span>
                              </div>

                              {apt.status !== "CONFIRMED" && (
                                <button
                                  onClick={() => setStatusToConfirmed(apt.id)}
                                  className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 transition-colors"
                                  title="Confirmar Presença"
                                >
                                  <Check className="w-4 h-4 text-blue-600" />
                                </button>
                              )}

                              {apt.status === "CONFIRMED" && (
                                <>
                                  <button
                                    onClick={() => updateAppointmentStatus(apt.id, "COMPLETED")}
                                    className="p-2 rounded-lg bg-green-100 hover:bg-green-200 transition-colors"
                                    title="Marcar como Concluído"
                                  >
                                    <CheckCheck className="w-4 h-4 text-green-600" />
                                  </button>
                                  <button
                                    onClick={() => updateAppointmentStatus(apt.id, "CANCELLED")}
                                    className="p-2 rounded-lg bg-red-100 hover:bg-red-200 transition-colors"
                                    title="Cancelar Agendamento"
                                  >
                                    <Ban className="w-4 h-4 text-red-600" />
                                  </button>
                                </>
                              )}

                              <button
                                onClick={() => setConfirmingPreSchedule(apt)}
                                className="p-2 rounded-lg bg-purple-100 hover:bg-purple-200 transition-colors"
                                title="Vincular ao Cadastro"
                              >
                                <Plus className="w-4 h-4 text-purple-600" />
                              </button>
                              <button
                                onClick={() => handleEditAppointment(apt)}
                                className="p-2 rounded-lg hover:border-amber-300 transition-colors opacity-0 group-hover:opacity-100"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4 text-amber-600" />
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
                  {/* Botão de Pré-Agendamento */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <Button
                      onClick={() => {
                        if (timeSlots.filter(s => !s.isBooked).length > 0) {
                          setSelectedTimeSlot(timeSlots.filter(s => !s.isBooked)[0].time);
                          setShowPreSchedule(true);
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full flex items-center justify-center gap-2 text-amber-600 border-amber-300 hover:bg-amber-50"
                      disabled={timeSlots.filter(s => !s.isBooked).length === 0}
                    >
                      <Phone className="w-4 h-4" />
                      Pré-Agendamento (Ligação)
                    </Button>
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

      {/* Pre-Schedule Modal */}
      {showPreSchedule && selectedDate && selectedTimeSlot && doctorId && (
        <PreScheduleModal
          clinicId={clinicId}
          doctorId={doctorId}
          selectedDate={getDateString(selectedDate)}
          selectedTime={selectedTimeSlot}
          slotMinutes={getCurrentSlotMinutes()}
          appointments={selectedDateAppointments}
          onClose={() => {
            setShowPreSchedule(false);
            setSelectedTimeSlot(null);
          }}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* Confirm Pre-Schedule Modal */}
      {confirmingPreSchedule && (
        <ConfirmPreScheduleModal
          clinicId={clinicId}
          appointmentId={confirmingPreSchedule.id}
          preScheduleName={(confirmingPreSchedule as any).pre_schedule_name || ""}
          preSchedulePhone={(confirmingPreSchedule as any).pre_schedule_phone || ""}
          scheduledStart={confirmingPreSchedule.scheduled_start}
          doctorName={doctorName}
          onClose={() => setConfirmingPreSchedule(null)}
          onSuccess={handleModalSuccess}
        />
      )}
    </>
  );
};

export default DoctorMonthlyCalendar;
