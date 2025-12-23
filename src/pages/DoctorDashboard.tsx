import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Calendar, FileText, LogOut, Plus, Search, Users, DollarSign, Menu, X, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import UnifiedSidebar, { SidebarItem, SidebarSection } from "@/components/UnifiedSidebar";

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

  // Estado para navegação do menu lateral
  const [activeSection, setActiveSection] = useState<ActiveSection>('agenda');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const medicalItems: SidebarItem[] = [
    { id: 'agenda', label: 'Minha Agenda', icon: Calendar },
    { id: 'reports', label: 'Anamneses', icon: FileText },
  ];

  const adminItems: SidebarItem[] = [
    { id: 'planner', label: 'Planner', icon: Calendar },
    { id: 'users', label: 'Usuários', icon: Users },
    { id: 'financial', label: 'Financeiro', icon: DollarSign },
  ];

  const sidebarSections: SidebarSection[] = [];

  // Sempre adiciona Área Médica
  sidebarSections.push({
    title: "Área Médica",
    items: medicalItems
  });

  // Só adiciona Administração se for admin
  if (profile?.is_admin) {
    sidebarSections.push({
      title: "Administração",
      items: adminItems
    });
  }

  return (
    <>
      <Helmet>
        <title>Médico - {profile?.name}</title>
        <meta name="description" content="Painel do médico" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 flex flex-col lg:flex-row">

        {/* Mobile Header Toggle */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white">
              <Stethoscope className="w-5 h-5" />
            </div>
            <span className="font-bold text-gray-900">FluxoClinic</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Sidebar Unificado */}
        <UnifiedSidebar
          sections={sidebarSections}
          activeTab={activeSection}
          onTabChange={(tab) => setActiveSection(tab as ActiveSection)}
          userProfile={{
            name: profile?.name,
            email: profile?.email,
            role: profile?.is_admin ? "Médico Admin" : "Médico"
          }}
          onLogout={signOut}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />

        {/* Conteúdo Principal */}
        <div className="flex-1 min-w-0 pt-16 lg:pt-0">
          <div className="p-4 lg:p-8 max-w-[1600px] mx-auto">
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
