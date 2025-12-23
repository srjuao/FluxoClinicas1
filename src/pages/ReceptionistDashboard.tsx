import { Helmet } from "react-helmet";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import ClinicAdminContent from "@/components/ClinicAdminContent";

const ReceptionistDashboard = () => {
  const { profile } = useAuth();

  return (
    <>
      <Helmet>
        <title>Planner - {profile?.name}</title>
        <meta name="description" content="Planner semanal" />
      </Helmet>

      {/* Reusing the Global Layout from ClinicAdminContent */}
      {/* Since Receptionist role filters are handled inside ClinicAdminContent, this will show only allowed items (Planner) */}
      <ClinicAdminContent defaultTab="planner" />
    </>
  );
};

export default ReceptionistDashboard;
