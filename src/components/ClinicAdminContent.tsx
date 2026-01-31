import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Calendar,
  Clock,
  UserPlus,
  Search,
  Shield,
  DollarSign,
  Edit,
  Menu,
  X,
  Stethoscope,
  LogOut,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { supabase } from "@/lib/customSupabaseClient";
import { supabaseAdmin } from "@/lib/customSupabaseAdmin";
import { toast } from "@/components/ui/use-toast";
import CreateUserModal from "@/components/CreateUserModal";
import ManageWorkHoursModal from "@/components/ManageWorkHoursModal";
import DoctorMonthlyCalendar from "@/components/DoctorMonthlyCalendar";
import PatientManagementModal from "@/components/PatientManagementModal";
import WhatsAppModal from "@/components/WhatsAppModal";
import FinancialModule, { financialMenuItems } from "@/components/FinancialModule";
import type {
  Profile,
  Doctor,
  DoctorWithProfileName,
} from "@/types/database.types";

import DoctorAutocomplete from "@/components/DoctorAutocomplete";
import DoctorsByDateSearch from "@/components/DoctorsByDateSearch";
import UnifiedSidebar, { SidebarItem, SidebarSection } from "@/components/UnifiedSidebar";

interface ClinicAdminContentProps {
  defaultTab?: 'planner' | 'users' | 'whatsapp' | 'financial';
  hideSidebar?: boolean;
}

const ClinicAdminContent = ({ defaultTab = 'planner', hideSidebar = false }: ClinicAdminContentProps) => {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [financialSubTab, setFinancialSubTab] = useState("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sync activeTab with defaultTab prop when it changes
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const [users, setUsers] = useState<Profile[]>([]);
  const [doctors, setDoctors] = useState<DoctorWithProfileName[]>([]);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [showWorkHours, setShowWorkHours] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [plannerSelectedDoctor, setPlannerSelectedDoctor] = useState<string | null>(null);
  const [showPatientManagement, setShowPatientManagement] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);

  const clinicId = profile?.clinic_id;


  const loadData = useCallback(async () => {
    if (!clinicId) return;

    const { data: usersData, error: usersError } = await supabase
      .from("profiles")
      .select("*")
      .eq("clinic_id", clinicId);

    if (usersError) {
      toast({
        title: "Erro ao carregar usuários",
        description: usersError.message,
        variant: "destructive",
      });
    } else {
      setUsers(usersData || []);
    }

    const { data: doctorsData, error: doctorsError } = await supabase
      .from("doctors")
      .select("*, profile:profiles(name)")
      .eq("clinic_id", clinicId);

    if (doctorsError) {
      toast({
        title: "Erro ao carregar médicos",
        description: doctorsError.message,
        variant: "destructive",
      });
    } else {
      setDoctors((doctorsData as DoctorWithProfileName[]) || []);
    }
  }, [clinicId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleManageWorkHours = (doctor: Doctor, user: Profile) => {
    setSelectedDoctor(doctor);
    setSelectedUser(user);
    setShowWorkHours(true);
  };

  const handleDeleteUser = async (user: Profile) => {
    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir ${user.name}? Esta ação é irreversível e removerá o acesso do usuário.`
    );
    if (!confirmDelete) return;

    if (user.id === profile?.id) {
      toast({
        title: "Operação não permitida",
        description: "Você não pode excluir sua própria conta.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (user.role === "DOCTOR") {
        // Primeiro, remover horários de trabalho (foreign key)
        await supabaseAdmin
          .from("doctor_work_hours")
          .delete()
          .eq("user_id", user.id);

        const { data: doc } = await supabaseAdmin
          .from("doctors")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (doc) {
          await supabaseAdmin
            .from("doctor_work_hours")
            .delete()
            .eq("doctor_id", doc.id);
        }

        const { error: doctorError } = await supabaseAdmin
          .from("doctors")
          .delete()
          .eq("user_id", user.id);

        if (doctorError) throw doctorError;
      }

      // Remover da tabela profiles
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Remover do Supabase Auth
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

      if (authError) {
        console.error("Auth Delete Error:", authError);
        // Não lançamos erro aqui para não travar o fluxo se o usuário já não existir no Auth
      }

      toast({ title: "Usuário excluído com sucesso!" });
      loadData();
    } catch (error) {
      toast({
        title: "Erro ao excluir usuário",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };



  const menuItems = [
    { id: 'planner', label: 'Planner', icon: Calendar, text: "Planner Semanal" },
    { id: 'users', label: 'Equipe', icon: Users, text: "Gestão de Equipe", roles: ["CLINIC_ADMIN", "ADMIN"] },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, text: "WhatsApp", roles: ["CLINIC_ADMIN", "ADMIN"] },
    { id: 'financial', label: 'Financeiro', icon: DollarSign, text: "Gestão Financeira", roles: ["CLINIC_ADMIN", "ADMIN"] },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (!item.roles) return true;
    // Check if user has one of the allowed roles
    if (profile?.is_admin) return true; // Super admin access everything

    // Allow financial access if user has the flag
    if (item.id === 'financial' && profile?.has_financial_access) return true;

    return item.roles.includes(profile?.role || "");
  });

  const isFinancialRestricted = !profile?.is_admin && !['CLINIC_ADMIN', 'ADMIN'].includes(profile?.role || "") && profile?.has_financial_access;

  // Build items for UnifiedSidebar
  const sidebarItems: SidebarItem[] = filteredMenuItems.map(item => {
    let subItems = undefined;
    if (item.id === 'financial') {
      const filteredFinancialItems = financialMenuItems.filter(subItem => {
        if (!isFinancialRestricted) return true;
        return ["dashboard", "particular", "payroll"].includes(subItem.id);
      });
      subItems = filteredFinancialItems.map(f => ({
        id: f.id,
        label: f.label,
        icon: f.icon
      }));
    }

    return {
      id: item.id,
      label: item.label,
      icon: item.icon,
      subItems: subItems
    };
  });

  const sidebarSections: SidebarSection[] = [
    {
      items: sidebarItems
    }
  ];

  return (
    <div className={hideSidebar ? "" : "flex bg-gray-50 min-h-screen"}>
      {/* Mobile Toggle Button */}
      {!hideSidebar && (
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
      )}

      {!hideSidebar && (
        <UnifiedSidebar
          sections={sidebarSections}
          activeTab={activeTab}
          activeSubTab={financialSubTab}
          onTabChange={setActiveTab as (tabId: string) => void}
          onSubTabChange={setFinancialSubTab}
          userProfile={{
            name: profile?.name,
            email: profile?.email,
            role: profile?.role
          }}
          onLogout={signOut}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
      )}

      {/* Main Content */}
      <main className={hideSidebar ? "flex-1 min-w-0" : "flex-1 min-w-0 pt-16 lg:pt-0"}>
        <div className="p-4 lg:p-8 max-w-[1600px] mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'planner' && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        Planner Semanal
                      </h2>
                      <p className="text-gray-500">Gerencie a agenda dos médicos e pacientes</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      {clinicId && (
                        <DoctorAutocomplete
                          clinicId={clinicId}
                          selectedDoctor={plannerSelectedDoctor}
                          setSelectedDoctor={setPlannerSelectedDoctor}
                        />
                      )}
                      <Button
                        onClick={() => setShowPatientManagement(true)}
                        variant="outline"
                        className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Pacientes
                      </Button>

                      {plannerSelectedDoctor && (profile?.is_admin || ['CLINIC_ADMIN', 'ADMIN'].includes(profile?.role || '')) && (
                        <Button
                          onClick={() => {
                            const doc = doctors.find(d => d.id === plannerSelectedDoctor);
                            const user = users.find(u => u.id === doc?.user_id);
                            if (doc && user) {
                              handleManageWorkHours(doc as Doctor, user);
                            }
                          }}
                          className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                          variant="outline"
                        >
                          <Clock className="w-4 h-4 mr-2" />
                          Configurar Horários
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Date Search for Receptionists */}
                  {clinicId && (
                    <DoctorsByDateSearch
                      clinicId={clinicId}
                      onSelectDoctor={(doctorId) => setPlannerSelectedDoctor(doctorId)}
                    />
                  )}

                  {/* Exibir nome do médico selecionado */}
                  {plannerSelectedDoctor && (
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      Calendário do Dr(a). {doctors.find(d => d.id === plannerSelectedDoctor)?.profile?.name || 'Médico'}
                    </h3>
                  )}

                  <DoctorMonthlyCalendar
                    clinicId={clinicId || ""}
                    doctorId={plannerSelectedDoctor}
                  />
                </div>
              )}

              {activeTab === 'users' && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        Equipe da Clínica
                      </h2>
                      <p className="text-gray-500">Gerencie médicos, recepcionistas e administradores</p>
                    </div>

                    <Button
                      onClick={() => {
                        setSelectedUser(null);
                        setShowCreateUser(true);
                      }}
                      className="gradient-primary text-white shadow-lg shadow-purple-200"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Novo Usuário
                    </Button>
                  </div>

                  {/* Search Bar */}
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nome, email ou função..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white shadow-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {users
                      .filter((u) => {
                        if (!userSearch) return true;
                        const search = userSearch.toLowerCase();
                        const roleLabel =
                          u.role === "DOCTOR"
                            ? "médico"
                            : u.role === "RECEPTIONIST"
                              ? "recepção"
                              : "admin";
                        return (
                          u.name.toLowerCase().includes(search) ||
                          u.email.toLowerCase().includes(search) ||
                          roleLabel.includes(search)
                        );
                      })
                      .sort((a, b) => {
                        const cleanName = (name: string) =>
                          name.replace(/^(dr\.?a?\.?\s+)/i, '').trim();
                        return cleanName(a.name).localeCompare(cleanName(b.name), 'pt-BR');
                      })
                      .map((u, index) => {
                        const doctor = doctors.find((d) => d.user_id === u.id);

                        return (
                          <motion.div
                            key={u.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group"
                          >
                            <div className="flex flex-1 items-start justify-between mb-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-bold text-gray-900 truncate">
                                    {u.name}
                                  </h3>
                                  {u.is_admin && (
                                    <Shield className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-sm text-gray-500 truncate">{u.email}</p>
                              </div>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-bold ${u.role === "DOCTOR"
                                  ? "bg-blue-50 text-blue-700"
                                  : u.role === "RECEPTIONIST"
                                    ? "bg-green-50 text-green-700"
                                    : "bg-purple-50 text-purple-700"
                                  }`}
                              >
                                {u.role === "DOCTOR"
                                  ? "Médico"
                                  : u.role === "RECEPTIONIST"
                                    ? "Recepção"
                                    : "Admin"}
                              </span>
                            </div>

                            {doctor && (
                              <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 bg-gray-50 p-2 rounded-lg">
                                <Users className="w-3 h-3" />
                                <span>CRM: {doctor.crm}</span>
                              </div>
                            )}

                            <div className="flex gap-2 pt-2 border-t border-gray-50">
                              {doctor && (
                                <Button
                                  onClick={() => handleManageWorkHours(doctor, u)}
                                  variant="ghost"
                                  size="sm"
                                  className="flex-1 text-gray-600 hover:text-purple-600 hover:bg-purple-50"
                                  title="Horários"
                                >
                                  <Calendar className="w-4 h-4" />
                                </Button>
                              )}

                              <Button
                                onClick={() => {
                                  setSelectedUser(u);
                                  if (doctor) setSelectedDoctor(doctor as Doctor);
                                  setShowCreateUser(true);
                                }}
                                variant="ghost"
                                size="sm"
                                className="flex-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>

                              <Button
                                onClick={() => handleDeleteUser(u)}
                                variant="ghost"
                                size="sm"
                                className="flex-1 text-gray-600 hover:text-red-600 hover:bg-red-50"
                                title="Excluir"
                              >
                                <LogOut className="w-4 h-4" />
                              </Button>
                            </div>
                          </motion.div>
                        );
                      })}
                  </div>
                </div>
              )}

              {activeTab === 'whatsapp' && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        WhatsApp
                      </h2>
                      <p className="text-gray-500">Gerencie a conexão e envie mensagens</p>
                    </div>

                    <Button
                      onClick={() => setShowWhatsApp(true)}
                      className="bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-200"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Gerenciar WhatsApp
                    </Button>
                  </div>

                  <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                    <div className="flex flex-col items-center justify-center text-center py-8">
                      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                        <MessageCircle className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Integração WhatsApp
                      </h3>
                      <p className="text-gray-500 max-w-md mb-6">
                        Conecte o WhatsApp da clínica para enviar mensagens aos pacientes diretamente pelo sistema.
                      </p>
                      <Button
                        onClick={() => setShowWhatsApp(true)}
                        className="bg-green-500 hover:bg-green-600 text-white gap-2"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Abrir WhatsApp
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'financial' && (
                <div className="h-full flex flex-col">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {financialMenuItems.find(i => i.id === financialSubTab)?.label || "Financeiro"}
                    </h2>
                    <p className="text-gray-500">
                      {isFinancialRestricted ? " Modo Caixa (Acesso do Dia)" : "Gestão financeira completa"}
                    </p>
                  </div>
                  <div className="flex-1">
                    <FinancialModule
                      clinicId={clinicId || ""}
                      activeTab={financialSubTab}
                      isRestricted={!!isFinancialRestricted}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Modals */}
      {showCreateUser && clinicId && (
        <CreateUserModal
          clinicId={clinicId}
          userToEdit={selectedUser}
          doctorData={selectedDoctor}
          onClose={() => {
            setShowCreateUser(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            loadData();
            setShowCreateUser(false);
            setSelectedUser(null);
          }}
        />
      )}

      {showWorkHours && selectedDoctor && (
        <ManageWorkHoursModal
          doctor={selectedDoctor}
          user={selectedUser}
          clinicId={clinicId}
          onClose={() => {
            setShowWorkHours(false);
            setSelectedDoctor(null);
          }}
        />
      )}

      {showPatientManagement && clinicId && (
        <PatientManagementModal
          clinicId={clinicId}
          onClose={() => setShowPatientManagement(false)}
        />
      )}

      {showWhatsApp && (
        <WhatsAppModal onClose={() => setShowWhatsApp(false)} />
      )}
    </div>
  );
};

export default ClinicAdminContent;
