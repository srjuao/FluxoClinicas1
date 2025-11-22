import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Stethoscope, MessageSquare, Plus, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import CreateReportModal from '@/components/CreateReportModal';

const PatientDetailsPage = ({ patientId, onBack }) => {
  const { profile } = useAuth();
  const [patient, setPatient] = useState(null);
  const [reports, setReports] = useState([]);
  const [exams, setExams] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateReport, setShowCreateReport] = useState(false);
  const [doctorData, setDoctorData] = useState(null);

  // Fetch patient data
  useEffect(() => {
    const fetchPatientData = async () => {
      if (!patientId) return;
      
      setLoading(true);

      // Fetch patient info
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

      if (patientError) {
        toast({
          title: 'Erro ao carregar paciente',
          description: patientError.message,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      setPatient(patientData);

      // Fetch medical reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('medical_reports')
        .select('*, doctor:doctors(*, profile:profiles(name))')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (!reportsError) {
        setReports(reportsData || []);
      }

      // TODO: Fetch exams when table is available
      // TODO: Fetch internal notes when table is available

      setLoading(false);
    };

    fetchPatientData();
  }, [patientId]);

  // Fetch doctor data if user is a doctor
  useEffect(() => {
    const fetchDoctorData = async () => {
      if (profile?.role !== 'DOCTOR') return;
      
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('user_id', profile.id)
        .single();

      if (!error) {
        setDoctorData(data);
      }
    };

    fetchDoctorData();
  }, [profile]);

  const calculateAge = (birthDate) => {
    if (!birthDate) return '';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Paciente não encontrado</p>
          <Button onClick={onBack}>Voltar</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Detalhes do Paciente - {patient.name}</title>
        <meta name="description" content="Detalhes do paciente" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50">
        {/* Header */}
        <div className="glass-effect border-b border-white/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Button
              onClick={onBack}
              variant="outline"
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>

            {/* Patient Header */}
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 rounded-full gradient-secondary flex items-center justify-center text-white text-2xl font-bold">
                {patient.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
                <p className='text-gray-600'>CPF: {patient.cpf}</p>
                <p className="text-gray-600">
                  {formatDate(patient.birth_date)}
                  {patient.birth_date && ` (${calculateAge(patient.birth_date)} anos)`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Previous Reports */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-effect rounded-2xl p-6 h-fit"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Anamneses Anteriores</h2>
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {reports.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">
                    Nenhuma anamnese registrada
                  </p>
                ) : (
                  reports.map((report, index) => (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 bg-red-200/50 rounded-xl hover:bg-white/80 transition-all cursor-pointer"
                    >
                      <h3 className="font-semibold text-gray-900 text-sm mb-1">
                        {report.title}
                      </h3>
                      <p className="text-xs text-gray-700 mb-2">
                        Dr(a). {report.doctor?.profile?.name || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(report.created_at)}
                      </p>
                      <p className="text-xs text-gray-800 mt-2 line-clamp-4">
                        {report.content}
                      </p>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Middle Column - Exams */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-effect rounded-2xl p-6 h-fit"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Exames</h2>
                <Stethoscope className="w-5 h-5 text-purple-600" />
              </div>
              
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {exams.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">
                    Nenhum exame registrado
                  </p>
                ) : (
                  exams.map((exam, index) => (
                    <motion.div
                      key={exam.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 bg-white/50 rounded-xl hover:bg-white/80 transition-all cursor-pointer"
                    >
                      <h3 className="font-semibold text-gray-900 text-sm mb-1">
                        {exam.title}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {formatDate(exam.date)}
                      </p>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Right Column - Internal Chat & Actions */}
            <div className="space-y-6">
              {/* Internal Chat */}
              {/* <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-effect rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Chat Interno</h2>
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                </div>
                
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {notes.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                      Nenhuma nota interna
                    </p>
                  ) : (
                    notes.map((note, index) => (
                      <motion.div
                        key={note.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-3 bg-white/50 rounded-lg"
                      >
                        <p className="text-xs text-gray-700">{note.content}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {note.author} - {formatDate(note.created_at)}
                        </p>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div> */}

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-3"
              >
                <Button
                  onClick={() => setShowCreateReport(true)}
                  disabled={!doctorData}
                  className="w-full gradient-primary text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Anamnese
                </Button>

                <Button
                  variant="outline"
                  className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Atestado
                </Button>

                <Button
                  variant="outline"
                  className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Receita
                </Button>

                <Button
                  variant="outline"
                  className="w-full bg-green-100 hover:bg-green-200 text-green-700 border-green-300"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Paciente Atendido
                </Button>

                <Button
                  variant="outline"
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
                >
                  <Stethoscope className="w-4 h-4 mr-2" />
                  Pedido de Exame
                </Button>

                <Button
                  variant="outline"
                  className="w-full bg-red-100 hover:bg-red-200 text-red-700 border-red-300"
                >
                  Paciente não Atendido
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreateReport && doctorData && (
        <CreateReportModal
          doctorId={doctorData.id}
          clinicId={profile?.clinic_id}
          defaultPatient={patient}
          onClose={() => setShowCreateReport(false)}
          onSuccess={() => {
            setShowCreateReport(false);
            // Refresh reports
            const fetchReports = async () => {
              const { data } = await supabase
                .from('medical_reports')
                .select('*, doctor:doctors(*, profile:profiles(name))')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false });
              if (data) setReports(data);
            };
            fetchReports();
          }}
        />
      )}
    </>
  );
};

export default PatientDetailsPage;
