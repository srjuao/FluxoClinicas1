import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Calendar, FileText, LogOut, Plus, Search, Users, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { supabase } from "@/lib/customSupabaseClient";
import { toast } from "@/components/ui/use-toast";
import type { Doctor, Patient } from "@/types/database.types";

import DoctorAgenda from "@/components/DoctorAgenda";
import CreateReportModal from "@/components/CreateReportModal";
import CreateCertificateModal from "@/components/CreateCertificateModal";
import { SearchReportsModal } from "@/components/SearchReportsModal";
import PatientDetailsPage from "@/pages/PatientDetailsPage";
import ClinicAdminContent from "@/components/ClinicAdminContent";
import { Shield } from "lucide-react";

type ActiveSection = 'agenda' | 'reports' | 'planner' | 'users' | 'financial';

const DoctorDashboard = () => {
  const { signOut, profile, user } = useAuth();
  const clinicId = profile?.clinic_id;

  const [doctorData, setDoctorData] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);

  const [showCreateReport, setShowCreateReport] = useState(false);
  const [showCreateCertificate, setShowCreateCertificate] = useState(false);
  const [showSearchReports, setShowSearchReports] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [, setOpenFromAgenda] = useState(false);
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

  // Estado para navegação do menu árvore (para médicos admin)
  const [activeSection, setActiveSection] = useState<ActiveSection>('agenda');

  // 🔹 Restaurar rascunho ao montar o dashboard
  useEffect(() => {
    const saved = localStorage.getItem("reportDraft");
    if (saved) {
      const { patient } = JSON.parse(saved);
      if (patient) {
        setSelectedPatient(patient);
        setOpenFromAgenda(true);
        setShowCreateReport(true);
      }
    }
  }, []);

  // Buscar dados do médico
  const fetchDoctorData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("doctors")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error) {
      toast({
        title: "Erro ao buscar dados do médico",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setDoctorData(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchDoctorData();
  }, [fetchDoctorData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Show patient details page if selected
  if (showPatientDetails && selectedPatientId) {
    return (
      <PatientDetailsPage
        patientId={selectedPatientId}
        appointment={selectedAppointment}
        onBack={() => {
          setShowPatientDetails(false);
          setSelectedPatientId(null);
          setSelectedAppointment(null);
        }}
      />
    );
  }

  return (
    <>
      <Helmet>
        <title>Médico - {profile?.name}</title>
        <meta name="description" content="Painel do médico" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50">
        {/* Navbar */}
        <nav className="glass-effect border-b border-white/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full gradient-secondary flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">
                    Bem-vindo Dr(a). {profile?.name}
                  </h1>
                  <p className="text-xs text-gray-600">
                    CRM: {doctorData?.crm}
                  </p>
                </div>
              </div>
              <Button
                onClick={signOut}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
              </Button>
            </div>
          </div>
        </nav>

        {/* Conteúdo principal com menu árvore para admins */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {profile?.is_admin ? (
            // Layout com menu árvore para médico admin
            <div className="flex gap-6">
              {/* Sidebar Menu Árvore */}
              <div className="w-64 flex-shrink-0">
                <div className="glass-effect rounded-xl p-4 sticky top-24">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    Menu
                  </h3>
                  <nav className="space-y-1">
                    {/* Área do Médico */}
                    <div className="mb-4">
                      <p className="text-xs font-medium text-purple-600 mb-2 flex items-center">
                        <FileText className="w-4 h-4 mr-1" />
                        Área Médica
                      </p>
                      <ul className="ml-4 space-y-1 border-l-2 border-purple-100 pl-3">
                        <li>
                          <button
                            onClick={() => setActiveSection('agenda')}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${activeSection === 'agenda'
                              ? 'bg-purple-100 text-purple-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-100'
                              }`}
                          >
                            <Calendar className="w-4 h-4" />
                            Minha Agenda
                          </button>
                        </li>
                        <li>
                          <button
                            onClick={() => setActiveSection('reports')}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${activeSection === 'reports'
                              ? 'bg-purple-100 text-purple-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-100'
                              }`}
                          >
                            <FileText className="w-4 h-4" />
                            Anamneses
                          </button>
                        </li>
                      </ul>
                    </div>

                    {/* Área Administrativa */}
                    <div>
                      <p className="text-xs font-medium text-blue-600 mb-2 flex items-center">
                        <Shield className="w-4 h-4 mr-1" />
                        Administração
                      </p>
                      <ul className="ml-4 space-y-1 border-l-2 border-blue-100 pl-3">
                        <li>
                          <button
                            onClick={() => setActiveSection('planner')}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${activeSection === 'planner'
                              ? 'bg-blue-100 text-blue-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-100'
                              }`}
                          >
                            <Calendar className="w-4 h-4" />
                            Planner
                          </button>
                        </li>
                        <li>
                          <button
                            onClick={() => setActiveSection('users')}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${activeSection === 'users'
                              ? 'bg-blue-100 text-blue-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-100'
                              }`}
                          >
                            <Users className="w-4 h-4" />
                            Usuários
                          </button>
                        </li>
                        <li>
                          <button
                            onClick={() => setActiveSection('financial')}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${activeSection === 'financial'
                              ? 'bg-blue-100 text-blue-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-100'
                              }`}
                          >
                            <DollarSign className="w-4 h-4" />
                            Financeiro
                          </button>
                        </li>
                      </ul>
                    </div>
                  </nav>
                </div>
              </div>

              {/* Conteúdo Principal */}
              <div className="flex-1">
                {activeSection === 'agenda' && doctorData && (
                  <DoctorAgenda
                    doctorId={doctorData.id}
                    clinicId={clinicId}
                    onSelectPatient={(patient: any, appointment: any) => {
                      setSelectedPatientId(patient.id);
                      setSelectedAppointment(appointment);
                      setShowPatientDetails(true);
                    }}
                  />
                )}

                {activeSection === 'reports' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-gray-900">
                        Anamneses
                      </h2>
                      <div className="flex space-x-3">
                        <Button
                          onClick={() => setShowSearchReports(true)}
                          variant="outline"
                        >
                          <Search className="w-4 h-4 mr-2" /> Buscar
                        </Button>
                        <Button
                          onClick={() => setShowCreateReport(true)}
                          className="gradient-primary text-white"
                          disabled={!doctorData}
                        >
                          <Plus className="w-4 h-4 mr-2" /> Novo Anamnese
                        </Button>
                        <Button
                          onClick={() => setShowCreateCertificate(true)}
                          className="gradient-secondary text-white"
                          disabled={!doctorData}
                        >
                          <FileText className="w-4 h-4 mr-2" /> Atestado
                        </Button>
                      </div>
                    </div>

                    <div className="glass-effect rounded-xl p-8 text-center">
                      <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">
                        Use os botões acima para criar ou buscar Anamnese ou
                        atestados.
                      </p>
                    </div>
                  </div>
                )}

                {(activeSection === 'planner' || activeSection === 'users' || activeSection === 'financial') && (
                  <ClinicAdminContent defaultTab={activeSection} />
                )}
              </div>
            </div>
          ) : (
            // Layout original com tabs para médico sem admin
            <Tabs defaultValue="agenda" className="space-y-6">
              <TabsList className="glass-effect p-1">
                <TabsTrigger
                  value="agenda"
                  className="data-[state=active]:gradient-primary data-[state=active]:text-white"
                >
                  <Calendar className="w-4 h-4 mr-2" /> Minha Agenda
                </TabsTrigger>
                <TabsTrigger
                  value="reports"
                  className="data-[state=active]:gradient-primary data-[state=active]:text-white"
                >
                  <FileText className="w-4 h-4 mr-2" /> Anamneses
                </TabsTrigger>
              </TabsList>

              {/* Agenda */}
              <TabsContent value="agenda">
                {doctorData && (
                  <DoctorAgenda
                    doctorId={doctorData.id}
                    clinicId={clinicId}
                    onSelectPatient={(patient: any, appointment: any) => {
                      setSelectedPatientId(patient.id);
                      setSelectedAppointment(appointment);
                      setShowPatientDetails(true);
                    }}
                  />
                )}
              </TabsContent>

              {/* Anamneses */}
              <TabsContent value="reports">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">
                      Anamneses
                    </h2>
                    <div className="flex space-x-3">
                      <Button
                        onClick={() => setShowSearchReports(true)}
                        variant="outline"
                      >
                        <Search className="w-4 h-4 mr-2" /> Buscar
                      </Button>
                      <Button
                        onClick={() => setShowCreateReport(true)}
                        className="gradient-primary text-white"
                        disabled={!doctorData}
                      >
                        <Plus className="w-4 h-4 mr-2" /> Novo Anamnese
                      </Button>
                      <Button
                        onClick={() => setShowCreateCertificate(true)}
                        className="gradient-secondary text-white"
                        disabled={!doctorData}
                      >
                        <FileText className="w-4 h-4 mr-2" /> Atestado
                      </Button>
                    </div>
                  </div>

                  <div className="glass-effect rounded-xl p-8 text-center">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      Use os botões acima para criar ou buscar Anamnese ou
                      atestados.
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Modais */}
      {showCreateReport && doctorData && clinicId && (
        <CreateReportModal
          doctorId={doctorData.id}
          clinicId={clinicId}
          defaultPatient={selectedPatient || null}
          onClose={() => {
            setShowCreateReport(false);
            setSelectedPatient(null);
            setOpenFromAgenda(false);
          }}
          onSuccess={() => {
            setShowCreateReport(false);
            setSelectedPatient(null);
            setOpenFromAgenda(false);
          }}
        />
      )}

      {showCreateCertificate && doctorData && clinicId && (
        <CreateCertificateModal
          doctorId={doctorData.id}
          clinicId={clinicId}
          onClose={() => setShowCreateCertificate(false)}
        />
      )}

      {showSearchReports && clinicId && (
        <SearchReportsModal
          clinicId={clinicId}
          preselectedPatient={null}
          onClose={() => setShowSearchReports(false)}
        />
      )}
    </>
  );
};

export default DoctorDashboard;
