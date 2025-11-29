import { Helmet } from "react-helmet";
import { Toaster } from "@/components/ui/toaster";
import LoginPage from "@/pages/LoginPage";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";
import ClinicAdminDashboard from "@/pages/ClinicAdminDashboard";
import DoctorDashboard from "@/pages/DoctorDashboard";
import ReceptionistDashboard from "@/pages/ReceptionistDashboard";
import { useAuth } from "@/contexts/SupabaseAuthContext";

function App() {
  const { user, loading, profile } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return <LoginPage />;
  }

  const renderDashboard = () => {
    switch (profile.role) {
      case "SUPER_ADMIN":
        return <SuperAdminDashboard />;
      case "CLINIC_ADMIN":
        // Verifique se a clínica foi carregada antes de renderizar
        if (profile.clinic) {
          return <ClinicAdminDashboard />;
        }
        // Se a clínica ainda não carregou (devido a RLS ou outro problema), mostre um loading ou erro.
        return (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50">
            Carregando dados da clínica...
          </div>
        );
      case "DOCTOR":
        // Médicos sempre veem seu dashboard, mas podem ter aba de admin se is_admin = true
        return <DoctorDashboard />;
      case "RECEPTIONIST":
        // Recepcionistas sempre veem seu dashboard, mas podem ter aba de admin se is_admin = true
        return <ReceptionistDashboard />;
      default:
        return <LoginPage />;
    }
  };

  return (
    <>
      <Helmet>
        <title>Sistema de Gestão de Clínicas Médicas</title>
        <meta
          name="description"
          content="Sistema SaaS multi-tenant para gestão completa de clínicas médicas"
        />
      </Helmet>
      {renderDashboard()}
      <Toaster />
    </>
  );
}

export default App;
