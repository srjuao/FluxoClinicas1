import { AppointmentWithPatientName, DoctorWorkHours } from "./database";

export interface DayInfo {
  day: number;
  isCurrentMonth: boolean;
  date: Date;
}

export type DayStatus = "available" | "scheduled" | "completed" | "disabled";

export interface TimeSlot {
  time: string;
  appointment: AppointmentWithPatientName | undefined;
  isBooked: boolean;
}

export interface DoctorMonthlyCalendarProps {
  clinicId: string;
  doctorId: string | null;
}

export interface WorkHoursMap extends Map<string, DoctorWorkHours> {}

export interface AppointmentsByDateMap extends Map<string, AppointmentWithPatientName[]> {}

export interface DayStatusMap extends Map<string, DayStatus> {}
