import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import { validateCPF, formatCPF, cleanCPF } from "@/utils";
import { FileText, Edit } from "lucide-react";
import type { Patient } from "@/types/database.types";
import type { CreateCertificateModalProps, PatientFormData } from "@/types/components.types";

const SEX_OPTIONS = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Feminino" },
  { value: "O", label: "Outro" },
];

const CreateCertificateModal: React.FC<CreateCertificateModalProps> = ({
  clinicId,
  doctorId: _doctorId,
  preselectedPatient,
  onClose,
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(preselectedPatient || null);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [patientForm, setPatientForm] = useState<Partial<PatientFormData>>({
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
  const [cpfError, setCpfError] = useState<string | null>(null);

  // Chave do localStorage para rascunho do atestado (por paciente)
  const draftKey = selectedPatient ? `certificate_draft_${selectedPatient.id}` : null;

  // Carregar rascunho quando seleciona um paciente
  useEffect(() => {
    if (draftKey) {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          if (draft.cid) setCid(draft.cid);
          if (draft.days) setDays(draft.days);
          if (draft.doctorObs) setDoctorObs(draft.doctorObs);
        } catch (e) {
          console.error("Erro ao carregar rascunho:", e);
        }
      }
    }
  }, [draftKey]);

  // Salvar rascunho automaticamente
  useEffect(() => {
    if (draftKey && (cid || days || doctorObs)) {
      const draft = { cid, days, doctorObs };
      localStorage.setItem(draftKey, JSON.stringify(draft));
    }
  }, [cid, days, doctorObs, draftKey]);

  // Limpar rascunho
  const clearDraft = () => {
    if (draftKey) {
      localStorage.removeItem(draftKey);
    }
  };

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
    else setPatients(data || []);
  }, [clinicId]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const filteredPatients = patients.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.cpf && p.cpf.includes(searchTerm))
  );

  const handleEditPatient = (patient: Patient) => {
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
    if (!patientForm.cpf) {
      setCpfError("CPF é obrigatório");
      toast({ title: "CPF é obrigatório", variant: "destructive" });
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
    let data, error;

    const dataToSave = { ...patientForm, cpf: cleanCPF(patientForm.cpf) };

    if (editingPatient) {
      ({ data, error } = await supabase
        .from("patients")
        .update(dataToSave)
        .eq("id", editingPatient.id)
        .select()
        .single());
    } else {
      ({ data, error } = await supabase
        .from("patients")
        .insert({ clinic_id: clinicId, ...dataToSave })
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

  // ------------------------------------------------------------------
  // 🚀 NOVA FUNÇÃO DE IMPRESSÃO HTML
  // ------------------------------------------------------------------
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

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      toast({
        title: "Erro",
        description: "Permita pop-ups para gerar a impressão",
        variant: "destructive",
      });
      return;
    }

    const html = `
      <html>
        <head>
          <title>Atestado Médico</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              line-height: 1.6;
              font-size: 16px;
            }

            h1 {
              text-align: center;
              margin-bottom: 40px;
              font-size: 28px;
            }

            .line {
              margin-bottom: 12px;
            }

            .signature {
              margin-top: 80px;
            }
          </style>
        </head>

        <body>
          <h1>ATESTADO MÉDICO</h1>

          <div class="line"><strong>Paciente:</strong> ${selectedPatient.name}</div>
          <div class="line"><strong>CPF:</strong> ${selectedPatient.cpf || "-"}</div>
          <div class="line"><strong>CID:</strong> ${cid || "-"}</div>

          <div class="line">
            O(a) paciente acima está inapto(a) para atividades pelo período de 
            <strong>${days} dia(s)</strong>.
          </div>

          <div class="line"><strong>Retorno previsto:</strong> ${endDate.toLocaleDateString()}</div>

          ${doctorObs
        ? `<div class="line"><strong>Observação:</strong> ${doctorObs}</div>`
        : ""
      }

          <div class="line"><strong>Data:</strong> ${startDate.toLocaleDateString()}</div>

          <div class="signature">Assinatura do médico: _______________________________</div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };

    clearDraft(); // Limpa rascunho após imprimir
    toast({ title: "Documento pronto para impressão!" });
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
                      <p className="text-sm text-gray-600">CPF: {formatCPF(p.cpf || "")}</p>
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
              className={`w-full px-3 py-2 border rounded ${cpfError ? "border-red-500" : ""
                }`}
              placeholder="CPF"
              value={patientForm.cpf}
              onChange={(e) => {
                const formatted = formatCPF(e.target.value);
                setPatientForm({ ...patientForm, cpf: formatted });
                if (cpfError) setCpfError(null);
              }}
              maxLength={14}
            />
            {cpfError && (
              <p className="text-xs text-red-500">{cpfError}</p>
            )}
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
            <p className="text-sm text-gray-600">CPF: {formatCPF(selectedPatient.cpf || "")}</p>

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
              rows={3}
              placeholder="Observação do médico"
              value={doctorObs}
              onChange={(e) => setDoctorObs(e.target.value)}
            />

            <Button className="w-full" onClick={handleGeneratePDF}>
              Imprimir Atestado
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
