export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'PRE_SCHEDULED' | 'CONFIRMED'
export type UserRole = 'SUPER_ADMIN' | 'CLINIC_ADMIN' | 'DOCTOR' | 'RECEPTIONIST'

export interface Database {
  public: {
    Tables: {
      appointments: {
        Row: {
          id: string
          clinic_id: string
          doctor_id: string
          patient_id: string | null
          scheduled_start: string
          scheduled_end: string
          status: AppointmentStatus
          created_at: string
          reason?: string | null
          is_insurance?: boolean | null
          insurance_plan_id?: string | null
          consultation_value?: number | null
          discount_amount?: number | null
          final_value?: number | null
          clinic_commission_percentage?: number | null
          clinic_commission_amount?: number | null
          doctor_amount?: number | null
          pre_schedule_name?: string | null
          pre_schedule_phone?: string | null
        }
        Insert: {
          id?: string
          clinic_id: string
          doctor_id: string
          patient_id?: string | null
          scheduled_start: string
          scheduled_end: string
          status?: AppointmentStatus
          created_at?: string
          reason?: string | null
          is_insurance?: boolean | null
          insurance_plan_id?: string | null
          consultation_value?: number | null
          discount_amount?: number | null
          final_value?: number | null
          clinic_commission_percentage?: number | null
          clinic_commission_amount?: number | null
          doctor_amount?: number | null
          pre_schedule_name?: string | null
          pre_schedule_phone?: string | null
        }
        Update: {
          id?: string
          clinic_id?: string
          doctor_id?: string
          patient_id?: string | null
          scheduled_start?: string
          scheduled_end?: string
          status?: AppointmentStatus
          created_at?: string
          reason?: string | null
          is_insurance?: boolean | null
          insurance_plan_id?: string | null
          consultation_value?: number | null
          discount_amount?: number | null
          final_value?: number | null
          clinic_commission_percentage?: number | null
          clinic_commission_amount?: number | null
          doctor_amount?: number | null
          pre_schedule_name?: string | null
          pre_schedule_phone?: string | null
        }
      }
      clinics: {
        Row: {
          id: string
          name: string
          cnpj: string | null
          created_at: string
          is_active: boolean
          max_users: number | null
          default_commission_percentage: number | null
        }
        Insert: {
          id?: string
          name: string
          cnpj?: string | null
          created_at?: string
          is_active?: boolean
          max_users?: number | null
          default_commission_percentage?: number | null
        }
        Update: {
          id?: string
          name?: string
          cnpj?: string | null
          created_at?: string
          is_active?: boolean
          max_users?: number | null
          default_commission_percentage?: number | null
        }
      }
      doctor_work_hours: {
        Row: {
          id: string
          clinic_id: string
          doctor_id: string
          weekday: number | null
          start_time: string
          end_time: string
          slot_minutes: number
          created_at: string
          specific_date: string | null
          lunch_start: string | null
          lunch_end: string | null
          room: string | null
        }
        Insert: {
          id?: string
          clinic_id: string
          doctor_id: string
          weekday?: number | null
          start_time: string
          end_time: string
          slot_minutes?: number
          created_at?: string
          specific_date?: string | null
          lunch_start?: string | null
          lunch_end?: string | null
          room?: string | null
        }
        Update: {
          id?: string
          clinic_id?: string
          doctor_id?: string
          weekday?: number | null
          start_time?: string
          end_time?: string
          slot_minutes?: number
          created_at?: string
          specific_date?: string | null
          lunch_start?: string | null
          lunch_end?: string | null
          room?: string | null
        }
      }
      doctors: {
        Row: {
          id: string
          user_id: string
          clinic_id: string
          crm: string
          specialties: string[] | null
          created_at: string
          can_prescribe_exams: boolean
          can_prescribe_lenses: boolean
          can_prescribe_urology_exams: boolean
          can_prescribe_cardiology_exams: boolean
          does_ultrasound_exams: boolean
          room: string | null
        }
        Insert: {
          id?: string
          user_id: string
          clinic_id: string
          crm: string
          specialties?: string[] | null
          created_at?: string
          can_prescribe_exams?: boolean
          can_prescribe_lenses?: boolean
          can_prescribe_urology_exams?: boolean
          can_prescribe_cardiology_exams?: boolean
          does_ultrasound_exams?: boolean
          room?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          clinic_id?: string
          crm?: string
          specialties?: string[] | null
          created_at?: string
          can_prescribe_exams?: boolean
          can_prescribe_lenses?: boolean
          can_prescribe_urology_exams?: boolean
          can_prescribe_cardiology_exams?: boolean
          does_ultrasound_exams?: boolean
          room?: string | null
        }
      }
      medical_certificates: {
        Row: {
          id: string
          clinic_id: string
          doctor_id: string
          patient_id: string
          description: string
          start_date: string
          end_date: string
          created_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          doctor_id: string
          patient_id: string
          description: string
          start_date: string
          end_date: string
          created_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          doctor_id?: string
          patient_id?: string
          description?: string
          start_date?: string
          end_date?: string
          created_at?: string
        }
      }
      medical_reports: {
        Row: {
          id: string
          clinic_id: string
          doctor_id: string
          patient_id: string
          title: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          doctor_id: string
          patient_id: string
          title: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          doctor_id?: string
          patient_id?: string
          title?: string
          content?: string
          created_at?: string
        }
      }
      patients: {
        Row: {
          id: string
          clinic_id: string
          name: string
          cpf: string | null
          birth_date: string | null
          created_at: string
          telefone: string | null
          endereco: string | null
          sexo: string | null
          estado_civil: string | null
        }
        Insert: {
          id?: string
          clinic_id: string
          name: string
          cpf?: string | null
          birth_date?: string | null
          created_at?: string
          telefone?: string | null
          endereco?: string | null
          sexo?: string | null
          estado_civil?: string | null
        }
        Update: {
          id?: string
          clinic_id?: string
          name?: string
          cpf?: string | null
          birth_date?: string | null
          created_at?: string
          telefone?: string | null
          endereco?: string | null
          sexo?: string | null
          estado_civil?: string | null
        }
      }
      prescriptions: {
        Row: {
          id: string
          doctor_id: string
          clinic_id: string
          patient_id: string | null
          title: string
          content: string
          created_at: string
          is_template: boolean
        }
        Insert: {
          id?: string
          doctor_id: string
          clinic_id: string
          patient_id?: string | null
          title: string
          content: string
          created_at?: string
          is_template?: boolean
        }
        Update: {
          id?: string
          doctor_id?: string
          clinic_id?: string
          patient_id?: string | null
          title?: string
          content?: string
          created_at?: string
          is_template?: boolean
        }
      }
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          clinic_id: string | null
          role: UserRole
          is_admin: boolean
          has_financial_access: boolean
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id: string
          name: string
          email: string
          clinic_id?: string | null
          role: UserRole
          is_admin?: boolean
          has_financial_access?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          email?: string
          clinic_id?: string | null
          role?: UserRole
          is_admin?: boolean
          has_financial_access?: boolean
          created_at?: string
          updated_at?: string | null
        }
      }
      doctor_pricing: {
        Row: {
          id: string
          doctor_id: string
          clinic_id: string
          consultation_value: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          doctor_id: string
          clinic_id: string
          consultation_value: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          doctor_id?: string
          clinic_id?: string
          consultation_value?: number
          created_at?: string
          updated_at?: string
        }
      }
      clinic_commission: {
        Row: {
          id: string
          doctor_id: string
          clinic_id: string
          commission_percentage: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          doctor_id: string
          clinic_id: string
          commission_percentage: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          doctor_id?: string
          clinic_id?: string
          commission_percentage?: number
          created_at?: string
          updated_at?: string
        }
      }
      insurance_plans: {
        Row: {
          id: string
          clinic_id: string
          name: string
          discount_percentage: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          name: string
          discount_percentage: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          name?: string
          discount_percentage?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      doctor_exams: {
        Row: {
          id: string
          clinic_id: string
          doctor_id: string
          exam_name: string
          created_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          doctor_id: string
          exam_name: string
          created_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          doctor_id?: string
          exam_name?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      appointment_status: AppointmentStatus
      user_role: UserRole
    }
  }
}

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Specific table types
export type Appointment = Tables<'appointments'>
export type Clinic = Tables<'clinics'>
export type DoctorWorkHours = Tables<'doctor_work_hours'>
export type Doctor = Tables<'doctors'>
export type MedicalCertificate = Tables<'medical_certificates'>
export type MedicalReport = Tables<'medical_reports'>
export type Patient = Tables<'patients'>
export type Prescription = Tables<'prescriptions'>
export type Profile = Tables<'profiles'>
export type DoctorPricing = Tables<'doctor_pricing'>
export type ClinicCommission = Tables<'clinic_commission'>
export type InsurancePlan = Tables<'insurance_plans'>
export type DoctorExam = Tables<'doctor_exams'>

// Extended types with relations
export type ProfileWithClinic = Profile & {
  clinic: Clinic | null
}

export type DoctorWithProfile = Doctor & {
  profile: Profile
}

export type AppointmentWithRelations = Appointment & {
  doctor?: Doctor
  patient?: Patient
  clinic?: Clinic
}

// Additional helper types for components
export type DoctorWithProfileName = Doctor & {
  profile: {
    name: string
  }
}

export type TimeSlot = {
  time: string
  available: boolean
}
