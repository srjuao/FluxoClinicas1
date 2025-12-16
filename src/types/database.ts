// Database types based on Supabase schema

export type AppointmentStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";

export interface Appointment {
  id: string;
  clinic_id: string;
  doctor_id: string;
  patient_id: string;
  scheduled_start: string; // ISO timestamp
  scheduled_end: string; // ISO timestamp
  status: AppointmentStatus;
  created_at: string;
  reason?: string;
}

export interface DoctorWorkHours {
  id: string;
  clinic_id: string;
  doctor_id: string;
  weekday: number | null; // 0-6 (Sunday-Saturday)
  start_time: string; // "HH:MM:SS" format
  end_time: string; // "HH:MM:SS" format
  slot_minutes: number;
  created_at: string;
  specific_date: string | null; // ISO date string
  lunch_start: string | null; // "HH:MM:SS" format
  lunch_end: string | null; // "HH:MM:SS" format
  room: string | null;
}

export interface Doctor {
  id: string;
  user_id: string;
  clinic_id: string;
  crm: string;
  specialties: string[] | null;
  created_at: string;
  can_prescribe_exams: boolean;
  can_prescribe_lenses: boolean;
  can_prescribe_urology_exams: boolean;
  can_prescribe_cardiology_exams: boolean;
  room: string | null;
}

export interface Patient {
  id: string;
  clinic_id: string;
  name: string;
  cpf: string | null;
  birth_date: string | null;
  created_at: string;
  telefone: string | null;
  endereco: string | null;
  sexo: string | null;
  estado_civil: string | null;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  clinic_id: string | null;
  role: "ADMIN" | "DOCTOR" | "RECEPTIONIST";
  created_at: string;
  updated_at: string | null;
}

export interface Clinic {
  id: string;
  name: string;
  cnpj: string | null;
  created_at: string;
}

// Extended types with relations
export interface AppointmentWithPatient extends Appointment {
  patient: Patient;
}

export interface AppointmentWithPatientName extends Appointment {
  patient: {
    name: string;
  } | null;
}

export interface DoctorWithProfile extends Doctor {
  profile: Profile;
}
