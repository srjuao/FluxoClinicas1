import type { Patient, Doctor, Appointment, Clinic, Profile } from './database.types';

export interface ModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export interface PatientFormData {
  name: string;
  cpf: string;
  birth_date: string;
  sexo: string;
  telefone: string;
  estado_civil: string;
  endereco?: string;
}

export interface CreateUserModalProps extends ModalProps {
  clinicId: string;
  userToEdit?: Profile | null;
  doctorData?: Doctor | null;
}

export interface CreateClinicModalProps extends ModalProps {}

export interface CreateClinicAdminModalProps extends Omit<ModalProps, 'onSuccess'> {
  clinic: Clinic;
  onSuccess: () => void;
}

export interface CreateAppointmentModalProps extends ModalProps {
  clinicId: string;
}

export interface CreateReportModalProps extends ModalProps {
  doctorId: string;
  clinicId: string;
  defaultPatient?: Patient | null;
}

export interface CreateCertificateModalProps {
  doctorId: string;
  clinicId: string;
  preselectedPatient?: Patient | null;
  onClose: () => void;
}

export interface CreatePrescriptionModalProps extends ModalProps {
  doctorId: string;
  clinicId: string;
  preselectedPatient?: Patient;
}

export interface ManageWorkHoursModalProps {
  doctor: Doctor;
  clinicId: string;
  onClose: () => void;
}

export interface SearchReportsModalProps {
  clinicId: string;
  onClose: () => void;
}

export interface PatientDetailsPageProps {
  patientId: string;
  appointment?: Appointment;
  onBack: () => void;
}

export interface CalendarProps {
  clinicId: string;
  doctorId?: string;
}

export interface DoctorAgendaProps {
  doctorId: string;
  clinicId: string;
  onSelectPatient: (patient: Patient, appointment: Appointment) => void;
}
