import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { X, User, Search, Edit, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import { validateCPF, formatCPF, cleanCPF, formatDate } from "@/utils";
import type { Patient } from "@/types/database.types";

const SEX_OPTIONS = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Feminino" },
  { value: "O", label: "Outro" },
];

const CIVIL_STATUS_OPTIONS = [
  { value: "solteiro", label: "Solteiro(a)" },
  { value: "casado", label: "Casado(a)" },
  { value: "divorciado", label: "Divorciado(a)" },
  { value: "viuvo", label: "Viúvo(a)" },
];

interface PatientFormData {
  name: string;
  cpf: string;
  birth_date: string;
  sexo: string;
  telefone: string;
  estado_civil: string;
  endereco: string;
}

interface PatientManagementModalProps {
  clinicId: string;
  onClose: () => void;
}

const PatientManagementModal: React.FC<PatientManagementModalProps> = ({
  clinicId,
  onClose,
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  const [patientForm, setPatientForm] = useState<PatientFormData>({
    name: "",
    cpf: "",
    birth_date: "",
    sexo: "",
    telefone: "",
    estado_civil: "",
    endereco: "",
  });
  const [cpfError, setCpfError] = useState<string | null>(null);

  const loadPatients = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("name");

    if (error) {
      toast({
        title: "Erro ao carregar pacientes",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setPatients(data || []);
    }
    setLoading(false);
  }, [clinicId]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.cpf && p.cpf.includes(searchTerm))
  );

  const handleNewPatient = () => {
    setEditingPatient(null);
    setPatientForm({
      name: "",
      cpf: "",
      birth_date: "",
      sexo: "",
      telefone: "",
      estado_civil: "",
      endereco: "",
    });
    setShowForm(true);
  };

  const handleEditPatient = (patient: Patient) => {
    setEditingPatient(patient);
    setPatientForm({
      name: patient.name || "",
      cpf: patient.cpf || "",
      birth_date: patient.birth_date || "",
      sexo: patient.sexo || "",
      telefone: patient.telefone || "",
      estado_civil: patient.estado_civil || "",
      endereco: patient.endereco || "",
    });
    setShowForm(true);
  };

  const handleDeletePatient = async (patient: Patient) => {
    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir ${patient.name}?`
    );
    if (!confirmDelete) return;

    setLoading(true);
    const { error } = await supabase
      .from("patients")
      .delete()
      .eq("id", patient.id);

    if (error) {
      toast({
        title: "Erro ao excluir paciente",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Paciente excluído com sucesso! ✅" });
      loadPatients();
    }
    setLoading(false);
  };

  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientForm.cpf) {
      setCpfError("CPF é obrigatório");
      toast({
        title: "CPF é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (!validateCPF(patientForm.cpf)) {
      setCpfError("CPF inválido");
      toast({
        title: "CPF inválido",
        description: "Por favor, insira um CPF válido",
        variant: "destructive",
      });
      return;
    }

    setCpfError(null);
    setLoading(true);

    const cleanedCPF = cleanCPF(patientForm.cpf);
    const dataToSave = { ...patientForm, cpf: cleanedCPF };

    if (editingPatient) {
      // Update existing patient
      const { error } = await supabase
        .from("patients")
        .update(dataToSave)
        .eq("id", editingPatient.id);

      if (error) {
        toast({
          title: "Erro ao atualizar paciente",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Paciente atualizado com sucesso! ✅" });
        setShowForm(false);
        setEditingPatient(null);
        loadPatients();
      }
    } else {
      // Create new patient
      const { error } = await supabase
        .from("patients")
        .insert({ clinic_id: clinicId, ...dataToSave });

      if (error) {
        toast({
          title: "Erro ao cadastrar paciente",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Paciente cadastrado com sucesso! ✅" });
        setShowForm(false);
        loadPatients();
      }
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-effect rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto relative"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Gerenciar Pacientes
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!showForm ? (
          <>
            {/* Search and Add Button */}
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou CPF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <Button
                onClick={handleNewPatient}
                className="gradient-primary text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Paciente
              </Button>
            </div>

            {/* Patients List */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {loading ? (
                <p className="text-center text-gray-500 py-8">Carregando...</p>
              ) : filteredPatients.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {searchTerm
                    ? "Nenhum paciente encontrado"
                    : "Nenhum paciente cadastrado"}
                </p>
              ) : (
                filteredPatients.map((patient) => (
                  <div
                    key={patient.id}
                    className="glass-effect rounded-lg p-4 flex justify-between items-center hover:shadow-md transition-all"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {patient.name}
                      </h3>
                      <div className="flex gap-4 text-sm text-gray-600 mt-1">
                        <span>CPF: {patient.cpf ? formatCPF(patient.cpf) : "N/A"}</span>
                        {patient.telefone && (
                          <span>Tel: {patient.telefone}</span>
                        )}
                        {patient.birth_date && (
                          <span>
                            Nascimento:{" "}
                            {formatDate(patient.birth_date)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleEditPatient(patient)}
                        variant="outline"
                        size="sm"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeletePatient(patient)}
                        variant="destructive"
                        size="sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          /* Patient Form */
          <form onSubmit={handleSavePatient} className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingPatient ? "Editar Paciente" : "Novo Paciente"}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={patientForm.name}
                  onChange={(e) =>
                    setPatientForm({ ...patientForm, name: e.target.value.toUpperCase() })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CPF *
                </label>
                <input
                  type="text"
                  value={patientForm.cpf}
                  onChange={(e) => {
                    const formatted = formatCPF(e.target.value);
                    setPatientForm({ ...patientForm, cpf: formatted });
                    if (cpfError) setCpfError(null);
                  }}
                  className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-transparent ${cpfError ? "border-red-500" : "border-gray-200"
                    }`}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  required
                />
                {cpfError && (
                  <p className="text-xs text-red-500 mt-1">{cpfError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  value={patientForm.birth_date}
                  onChange={(e) =>
                    setPatientForm({
                      ...patientForm,
                      birth_date: e.target.value,
                    })
                  }
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sexo
                </label>
                <select
                  value={patientForm.sexo}
                  onChange={(e) =>
                    setPatientForm({ ...patientForm, sexo: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Selecione</option>
                  {SEX_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone
                </label>
                <input
                  type="text"
                  value={patientForm.telefone}
                  onChange={(e) =>
                    setPatientForm({ ...patientForm, telefone: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado Civil
                </label>
                <select
                  value={patientForm.estado_civil}
                  onChange={(e) =>
                    setPatientForm({
                      ...patientForm,
                      estado_civil: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Selecione</option>
                  {CIVIL_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endereço
                </label>
                <input
                  type="text"
                  value={patientForm.endereco}
                  onChange={(e) =>
                    setPatientForm({ ...patientForm, endereco: e.target.value.toUpperCase() })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent uppercase"
                  placeholder="Rua, número, bairro, cidade"
                />
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingPatient(null);
                }}
                variant="outline"
                className="flex-1"
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 gradient-primary text-white"
                disabled={loading}
              >
                {loading
                  ? "Salvando..."
                  : editingPatient
                    ? "Atualizar Paciente"
                    : "Cadastrar Paciente"}
              </Button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default PatientManagementModal;
