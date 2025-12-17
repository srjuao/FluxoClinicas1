import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Calendar,
  UserPlus,
  Search,
  Shield,
  DollarSign,
  Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { supabase } from "@/lib/customSupabaseClient";
import { toast } from "@/components/ui/use-toast";
import CreateUserModal from "@/components/CreateUserModal";
import ManageWorkHoursModal from "@/components/ManageWorkHoursModal";
import DoctorMonthlyCalendar from "@/components/DoctorMonthlyCalendar";
import PatientManagementModal from "@/components/PatientManagementModal";
import FinancialManagement from "@/components/FinancialManagement";
import type {
  Profile,
  Doctor,
  DoctorWithProfileName,
} from "@/types/database.types";

// Interface para médicos com perfil
interface DoctorWithProfile {
  user_id: string;
  crm: string;
  name: string;
  id: string;
}

// 🔹 Autocomplete de Médicos (copiado do ReceptionistDashboard)
interface DoctorAutocompleteProps {
  clinicId: string;
  selectedDoctor: string | null;
  setSelectedDoctor: (doctorId: string | null) => void;
}

const DoctorAutocomplete: React.FC<DoctorAutocompleteProps> = ({
  clinicId,
  selectedDoctor,
  setSelectedDoctor,
}) => {
  const [doctors, setDoctors] = useState<DoctorWithProfile[]>([]);
  const [query, setQuery] = useState("");
  const [filteredDoctors, setFilteredDoctors] = useState<DoctorWithProfile[]>(
    []
  );
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!clinicId) return;

    const fetchDoctors = async () => {
      const { data: doctorsData, error: doctorsError } = await supabase
        .from("doctors")
        .select("user_id, crm, id")
        .eq("clinic_id", clinicId);

      if (doctorsError) return console.error(doctorsError);

      const userIds = doctorsData.map((d: { user_id: string }) => d.user_id);
      if (!userIds.length) return setDoctors([]);

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", userIds);

      const merged = doctorsData.map((d: { user_id: string; crm: string }) => {
        const profile = profilesData?.find(
          (p: { id: string; name: string }) => p.id === d.user_id
        );
        return { ...d, name: profile?.name || "Sem nome" };
      });

      setDoctors(merged);
      setFilteredDoctors(merged);
    };

    fetchDoctors();
  }, [clinicId]);

  useEffect(() => {
    const filtered = doctors.filter((d) =>
      d.name.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredDoctors(filtered);
  }, [query, doctors]);

  return (
    <div className="relative w-64">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        placeholder="Filtrar médico"
        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
      />

      {showDropdown && (
        <ul className="absolute z-10 bg-white border border-gray-200 w-full mt-1 max-h-40 overflow-y-auto rounded-lg shadow">
          <li
            className="px-3 py-2 hover:bg-purple-100 cursor-pointer"
            onClick={() => {
              setSelectedDoctor(null);
              setQuery("");
              setShowDropdown(false);
            }}
          >
            Todos os médicos
          </li>
          {filteredDoctors.map((d) => (
            <li
              key={d.user_id}
              className="px-3 py-2 hover:bg-purple-100 cursor-pointer"
              onClick={() => {
                setSelectedDoctor(d.id);
                setQuery(d.name);
                setShowDropdown(false);
              }}
            >
              {d.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

interface ClinicAdminContentProps {
  defaultTab?: 'planner' | 'users' | 'financial';
}

// Componente reutilizável com o conteúdo do dashboard de admin (sem navbar)
const ClinicAdminContent = ({ defaultTab = 'planner' }: ClinicAdminContentProps) => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [doctors, setDoctors] = useState<DoctorWithProfileName[]>([]);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [showWorkHours, setShowWorkHours] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [userSearch, setUserSearch] = useState("");
  // Estados do Planner
  const [plannerSelectedDoctor, setPlannerSelectedDoctor] = useState<string | null>(null);
  const [showPatientManagement, setShowPatientManagement] = useState(false);

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

  return (
    <>
      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="glass-effect p-1">
          <TabsTrigger
            value="planner"
            className="data-[state=active]:gradient-primary data-[state=active]:text-white"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Planner
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="data-[state=active]:gradient-primary data-[state=active]:text-white"
          >
            <Users className="w-4 h-4 mr-2" />
            Usuários
          </TabsTrigger>
          <TabsTrigger
            value="financial"
            className="data-[state=active]:gradient-primary data-[state=active]:text-white"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Financeiro
          </TabsTrigger>
        </TabsList>

        <TabsContent value="planner">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                Planner Semanal dos Médicos
              </h2>

              <div className="flex gap-2">
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
                  className="bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Gerenciar Pacientes
                </Button>
              </div>
            </div>

            {/* Calendário Mensal */}
            <DoctorMonthlyCalendar
              clinicId={clinicId || ""}
              doctorId={plannerSelectedDoctor}
            />
          </div>
        </TabsContent>

        <TabsContent value="users">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                Equipe da Clínica
              </h2>

              <Button
                onClick={() => {
                  setSelectedUser(null);
                  setShowCreateUser(true);
                }}
                className="gradient-primary text-white"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Novo Usuário
              </Button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, email ou perfil..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  // Remove prefixos Dr/Dra para ordenação
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
                      transition={{ delay: index * 0.1 }}
                      className="glass-effect rounded-xl p-4 flex flex-col"
                    >
                      <div className="flex flex-1 items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">
                              {u.name}
                            </h3>
                            {u.is_admin && (
                              <span title="Privilégios de Administrador">
                                <Shield className="w-4 h-4 text-purple-600" />
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{u.email}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${u.role === "DOCTOR"
                              ? "bg-blue-100 text-blue-700"
                              : u.role === "RECEPTIONIST"
                                ? "bg-green-100 text-green-700"
                                : "bg-purple-100 text-purple-700"
                              }`}
                          >
                            {u.role === "DOCTOR"
                              ? "Médico"
                              : u.role === "RECEPTIONIST"
                                ? "Recepção"
                                : "Admin"}
                          </span>
                          {u.is_admin && u.role !== "CLINIC_ADMIN" && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                              Admin
                            </span>
                          )}
                        </div>
                      </div>

                      {doctor && (
                        <p className="text-xs text-gray-600 mb-2">
                          CRM: {doctor.crm}
                        </p>
                      )}

                      <div className="flex space-x-2 mt-2">
                        {doctor && (
                          <Button
                            onClick={() => handleManageWorkHours(doctor, u)}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            <Edit className="w-3 h-3 mr-2" />
                            Editar Horários
                          </Button>
                        )}

                        <Button
                          onClick={() => {
                            setSelectedUser(u);
                            if (doctor) setSelectedDoctor(doctor as Doctor);
                            setShowCreateUser(true);
                          }}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          Editar
                        </Button>

                        <Button
                          onClick={() => handleDeleteUser(u)}
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                        >
                          Excluir
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          </div>
        </TabsContent>

        {/* Financeiro */}
        <TabsContent value="financial">
          <FinancialManagement clinicId={clinicId || ""} />
        </TabsContent>
      </Tabs>

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
    </>
  );
};

export default ClinicAdminContent;

