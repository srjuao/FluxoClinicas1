import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import CreatePrescriptionModal from './CreatePrescriptionModal';
import { SearchReportsModal } from './SearchReportsModal';

const DoctorAgenda = ({ doctorId, clinicId, onSelectPatient }) => {
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [selectedPatientForPrescription, setSelectedPatientForPrescription] = useState(null);

  const [showSearchReports, setShowSearchReports] = useState(false);


  // 🧭 Buscar agendamentos
  const loadAppointments = useCallback(async () => {
    if (!doctorId || !clinicId) return;

    setLoading(true);
    const dateStrStart = selectedDate.toISOString().split('T')[0] + 'T00:00:00.000Z';
    const dateStrEnd = selectedDate.toISOString().split('T')[0] + 'T23:59:59.999Z';
    
    const { data, error } = await supabase
      .from('appointments')
      .select('*, patient:patients(id, name, cpf)')
      .eq('doctor_id', doctorId)
      .eq('clinic_id', clinicId)
      .gte('scheduled_start', dateStrStart)
      .lte('scheduled_start', dateStrEnd)
      .order('scheduled_start', { ascending: true });

    if (error) {
      toast({ title: 'Erro ao carregar agendamentos', description: error.message, variant: 'destructive' });
    } else {
      setAppointments(data);
    }
    setLoading(false);
  }, [doctorId, clinicId, selectedDate]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // ✅ Marcar paciente como atendido
  const handleMarkAsAttended = async (appointmentId) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'COMPLETED' })
      .eq('id', appointmentId);

    if (error) {
      toast({
        title: 'Erro ao marcar paciente como atendido',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Paciente marcado como atendido!' });
      setAppointments(prev =>
        prev.map(a =>
          a.id === appointmentId ? { ...a, status: 'COMPLETED' } : a
        )
      );
    }
  };

  // ❌ Marcar paciente como não atendido
  const handleMarkAsNotAttended = async (appointmentId) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'NOT_ATTENDED' })
      .eq('id', appointmentId);

    if (error) {
      toast({
        title: 'Erro ao marcar paciente como não atendido',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Paciente marcado como não atendido!' });
      setAppointments(prev =>
        prev.map(a =>
          a.id === appointmentId ? { ...a, status: 'NOT_ATTENDED' } : a
        )
      );
    }
  };

  // 🔙 Reverter paciente para agendado
  const handleRevertToScheduled = async (appointmentId) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'SCHEDULED' })
      .eq('id', appointmentId);

    if (error) {
      toast({
        title: 'Erro ao reverter atendimento',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Paciente revertido para agendado!' });
      setAppointments(prev =>
        prev.map(a =>
          a.id === appointmentId ? { ...a, status: 'SCHEDULED' } : a
        )
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-effect rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Minha Agenda</h3>
          <input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(new Date(e.target.value + 'T00:00:00'))}
            className="px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none"
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt, index) => (
              <motion.div
                key={apt.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-effect rounded-xl p-4 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="w-4 h-4 text-purple-600" />
                      <span className="font-semibold text-gray-900">
                        {new Date(apt.scheduled_start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - 
                        {new Date(apt.scheduled_end).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    <p className="text-purple-700 font-semibold">
                      {apt.patient?.name || 'Paciente não encontrado'}
                    </p>
                  </div>

                  <div className="flex flex-col items-end space-y-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        apt.status === 'SCHEDULED'
                          ? 'bg-blue-100 text-blue-700'
                          : apt.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-700'
                          : apt.status === 'NOT_ATTENDED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {apt.status === 'SCHEDULED'
                        ? 'Agendado'
                        : apt.status === 'COMPLETED'
                        ? 'Atendido'
                        : apt.status === 'NOT_ATTENDED'
                        ? 'Não atendido'
                        : 'Cancelado'}
                    </span>

                    <div className="flex space-x-2 mt-2">
                      <Button
                        size="sm"
                        className="gradient-primary text-white"
                        onClick={() => apt.patient && onSelectPatient(apt.patient)}
                      >
                        Atender
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-600 text-blue-600 hover:bg-blue-50"
                        onClick={() => {
                          setSelectedPatientForPrescription(apt.patient);
                          setShowPrescriptionModal(true);
                        }}
                      >
                        Receita
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="border-purple-600 text-purple-600 hover:bg-purple-50"
                        onClick={() => {
                          setSelectedPatientForPrescription(apt.patient);
                          setShowSearchReports(true);
                        }}
                      >
                        Anamneses
                      </Button>

                      {apt.status === 'SCHEDULED' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkAsAttended(apt.id)}
                            className="border-green-600 text-green-600 hover:bg-green-50"
                          >
                            Atendido
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkAsNotAttended(apt.id)}
                            className="border-red-600 text-red-600 hover:bg-red-50"
                          >
                            Não atendido
                          </Button>
                        </>
                      )}

                      {(apt.status === 'COMPLETED' || apt.status === 'NOT_ATTENDED') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRevertToScheduled(apt.id)}
                          className="border-gray-600 text-gray-600 hover:bg-gray-50"
                        >
                          Reverter
                        </Button>
                      )}
                    </div>

                    {apt.status === 'COMPLETED' && (
                      <div className="flex items-center text-green-700 font-medium text-sm mt-1">
                        <CheckCircle className="w-4 h-4 mr-1" /> Atendido
                      </div>
                    )}

                    {apt.status === 'NOT_ATTENDED' && (
                      <div className="flex items-center text-red-700 font-medium text-sm mt-1">
                        <XCircle className="w-4 h-4 mr-1" /> Não atendido
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {appointments.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nenhum agendamento para esta data</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 🔹 Modal de Receita */}
      {showPrescriptionModal && (
        <CreatePrescriptionModal
          doctorId={doctorId}
          clinicId={clinicId}
          onClose={() => setShowPrescriptionModal(false)}
          onSuccess={loadAppointments}
          preselectedPatient={selectedPatientForPrescription}
        />
      )}

      {/* 🔹 Modal de Anamneses */}
      {showSearchReports && selectedPatientForPrescription && (
        <SearchReportsModal
          clinicId={clinicId}

          onClose={() => setShowSearchReports(false)}
        />
      )}
    </div>
  );
};

export default DoctorAgenda;