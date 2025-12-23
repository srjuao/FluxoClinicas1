import { Helmet } from "react-helmet-async";
import { Building2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import ClinicAdminContent from "@/components/ClinicAdminContent";

const ClinicAdminDashboard = () => {
  const { signOut, profile } = useAuth();

  return (
    <>
      <Helmet>
        <title>Admin - {profile?.clinic?.name}</title>
        <meta name="description" content="Painel administrativo da clínica" />
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
                    {profile?.clinic?.name}
                  </h1>
                  <p className="text-xs text-gray-600">
                    {profile?.name} - {profile?.role === "CLINIC_ADMIN" ? "Admin" : profile?.is_admin ? "Admin (Privilégios)" : "Admin"}
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ClinicAdminContent />
        </div>
      </div>
    </>
  );
};

export default ClinicAdminDashboard;
