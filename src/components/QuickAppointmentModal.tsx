import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Calendar, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import type { Patient } from "@/types/database";

interface QuickAppointmentModalProps {
  clinicId: string;
  doctorId: string;
  selectedDate: string;
  selectedTime: string;
  slotMinutes: number;
  onClose: () => void;
  onSuccess: () => void;
}

const QuickAppointmentModal: React.FC<QuickAppointmentModalProps> = ({
  clinicId,
  doctorId,
  selectedDate,
  selectedTime,
  slotMinutes,
  onClose,
  onSuccess,
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadPatients = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);

    const { data: patientsData, error } = await supabase
      .from("patients")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("name");

    if (error) {
      toast({
        title: "Erro ao buscar pacientes",
        variant: "destructive",
      });
    } else {
      setPatients(patientsData || []);
    }

    setLoading(false);
  }, [clinicId]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
      (p.cpf && p.cpf.includes(patientSearch))
  );

  const handleSubmit = async () => {
    if (!selectedPatient) {
      toast({
        title: "Selecione um paciente",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const startDate = new Date(`${selectedDate}T${selectedTime}:00`);
      const endDate = new Date(startDate.getTime() + slotMinutes * 60000);

      // Convert reason value to text
      const reasonText =
        reason === "consulta"
          ? "Consulta"
          : reason === "retorno"
          ? "Retorno"
          : null;

      const { error } = await supabase.from("appointments").insert({
        clinic_id: clinicId,
        doctor_id: doctorId,
        patient_id: selectedPatient.id,
        scheduled_start: startDate.toISOString(),
        scheduled_end: endDate.toISOString(),
        status: "SCHEDULED",
        reason: reasonText,
      });

      if (error) throw error;

      toast({
        title: "Agendamento criado com sucesso!",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating appointment:", error);
      toast({
        title: "Erro ao criar agendamento",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-effect rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Novo Agendamento
              </h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {new Date(selectedDate).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{selectedTime}</span>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <div className="space-y-4">
            {/* Patient Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Paciente
              </label>
              <input
                type="text"
                placeholder="Buscar por nome ou CPF..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo da Consulta
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
              >
                <option value="">Selecione o motivo...</option>
                <option value="consulta">Consulta</option>
                <option value="retorno">Retorno</option>
              </select>
            </div>

            {/* Patient List */}
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                Carregando pacientes...
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredPatients.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">
                    Nenhum paciente encontrado
                  </p>
                ) : (
                  filteredPatients.map((patient) => (
                    <button
                      key={patient.id}
                      onClick={() => setSelectedPatient(patient)}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                        selectedPatient?.id === patient.id
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-purple-300"
                      }`}
                    >
                      <p className="font-medium text-gray-900">
                        {patient.name}
                      </p>
                      {patient.cpf && (
                        <p className="text-sm text-gray-600">
                          CPF: {patient.cpf}
                        </p>
                      )}
                      {patient.telefone && (
                        <p className="text-sm text-gray-600">
                          Tel: {patient.telefone}
                        </p>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 gradient-primary text-white"
            disabled={!selectedPatient || !reason || submitting}
          >
            {submitting ? "Agendando..." : "Confirmar Agendamento"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default QuickAppointmentModal;
