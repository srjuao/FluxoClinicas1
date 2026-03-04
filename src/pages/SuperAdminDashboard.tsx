import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Building2, Plus, Users, LogOut, UserPlus, Settings, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import CreateClinicModal from "@/components/CreateClinicModal";
import CreateClinicAdminModal from "@/components/CreateClinicAdminModal";
import EditClinicModal from "@/components/EditClinicModal";
import type { Clinic } from "@/types/database.types";

interface ClinicWithUserCount extends Clinic {
  user_count?: number;
}

const SuperAdminDashboard = () => {
  const { signOut, profile } = useAuth();
  const [clinics, setClinics] = useState<ClinicWithUserCount[]>([]);
  const [showCreateClinic, setShowCreateClinic] = useState(false);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [showEditClinic, setShowEditClinic] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);

  const loadClinics = useCallback(async () => {
    const { data, error } = await supabase.from("clinics").select("*");
    if (error) {
      toast({
        title: "Erro ao carregar clínicas",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Carregar contagem de usuários por clínica
      const clinicsWithCount = await Promise.all(
        (data || []).map(async (clinic: Clinic) => {
          const { count } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("clinic_id", clinic.id);
          return { ...clinic, user_count: count || 0 };
        })
      );
      setClinics(clinicsWithCount);
    }
  }, []);

  useEffect(() => {
    loadClinics();
  }, [loadClinics]);

  const handleImpersonate = async (_clinic: any) => {
    toast({
      title: "🚧 Funcionalidade em desenvolvimento",
      description: "Acessar como admin ainda não foi implementado.",
    });
  };

  const handleCreateAdmin = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setShowCreateAdmin(true);
  };

  const handleEditClinic = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setShowEditClinic(true);
  };

  const handleDeleteClinic = async (clinic: ClinicWithUserCount) => {
    // Verificar se tem usuários
    if (clinic.user_count && clinic.user_count > 0) {
      const confirmWithUsers = window.confirm(
        `⚠️ ATENÇÃO: A clínica "${clinic.name}" possui ${clinic.user_count} usuário(s) cadastrado(s).\n\nTodos os usuários, médicos, pacientes, consultas e dados relacionados serão PERMANENTEMENTE excluídos.\n\nTem certeza que deseja continuar?`
      );
      if (!confirmWithUsers) return;
    }

    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir a clínica "${clinic.name}"?\n\nEsta ação não pode ser desfeita.`
    );
    if (!confirmDelete) return;

    try {
      // Excluir dados relacionados em ordem (devido às foreign keys)
      // 1. Excluir consultas
      await supabase.from("appointments").delete().eq("clinic_id", clinic.id);

      // 2. Excluir prescrições
      await supabase.from("prescriptions").delete().eq("clinic_id", clinic.id);

      // 3. Excluir atestados
      await supabase.from("medical_certificates").delete().eq("clinic_id", clinic.id);

      // 4. Excluir laudos
      await supabase.from("medical_reports").delete().eq("clinic_id", clinic.id);

      // 5. Excluir horários dos médicos
      await supabase.from("doctor_work_hours").delete().eq("clinic_id", clinic.id);

      // 6. Excluir médicos
      await supabase.from("doctors").delete().eq("clinic_id", clinic.id);

      // 7. Excluir pacientes
      await supabase.from("patients").delete().eq("clinic_id", clinic.id);

      // 8. Excluir perfis/usuários
      await supabase.from("profiles").delete().eq("clinic_id", clinic.id);

      // 9. Finalmente excluir a clínica
      const { error } = await supabase.from("clinics").delete().eq("id", clinic.id);

      if (error) throw error;

      toast({
        title: "Clínica excluída com sucesso!",
        description: `${clinic.name} foi removida da plataforma.`,
      });

      loadClinics();
    } catch (error) {
      toast({
        title: "Erro ao excluir clínica",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Super Admin - Gestão de Clínicas</title>
        <meta
          name="description"
          content="Painel do super administrador para gestão de clínicas"
        />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 dark:from-[#161022] dark:via-[#1a1329] dark:to-[#161022]">
        <nav className="glass-effect border-b border-white/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">
                    Super Admin
                  </h1>
                  <p className="text-xs text-gray-600">{profile?.name}</p>
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                Clínicas Cadastradas
              </h2>
              <p className="text-gray-600 mt-1">
                Gerencie todas as clínicas da plataforma
              </p>
            </div>

            <Button
              onClick={() => setShowCreateClinic(true)}
              className="gradient-primary text-white shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nova Clínica
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clinics.map((clinic, index) => (
              <motion.div
                key={clinic.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`glass-effect rounded-2xl p-6 hover:shadow-2xl transition-all ${!clinic.is_active ? "opacity-60" : ""
                  }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl gradient-secondary flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${clinic.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                        }`}
                    >
                      {clinic.is_active ? "Ativa" : "Inativa"}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditClinic(clinic)}
                        className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                        title="Editar clínica"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClinic(clinic)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Excluir clínica"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {clinic.name}
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  CNPJ: {clinic.cnpj || "Não informado"}
                </p>

                {/* Info de usuários */}
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {clinic.user_count} usuário(s)
                    {clinic.max_users && (
                      <span
                        className={
                          clinic.user_count && clinic.user_count >= clinic.max_users
                            ? "text-red-600 font-medium"
                            : ""
                        }
                      >
                        {" "}
                        / {clinic.max_users} máx.
                      </span>
                    )}
                    {!clinic.max_users && (
                      <span className="text-gray-400"> (ilimitado)</span>
                    )}
                  </span>
                  {clinic.max_users &&
                    clinic.user_count &&
                    clinic.user_count >= clinic.max_users && (
                      <span title="Limite atingido"><AlertCircle className="w-4 h-4 text-red-500" /></span>
                    )}
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={() => handleImpersonate(clinic)}
                    className="w-full gradient-primary text-white"
                    disabled={!clinic.is_active}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Acessar como Admin
                  </Button>

                  <Button
                    onClick={() => handleCreateAdmin(clinic)}
                    variant="outline"
                    className="w-full"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Criar Admin
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>

          {clinics.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                Nenhuma clínica cadastrada ainda. Crie uma para começar!
              </p>
            </div>
          )}
        </div>
      </div>

      {showCreateClinic && (
        <CreateClinicModal
          onClose={() => setShowCreateClinic(false)}
          onSuccess={() => {
            loadClinics();
            setShowCreateClinic(false);
          }}
        />
      )}

      {showCreateAdmin && selectedClinic && (
        <CreateClinicAdminModal
          clinic={selectedClinic}
          onClose={() => {
            setShowCreateAdmin(false);
            setSelectedClinic(null);
          }}
          onSuccess={() => {
            setShowCreateAdmin(false);
            setSelectedClinic(null);
          }}
        />
      )}

      {showEditClinic && selectedClinic && (
        <EditClinicModal
          clinic={selectedClinic}
          onClose={() => {
            setShowEditClinic(false);
            setSelectedClinic(null);
          }}
          onSuccess={() => {
            loadClinics();
            setShowEditClinic(false);
            setSelectedClinic(null);
          }}
        />
      )}
    </>
  );
};

export default SuperAdminDashboard;
