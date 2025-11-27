import React, { useState, useEffect, useRef, KeyboardEvent } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import type { Patient, Doctor } from "@/types/database.types";
import type { CreatePrescriptionModalProps } from "@/types/components.types";

const examOptions = [
  "Consulta",
  "Tonometria",
  "Mapeamento de Retina",
  "Microscopia",
  "Teste de Visão Subnormal",
  "Gonioscopia",
  "Curva Tensional Diária",
  "Paquimetria",
  "Topografia de Córnea",
  "Campimetria Computadorizada",
  "Retinografia Simples",
  "Retinografia Fluorescente",
  "Biometria",
  "B. Ultrassom ocular",
  "Capsulotomia com laser YAG",
  "Fotocoagulação com Laser",
  "Tomografia de Coerência Óptica",
  "Retorno",
  "PAM",
  "Outros",
];

const CreatePrescriptionModal: React.FC<CreatePrescriptionModalProps> = ({
  doctorId,
  clinicId,
  onClose,
  onSuccess,
  preselectedPatient,
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>(
    preselectedPatient?.id || ""
  );
  const [activeTab, setActiveTab] = useState<string>("receita");
  const [subTab, setSubTab] = useState<string>("sem_lentes");
  const [medicationContent, setMedicationContent] = useState<string>("");
  const [lensData, setLensData] = useState({
    od_esf: "",
    od_cil: "",
    od_eixo: "",
    oe_esf: "",
    oe_cil: "",
    oe_eixo: "",
    adicao: "",
  });
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [doctorData, setDoctorData] = useState<Doctor | null>(null);

  // Refs para navegação com Enter nos campos de lentes
  const odEsfRef = useRef<HTMLInputElement>(null);
  const odCilRef = useRef<HTMLInputElement>(null);
  const odEixoRef = useRef<HTMLInputElement>(null);
  const oeEsfRef = useRef<HTMLInputElement>(null);
  const oeCilRef = useRef<HTMLInputElement>(null);
  const oeEixoRef = useRef<HTMLInputElement>(null);
  const adicaoRef = useRef<HTMLInputElement>(null);

  const handleLensKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    nextRef: React.RefObject<HTMLInputElement> | null
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextRef?.current) {
        nextRef.current.focus();
      }
    }
  };

  useEffect(() => {
    const fetchPatients = async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, name")
        .eq("clinic_id", clinicId);
      if (error) console.error(error);
      else setPatients(data);
    };
    fetchPatients();
  }, [clinicId]);

  useEffect(() => {
    const fetchDoctorData = async () => {
      if (!doctorId) return;

      const { data, error } = await supabase
        .from("doctors")
        .select("can_prescribe_exams, can_prescribe_lenses")
        .eq("id", doctorId)
        .single();

      if (error) {
        console.error("Error fetching doctor data:", error);
      } else {
        setDoctorData(data);
      }
    };
    fetchDoctorData();
  }, [doctorId]);

  const toggleExam = (exam: string) => {
    setSelectedExams((prev) =>
      prev.includes(exam) ? prev.filter((e) => e !== exam) : [...prev, exam]
    );
  };

  const handleSave = async (type: string) => {
    setLoading(true);

    const hasMedication = medicationContent.trim() && type === "medication";
    const hasExams = selectedExams.length && type === "exams";
    const hasLenses =
      Object.values(lensData).some((v) => v) && type === "lenses";

    if (!hasMedication && !hasExams && !hasLenses) {
      toast({
        title: "Erro",
        description: "Preencha algo na aba antes de criar.",
      });
      setLoading(false);
      return;
    }

    const content = JSON.stringify({
      medicationContent,
      selectedExams,
      lensData,
    });
    const { error } = await supabase.from("prescriptions").insert([
      {
        doctor_id: doctorId,
        clinic_id: clinicId,
        title: "Prescrição",
        content,
      },
    ]);

    setLoading(false);

    if (error) toast({ title: "Erro ao salvar", description: error.message });
    else {
      toast({ title: "Salvo com sucesso!" });
      onSuccess?.();
      handlePrint(type, content);
    }
  };

  const handlePrint = (type: string, content: string) => {
    const patientName =
      preselectedPatient?.name ||
      patients.find((p) => String(p.id) === String(selectedPatient))?.name ||
      "Paciente não informado";
    const parsed = JSON.parse(content);
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const printWindow = window.open("", "_blank");

    let printContent = "";

    // Para 'medication' não mostramos o título "Receita Médica" na impressão
    if (type === "medication" && parsed.medicationContent?.trim()) {
      printContent += `<div class="content"><p style="white-space: pre-line; text-align:left;">${parsed.medicationContent}</p></div>`;
    }

    if (type === "exams" && parsed.selectedExams?.length) {
      printContent += `<div class="content"><h3>Exames</h3><ul>${parsed.selectedExams
        .map((exam: string) => `<li>${exam}</li>`)
        .join("")}</ul></div>`;
    }

    if (type === "lenses" && Object.values(parsed.lensData).some((v) => v)) {
      printContent += `
        <div class="content">
          <h3>Lentes</h3>
          <table>
            <tr><th></th><th>ESF</th><th>CIL</th><th>EIXO</th></tr>
            <tr><td>OD</td><td>${parsed.lensData.od_esf}</td><td>${parsed.lensData.od_cil}</td><td>${parsed.lensData.od_eixo}</td></tr>
            <tr><td>OE</td><td>${parsed.lensData.oe_esf}</td><td>${parsed.lensData.oe_cil}</td><td>${parsed.lensData.oe_eixo}</td></tr>
            <tr><td>Adição</td><td colspan="3">${parsed.lensData.adicao}</td></tr>
          </table>
        </div>`;
    }

    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Prescrição</title>
          <style>
            @page { size: A4; margin: 20mm; }
            html, body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
            body { padding: 20mm; box-sizing: border-box; }
            .print-wrapper { width: 100%; max-width: 210mm; margin: 0 auto; }
            .patient { font-weight: bold; margin-bottom: 8px; text-align: left; }
            table { border-collapse: collapse; margin: 8px 0; width: 100%; }
            td, th { border: 1px solid #ccc; padding: 6px; text-align: center; }
            ul { list-style: none; padding: 0; margin-top: 6px; text-align: left; }
            li { margin: 2px 0; }
            .footer { position: fixed; bottom: 12mm; right: 20mm; font-size: 12px; color: #555; display: flex; gap: 12px; }
            h3 { margin-top: 12px; margin-bottom: 6px; text-align: left; }
            /* Evita quebra dentro dos blocos e tenta manter o conteúdo em uma única página */
            .content { page-break-inside: avoid; break-inside: avoid; -webkit-column-break-inside: avoid; }
            @media print {
              body { padding: 10mm; }
              .footer { position: fixed; bottom: 12mm; }
            }
          </style>
        </head>
        <body>
          <div class="print-wrapper">
            <p class="patient">Paciente: ${patientName}</p>
            ${printContent || "<p>Nada para imprimir.</p>"}
            <div class="footer">
              <span>${formattedDate}</span>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    // Dar um pequeno atraso para o conteúdo renderizar antes de abrir diálogo de impressão
    setTimeout(() => {
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    }, 200);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-6 relative overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl font-semibold mb-4">Nova Receita</h2>

        {/* Paciente */}
        <div className="mb-4">
          <label className="block mb-2 font-medium">Paciente</label>
          <select
            className="border rounded-lg p-2 w-full"
            value={selectedPatient}
            onChange={(e) => setSelectedPatient(e.target.value)}
          >
            {!preselectedPatient && (
              <option value="">Selecione um paciente</option>
            )}
            {preselectedPatient && (
              <option value={preselectedPatient.id}>
                {preselectedPatient.name}
              </option>
            )}
            {patients
              .filter((p) => p.id !== preselectedPatient?.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </div>

        {/* Abas principais */}
        <div className="flex mb-4 border-b">
          <button
            className={`flex-1 p-2 ${
              activeTab === "receita"
                ? "border-b-2 border-blue-500 font-semibold"
                : ""
            }`}
            onClick={() => setActiveTab("receita")}
          >
            Receita Médica
          </button>
        </div>

        {/* 🔹 Sub-abas dentro da Receita */}
        {activeTab === "receita" && (
          <>
            <div className="flex mb-3 border-b">
              <button
                className={`flex-1 p-2 ${
                  subTab === "sem_lentes"
                    ? "border-b-2 border-blue-500 font-semibold"
                    : ""
                }`}
                onClick={() => setSubTab("sem_lentes")}
              >
                Medicamentos
              </button>
              {doctorData?.can_prescribe_lenses && (
                <button
                  className={`flex-1 p-2 ${
                    subTab === "lentes"
                      ? "border-b-2 border-blue-500 font-semibold"
                      : ""
                  }`}
                  onClick={() => setSubTab("lentes")}
                >
                  Lentes
                </button>
              )}
              {doctorData?.can_prescribe_exams && (
                <button
                  className={`flex-1 p-2 ${
                    subTab === "exames"
                      ? "border-b-2 border-blue-500 font-semibold"
                      : ""
                  }`}
                  onClick={() => setSubTab("exames")}
                >
                  Exames
                </button>
              )}
            </div>

            {/* Subaba: Sem Lentes */}
            {subTab === "sem_lentes" && (
              <div>
                <textarea
                  className="border rounded-lg p-3 w-full h-40 mb-4"
                  placeholder="Digite a prescrição..."
                  value={medicationContent}
                  onChange={(e) => setMedicationContent(e.target.value)}
                />
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={onClose}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => handleSave("medication")}
                    disabled={loading}
                  >
                    {loading ? "Salvando..." : "Criar & Imprimir Receita"}
                  </Button>
                </div>
              </div>
            )}

            {/* Subaba: Lentes */}
            {subTab === "lentes" && doctorData?.can_prescribe_lenses && (
              <div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <h3>Olho Direito (OD)</h3>
                    <input
                      ref={odEsfRef}
                      placeholder="ESF"
                      className="border rounded p-2 w-full mb-2"
                      value={lensData.od_esf}
                      onChange={(e) =>
                        setLensData({ ...lensData, od_esf: e.target.value })
                      }
                      onKeyDown={(e) => handleLensKeyDown(e, odCilRef)}
                    />
                    <input
                      ref={odCilRef}
                      placeholder="CIL"
                      className="border rounded p-2 w-full mb-2"
                      value={lensData.od_cil}
                      onChange={(e) =>
                        setLensData({ ...lensData, od_cil: e.target.value })
                      }
                      onKeyDown={(e) => handleLensKeyDown(e, odEixoRef)}
                    />
                    <input
                      ref={odEixoRef}
                      placeholder="EIXO"
                      className="border rounded p-2 w-full"
                      value={lensData.od_eixo}
                      onChange={(e) =>
                        setLensData({ ...lensData, od_eixo: e.target.value })
                      }
                      onKeyDown={(e) => handleLensKeyDown(e, oeEsfRef)}
                    />
                  </div>
                  <div>
                    <h3>Olho Esquerdo (OE)</h3>
                    <input
                      ref={oeEsfRef}
                      placeholder="ESF"
                      className="border rounded p-2 w-full mb-2"
                      value={lensData.oe_esf}
                      onChange={(e) =>
                        setLensData({ ...lensData, oe_esf: e.target.value })
                      }
                      onKeyDown={(e) => handleLensKeyDown(e, oeCilRef)}
                    />
                    <input
                      ref={oeCilRef}
                      placeholder="CIL"
                      className="border rounded p-2 w-full mb-2"
                      value={lensData.oe_cil}
                      onChange={(e) =>
                        setLensData({ ...lensData, oe_cil: e.target.value })
                      }
                      onKeyDown={(e) => handleLensKeyDown(e, oeEixoRef)}
                    />
                    <input
                      ref={oeEixoRef}
                      placeholder="EIXO"
                      className="border rounded p-2 w-full"
                      value={lensData.oe_eixo}
                      onChange={(e) =>
                        setLensData({ ...lensData, oe_eixo: e.target.value })
                      }
                      onKeyDown={(e) => handleLensKeyDown(e, adicaoRef)}
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      ref={adicaoRef}
                      placeholder="Adição"
                      className="border rounded p-2 w-full"
                      value={lensData.adicao}
                      onChange={(e) =>
                        setLensData({ ...lensData, adicao: e.target.value })
                      }
                      onKeyDown={(e) => handleLensKeyDown(e, null)}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={onClose}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => handleSave("lenses")}
                    disabled={loading}
                  >
                    {loading ? "Salvando..." : "Criar & Imprimir Lentes"}
                  </Button>
                </div>
              </div>
            )}

            {/* Subaba: Exames */}
            {subTab === "exames" && doctorData?.can_prescribe_exams && (
              <div>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border p-3 rounded mb-4">
                  {examOptions.map((exam) => (
                    <label key={exam} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedExams.includes(exam)}
                        onChange={() => toggleExam(exam)}
                      />
                      <span>{exam}</span>
                    </label>
                  ))}
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={onClose}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => handleSave("exams")}
                    disabled={loading}
                  >
                    {loading ? "Salvando..." : "Criar & Imprimir Exames"}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CreatePrescriptionModal;
