// ======================== ReceptionistDashboard.jsx ========================

import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { Calendar, LogOut, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import ReceptionistCalendar from "@/components/ReceptionistCalendar"; // agora Planner Semanal
import CreateAppointmentModal from "@/components/CreateAppointmentModal";
import PatientDetailsPage from "@/pages/PatientDetailsPage";
import { supabase } from "@/lib/customSupabaseClient";

// 🔹 Autocomplete de Médicos
const DoctorAutocomplete = ({
  clinicId,
  selectedDoctor,
  setSelectedDoctor,
}) => {
  const [doctors, setDoctors] = useState([]);
  const [query, setQuery] = useState("");
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!clinicId) return;

    const fetchDoctors = async () => {
      const { data: doctorsData, error: doctorsError } = await supabase
        .from("doctors")
        .select("user_id, crm")
        .eq("clinic_id", clinicId);

      if (doctorsError) return console.error(doctorsError);

      const userIds = doctorsData.map((d) => d.user_id);
      if (!userIds.length) return setDoctors([]);

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", userIds);

      const merged = doctorsData.map((d) => {
        const profile = profilesData.find((p) => p.id === d.user_id);
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
              setSelectedDoctor("");
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
                setSelectedDoctor(d.user_id);
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

const ReceptionistDashboard = () => {
  const { signOut, profile } = useAuth();
  const clinicId = profile?.clinic_id;

  const [showCreateAppointment, setShowCreateAppointment] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedDoctor, setSelectedDoctor] = useState("");

  const handleSuccess = () => {
    setShowCreateAppointment(false);
    setRefreshKey((prev) => prev + 1); // Atualiza o planner
  };

  return (
    <>
      <Helmet>
        <title>Planner Semanal - {profile?.name}</title>
        <meta name="description" content="Planner semanal da recepção" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50">
        <nav className="glass-effect border-b border-white/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full gradient-secondary flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">
                    {profile?.name}
                  </h1>
                  <p className="text-xs text-gray-600">
                    Planner Semanal - {profile?.clinic?.name}
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
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Planner Semanal dos Médicos
            </h2>

            <div className="flex gap-2">
              <DoctorAutocomplete
                clinicId={clinicId}
                selectedDoctor={selectedDoctor}
                setSelectedDoctor={setSelectedDoctor}
              />

              <Button
                onClick={() => setShowCreateAppointment(true)}
                className="gradient-primary text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Agendamento
              </Button>
            </div>
          </div>

          {/* 🔹 Passa o filtro de médico para o Planner Semanal */}
          <ReceptionistCalendar
            key={refreshKey}
            clinicId={clinicId}
            doctorId={selectedDoctor}
          />
        </div>
      </div>

      {showCreateAppointment && (
        <CreateAppointmentModal
          clinicId={clinicId}
          onClose={() => setShowCreateAppointment(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
};

export default ReceptionistDashboard;
