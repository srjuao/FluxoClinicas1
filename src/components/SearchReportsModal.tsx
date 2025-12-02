// @ts-nocheck
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Search, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/customSupabaseClient";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/SupabaseAuthContext";

export const SearchReportsModal = ({
  clinicId,
  preselectedPatient,
  onClose,
}) => {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState(preselectedPatient?.name || "");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    if (searchTerm.length < 3) {
      setReports([]);
      return;
    }

    const search = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("search_reports", {
        search_term: searchTerm,
        p_clinic_id: clinicId,
      });

      if (error) {
        toast({
          title: "Erro ao buscar laudos",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setReports(data);
      }
      setLoading(false);
    };

    const debounce = setTimeout(() => {
      search();
    }, 500);

    return () => clearTimeout(debounce);
  }, [searchTerm, clinicId]);


  return (
    <div className="fixed inset-0 !m-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-effect rounded-2xl p-6 w-full max-w-4xl min-h-[42vh] max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
              <Search className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Buscar Laudos</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!selectedReport ? (
          <>
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none"
                  placeholder="Buscar por nome, CPF, data de nascimento ou título"
                />
              </div>
            </div>

            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                <p className="text-gray-600">Buscando...</p>
              </div>
            )}

            <div className="space-y-3">
              {reports.map((report, index) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={async () => {
                    // Se o report não tiver doctor_id, buscar o report completo
                    if (!report.doctor_id) {
                      const { data } = await supabase
                        .from("medical_reports")
                        .select("*, doctor:doctors(id)")
                        .eq("id", report.id)
                        .single();
                      if (data) {
                        setSelectedReport(data);
                      } else {
                        setSelectedReport(report);
                      }
                    } else {
                      setSelectedReport(report);
                    }
                  }}
                  className="glass-effect rounded-xl p-4 hover:shadow-lg cursor-pointer transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {report.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        Paciente: {report.patient_name}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>CPF: {report.patient_cpf}</span>
                        <span>
                          Nasc:{" "}
                          {new Date(
                            report.patient_birth_date
                          ).toLocaleDateString("pt-BR")}
                        </span>
                        <span>
                          Criado em:{" "}
                          {new Date(report.created_at).toLocaleDateString(
                            "pt-BR"
                          )}
                        </span>
                      </div>
                    </div>
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                </motion.div>
              ))}
            </div>

            {reports.length === 0 && searchTerm.length >= 3 && !loading && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nenhum laudo encontrado</p>
              </div>
            )}

            {searchTerm.length < 3 && (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  Digite 3 ou mais caracteres para buscar
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-6">
            <Button onClick={() => setSelectedReport(null)} variant="outline">
              ← Voltar para a busca
            </Button>

            <div className="glass-effect rounded-xl p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {selectedReport.title}
              </h3>

              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-semibold text-blue-900 mb-2">
                  Informações do Paciente
                </p>
                <div className="space-y-1 text-sm text-blue-700">
                  <p>Nome: {selectedReport.patient_name}</p>
                  <p>CPF: {selectedReport.patient_cpf}</p>
                  <p>
                    Data de Nascimento:{" "}
                    {new Date(
                      selectedReport.patient_birth_date
                    ).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Conteúdo do Laudo:
                </p>
                <div className="bg-white rounded-lg p-4 border border-gray-200 whitespace-pre-wrap">
                  {selectedReport.content}
                </div>
              </div>

              <div className="mt-4 text-xs text-gray-500">
                Criado em:{" "}
                {new Date(selectedReport.created_at).toLocaleString("pt-BR")}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
