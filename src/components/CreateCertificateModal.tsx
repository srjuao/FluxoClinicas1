import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import { FileText, Edit } from "lucide-react";
import jsPDF from "jspdf";

const SEX_OPTIONS = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Feminino" },
  { value: "O", label: "Outro" },
];

const CreateCertificateModal = ({
  clinicId,
  doctorId,
  preselectedPatient,
  onClose,
}) => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(preselectedPatient);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [patientForm, setPatientForm] = useState({
    name: "",
    cpf: "",
    birth_date: "",
    sexo: "",
  });

  const [cid, setCid] = useState("");
  const [doctorObs, setDoctorObs] = useState("");
  const [days, setDays] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const loadPatients = useCallback(async () => {
    if (!clinicId) return;
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .eq("clinic_id", clinicId)
      .limit(50);

    if (error)
      toast({
        title: "Erro ao buscar pacientes",
        description: error.message,
        variant: "destructive",
      });
    else setPatients(data);
  }, [clinicId]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const filteredPatients = patients.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.cpf && p.cpf.includes(searchTerm))
  );

  const handleEditPatient = (patient) => {
    setEditingPatient(patient);
    setPatientForm({
      name: patient.name || "",
      cpf: patient.cpf || "",
      birth_date: patient.birth_date || "",
      sexo: patient.sexo || "",
    });
    setShowPatientForm(true);
  };

  const handleSavePatient = async () => {
    setLoading(true);
    let data, error;

    if (editingPatient) {
      ({ data, error } = await supabase
        .from("patients")
        .update(patientForm)
        .eq("id", editingPatient.id)
        .select()
        .single());
    } else {
      ({ data, error } = await supabase
        .from("patients")
        .insert({ clinic_id: clinicId, ...patientForm })
        .select()
        .single());
    }

    setLoading(false);
    if (error)
      toast({
        title: "Erro ao salvar paciente",
        description: error.message,
        variant: "destructive",
      });
    else {
      if (editingPatient)
        setPatients((prev) => prev.map((p) => (p.id === data.id ? data : p)));
      else setPatients((prev) => [...prev, data]);
      setSelectedPatient(data);
      setShowPatientForm(false);
      setEditingPatient(null);
      toast({ title: "Paciente salvo!" });
    }
  };

  const handleGeneratePDF = () => {
    if (!selectedPatient) {
      toast({ title: "Selecione o paciente", variant: "destructive" });
      return;
    }

    if (!days) {
      toast({ title: "Informe os dias de atestado", variant: "destructive" });
      return;
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + Number(days));

    const doc = new jsPDF();

    // Espaço para logo/timbre do hospital
    const startY = 80;

    doc.setFontSize(18);
    doc.text("ATESTADO MÉDICO", 70, startY);

    doc.setFontSize(12);

    const contentY = startY + 15;

    doc.text(`Paciente: ${selectedPatient.name}`, 20, contentY);
    doc.text(`CPF: ${selectedPatient.cpf || "-"}`, 20, contentY + 10);
    doc.text(`CID: ${cid || "-"}`, 20, contentY + 20);
    doc.text(
      `O(a) paciente acima está inapto(a) para atividades pelo período de ${days} dia(s).`,
      20,
      contentY + 30
    );
    doc.text(
      `Retorno previsto: ${endDate.toLocaleDateString()}`,
      20,
      contentY + 40
    );

    if (doctorObs) {
      doc.text(`Observação: ${doctorObs}`, 20, contentY + 55);
    }

    doc.text(`Data: ${startDate.toLocaleDateString()}`, 20, contentY + 75);
    doc.text(
      "Assinatura do médico: ____________________________",
      20,
      contentY + 100
    );

    doc.save(`Atestado_${selectedPatient.name}.pdf`);
    toast({ title: "PDF gerado com sucesso!" });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
      <div className="glass-effect rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 font-bold"
        >
          ✕
        </button>
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-full gradient-secondary flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-lg font-bold">Criar Atestado</h2>
        </div>

        {!selectedPatient && (
          <div className="space-y-2 mb-4">
            <input
              type="text"
              placeholder="Buscar paciente por nome ou CPF"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />

            {searchTerm && (
              <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1">
                {filteredPatients.map((p) => (
                  <div
                    key={p.id}
                    className="p-2 hover:bg-gray-100 rounded flex justify-between items-center cursor-pointer"
                  >
                    <div onClick={() => setSelectedPatient(p)}>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-sm text-gray-600">CPF: {p.cpf}</p>
                    </div>
                    <Edit
                      className="cursor-pointer"
                      onClick={() => handleEditPatient(p)}
                    />
                  </div>
                ))}
                {filteredPatients.length === 0 && (
                  <p className="text-gray-500 text-center">
                    Nenhum paciente encontrado
                  </p>
                )}
              </div>
            )}

            {!showPatientForm && (
              <Button
                className="w-full"
                variant="outline"
                onClick={() => {
                  setPatientForm({
                    name: "",
                    cpf: "",
                    birth_date: "",
                    sexo: "",
                  });
                  setEditingPatient(null);
                  setShowPatientForm(true);
                }}
              >
                Cadastrar Novo Paciente
              </Button>
            )}
          </div>
        )}

        {showPatientForm && (
          <div className="glass-effect rounded-xl p-4 space-y-3 mb-4">
            <h3 className="font-semibold">
              {editingPatient ? "Editar Paciente" : "Novo Paciente"}
            </h3>

            <input
              className="w-full px-3 py-2 border rounded"
              placeholder="Nome"
              value={patientForm.name}
              onChange={(e) =>
                setPatientForm({ ...patientForm, name: e.target.value })
              }
            />
            <input
              className="w-full px-3 py-2 border rounded"
              placeholder="CPF"
              value={patientForm.cpf}
              onChange={(e) =>
                setPatientForm({ ...patientForm, cpf: e.target.value })
              }
            />
            <input
              type="date"
              className="w-full px-3 py-2 border rounded"
              value={patientForm.birth_date}
              onChange={(e) =>
                setPatientForm({ ...patientForm, birth_date: e.target.value })
              }
            />

            <select
              className="w-full px-3 py-2 border rounded"
              value={patientForm.sexo}
              onChange={(e) =>
                setPatientForm({ ...patientForm, sexo: e.target.value })
              }
            >
              <option value="">Sexo</option>
              {SEX_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <Button
              className="w-full"
              onClick={handleSavePatient}
              disabled={loading}
            >
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        )}

        {selectedPatient && (
          <div className="glass-effect rounded-xl p-4 mb-4 space-y-2">
            <p className="font-semibold">{selectedPatient.name}</p>
            <p className="text-sm text-gray-600">CPF: {selectedPatient.cpf}</p>

            <input
              className="w-full px-3 py-2 border rounded"
              placeholder="CID (opcional)"
              value={cid}
              onChange={(e) => setCid(e.target.value)}
            />

            <input
              type="number"
              className="w-full px-3 py-2 border rounded"
              placeholder="Dias de afastamento"
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />

            <textarea
              className="w-full px-3 py-2 border rounded"
              rows="3"
              placeholder="Observação do médico"
              value={doctorObs}
              onChange={(e) => setDoctorObs(e.target.value)}
            />

            <Button className="w-full" onClick={handleGeneratePDF}>
              Gerar PDF
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setSelectedPatient(null)}
            >
              Trocar Paciente
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateCertificateModal;
