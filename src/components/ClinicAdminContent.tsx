import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Calendar,
  UserPlus,
  Search,
  Shield,
  DollarSign,
  Edit,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { supabase } from "@/lib/customSupabaseClient";
import { toast } from "@/components/ui/use-toast";
import CreateUserModal from "@/components/CreateUserModal";
import ManageWorkHoursModal from "@/components/ManageWorkHoursModal";
import DoctorMonthlyCalendar from "@/components/DoctorMonthlyCalendar";
import PatientManagementModal from "@/components/PatientManagementModal";
import FinancialModule, { financialMenuItems } from "@/components/FinancialModule";
import type {
  Profile,
  Doctor,
  DoctorWithProfileName,
} from "@/types/database.types";

import DoctorAutocomplete from "@/components/DoctorAutocomplete";

interface ClinicAdminContentProps {
  defaultTab?: 'planner' | 'users' | 'financial';
}

const ClinicAdminContent = ({ defaultTab = 'planner' }: ClinicAdminContentProps) => {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [financialSubTab, setFinancialSubTab] = useState("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [users, setUsers] = useState<Profile[]>([]);
  const [doctors, setDoctors] = useState<DoctorWithProfileName[]>([]);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [showWorkHours, setShowWorkHours] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [plannerSelectedDoctor, setPlannerSelectedDoctor] = useState<string | null>(null);
  const [showPatientManagement, setShowPatientManagement] = useState(false);

  const clinicId = profile?.clinic_id;

  // Detect Mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
      `Tem certeza que deseja excluir ${user.name}?`
    );
    if (!confirmDelete) return;

    try {
      if (user.role === "DOCTOR") {
        const { error: doctorError } = await supabase
          .from("doctors")
          .delete()
          .eq("user_id", user.id);
        if (doctorError) throw doctorError;
      }

      const { error: userError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", user.id);
      if (userError) throw userError;

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

  return (
    <div className="flex bg-gray-50 min-h-screen">
      {/* Mobile Toggle Button */}
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

      {/* Sidebar Overlay */}
      {isMobile && isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black z-40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={isMobile ? { x: isMobileMenuOpen ? 0 : -280 } : { x: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`
            fixed lg:sticky top-0 left-0 z-50 h-screen w-72 bg-white border-r border-gray-200 flex flex-col
            ${isMobile ? "shadow-2xl" : ""}
        `}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-100 hidden lg:flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white shadow-lg shadow-purple-200">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-gray-900">FluxoClinic</h1>
            <p className="text-xs text-gray-500">Gestão Inteligente</p>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filteredMenuItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            const isFinancial = item.id === 'financial';

            return (
              <div key={item.id}>
                <button
                  onClick={() => {
                    setActiveTab(item.id as any);
                    if (!isFinancial && isMobile) setIsMobileMenuOpen(false);
                  }}
                  className={`
                        w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                        ${isActive
                      ? "bg-purple-50 text-purple-700 shadow-sm border border-purple-100"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }
                    `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isActive ? "text-purple-600" : "text-gray-400"}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && !isFinancial && <ChevronRight className="w-4 h-4 text-purple-400" />}
                  {isActive && isFinancial && <div className="w-4 h-4" />} {/* Spacer or arrow down */}
                </button>

                {/* Financial Submenu */}
                <AnimatePresence>
                  {isFinancial && isActive && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden ml-9 pt-1 space-y-1 border-l-2 border-purple-100 pl-2"
                    >
                      {financialMenuItems.filter(subItem => {
                        if (!isFinancialRestricted) return true;
                        // For restricted users (Cashier), only show specific tabs
                        return ["dashboard", "particular", "payroll"].includes(subItem.id);
                      }).map((subItem) => {
                        const SubIcon = subItem.icon;
                        const isSubActive = financialSubTab === subItem.id;
                        return (
                          <button
                            key={subItem.id}
                            onClick={() => {
                              setFinancialSubTab(subItem.id);
                              if (isMobile) setIsMobileMenuOpen(false);
                            }}
                            className={`
                                            w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors
                                            ${isSubActive ? "text-purple-700 bg-purple-50 font-medium" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"}
                                        `}
                          >
                            <SubIcon className={`w-4 h-4 ${isSubActive ? "text-purple-600" : "text-gray-400"}`} />
                            <span>{subItem.label}</span>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border-2 border-white shadow-sm">
              {profile?.name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{profile?.name}</p>
              <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
            onClick={() => signOut()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 pt-16 lg:pt-0">
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
                    </div>
                  </div>

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
    </div>
  );
};

export default ClinicAdminContent;
