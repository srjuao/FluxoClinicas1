import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import { Building2, Plus, Users, LogOut, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import CreateClinicModal from "@/components/CreateClinicModal";
import CreateClinicAdminModal from "@/components/CreateClinicAdminModal";

const SuperAdminDashboard = () => {
  const { signOut, profile } = useAuth();
  const [clinics, setClinics] = useState([]);
  const [showCreateClinic, setShowCreateClinic] = useState(false);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState(null);

  const loadClinics = useCallback(async () => {
    const { data, error } = await supabase.from("clinics").select("*");
    if (error) {
      toast({
        title: "Erro ao carregar clínicas",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setClinics(data);
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

  const handleCreateAdmin = (clinic: any) => {
    setSelectedClinic(clinic);
    setShowCreateAdmin(true);
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

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50">
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
                className="glass-effect rounded-2xl p-6 hover:shadow-2xl transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl gradient-secondary flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                    Ativa
                  </span>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {clinic.name}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  CNPJ: {clinic.cnpj}
                </p>

                <div className="space-y-2">
                  <Button
                    onClick={() => handleImpersonate(clinic)}
                    className="w-full gradient-primary text-white"
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
    </>
  );
};

export default SuperAdminDashboard;
