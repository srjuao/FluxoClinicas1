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

// Exames de Urologia organizados em 3 categorias
const urologyExamOptions = {
  laboratoriais: [
    "Ácido Cítrico – Citrato Urina 24 Horas",
    "Ácido Oxálico – Oxalato Urina 24 Horas",
    "Ácido Úrico – Urina 24 horas",
    "Cálcio – Urina 24 horas",
    "Cistina – Urina 24h",
    "Urina Rotina (EAS)",
    "Cultura de Urina (Urocultura)",
    "Desformínio Eritrocitário",
    "Bacterioscopia por Lâmina (Gram)",
    "Anti HBS",
    "Anti HCV (Hepatite C)",
    "FTA-ABS IgG",
    "FTA-ABS IgM",
    "HBSag",
    "Herpes Simples I e II IgG",
    "Herpes Simples I e II IgM",
    "HIV 1 e 2",
    "VDRL – Reação de Sífilis",
    "Cálcio Iônico",
    "Ácido Láctico",
    "Cálcio Total",
    "Paratormônio PTH Intacto (Molécula Íntegra)",
    "Colesterol HDL",
    "Colesterol LDL",
    "Colesterol Total",
    "Colesterol VLDL",
    "Triglicerídeos",
    "Hemograma",
    "Uréia",
    "Creatinina",
    "Sódio",
    "Potássio",
  ],
  hormonios: [
    "Tempo de Tromboplastina Parcial (TTP)",
    "Tempo e Atividade de Protrombina (TP)",
    "Fosfatase Alcalina (FA)",
    "Transaminase Oxalacética – TGO/AST",
    "Gama Glutamil Transferase (GGT)",
    "Transaminase Pirúvica – TGP/ALT",
    "Hemoglobina Glicada por HPLC (HbA1c)",
    "Glicemia de Jejum",
    "PSA Livre/Total",
    "PSA Total",
    "TSH (Tireoestimulante)",
    "T4 Total",
    "Testosterona",
    "Testosterona Livre",
    "Prolactina",
    "Hormônio Luteinizante (LH)",
    "Hormônio Folículo Estimulante (FSH)",
    "Hormônio Gonadotrófico Coriônico Quantitativo (HCG Beta)",
    "Gonadotrofina Coriônica Hormônio (HCG)",
    "Alfa-fetoproteína",
    "Lactato Desidrogenase (DHL)",
    "Espermatograma",
    "Microdeleção do Cromossomo Y",
    "Pesquisa de Espermatozoides na Urina",
    "Cariótipo com Banda G",
  ],
  imagem: [
    "Tc – Abdome Superior",
    "Tc – Tórax",
    "Rx – Tórax",
    "Tc – Abdome Total",
    "Tc – Pelve",
    "Urotomografia",
    "Us – Abdome Total",
    "Us – Aparelho Urinário (rins, ureteres e bexiga)",
    "Us – Pélvico Masculino",
    "Us – Região Inguinal – Direita",
    "Us – Região Inguinal – Esquerda",
    "Us – Testículos",
    "Us – Transretal com Biópsia da Próstata",
    "CTG Renal Estática e Dinâmica",
    "CTG Renal Dinâmica com Diurético",
    "Colonoscopia (inclui a retossigmoidoscopia)",
    "Revisão de Lâmina",
    "Imunohistoquímica",
    "Vitamina B12",
    "Vitamina D3 (25-Hidrox)",
  ],
};

// Exames de Cardiologia organizados em categorias
const cardiologyExamOptions = {
  hemograma: [
    "Hemograma completo",
  ],
  perfilLipidico: [
    "Colesterol total e frações",
  ],
  metabolico: [
    "Hemoglobina glicada",
    "Ureia",
    "Creatinina",
    "Ácido úrico",
  ],
  hepatico: [
    "TGO",
    "TGP",
    "Fosfatase alcalina",
    "Gama GT",
  ],
  tireoide: [
    "TSH",
    "T4 livre",
  ],
  ferroVitaminas: [
    "Ferro",
    "Ferritina",
    "Índice saturação transferrina",
    "Vitamina D",
    "Vitamina B12",
  ],
  eletrólitos: [
    "Sódio",
    "Potássio",
    "Cálcio",
  ],
  urina: [
    "EAS",
    "EPF",
  ],
};

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
    observacoes: "",
  });
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [selectedUrologyExams, setSelectedUrologyExams] = useState<string[]>([]);
  const [selectedCardiologyExams, setSelectedCardiologyExams] = useState<string[]>([]);
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
        .select("can_prescribe_exams, can_prescribe_lenses, can_prescribe_urology_exams, can_prescribe_cardiology_exams")
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

  const toggleUrologyExam = (exam: string) => {
    setSelectedUrologyExams((prev) =>
      prev.includes(exam) ? prev.filter((e) => e !== exam) : [...prev, exam]
    );
  };

  const toggleCardiologyExam = (exam: string) => {
    setSelectedCardiologyExams((prev) =>
      prev.includes(exam) ? prev.filter((e) => e !== exam) : [...prev, exam]
    );
  };

  const handleSave = async (type: string) => {
    setLoading(true);

    const hasMedication = medicationContent.trim() && type === "medication";
    const hasExams = selectedExams.length && type === "exams";
    const hasUrologyExams = selectedUrologyExams.length && type === "urology_exams";
    const hasCardiologyExams = selectedCardiologyExams.length && type === "cardiology_exams";
    const hasLenses =
      Object.values(lensData).some((v) => v) && type === "lenses";

    if (!hasMedication && !hasExams && !hasUrologyExams && !hasCardiologyExams && !hasLenses) {
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
      selectedUrologyExams,
      selectedCardiologyExams,
      lensData,
    });
    const { error } = await supabase.from("prescriptions").insert([
      {
        doctor_id: doctorId,
        clinic_id: clinicId,
        patient_id: selectedPatient || preselectedPatient?.id || null,
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
      printContent += `<div class="content"><h3>Exames Oftalmológicos</h3><ul>${parsed.selectedExams
        .map((exam: string) => `<li>${exam}</li>`)
        .join("")}</ul></div>`;
    }

    if (type === "urology_exams" && parsed.selectedUrologyExams?.length) {
      printContent += `<div class="content"><h3>Exames Urológicos</h3><ul>${parsed.selectedUrologyExams
        .map((exam: string) => `<li>${exam}</li>`)
        .join("")}</ul></div>`;
    }

    if (type === "cardiology_exams" && parsed.selectedCardiologyExams?.length) {
      printContent += `<div class="content"><h3>Exames Cardiológicos</h3><ul>${parsed.selectedCardiologyExams
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
          </table>`;
      if (parsed.lensData.observacoes?.trim()) {
        printContent += `
          <div style="margin-top: 12px;">
            <p style="font-weight: bold; margin-bottom: 4px;">Observações:</p>
            <p style="white-space: pre-line; text-align: left;">${parsed.lensData.observacoes}</p>
          </div>`;
      }
      printContent += `</div>`;
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
            className={`flex-1 p-2 ${activeTab === "receita"
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
                className={`flex-1 p-2 ${subTab === "sem_lentes"
                  ? "border-b-2 border-blue-500 font-semibold"
                  : ""
                  }`}
                onClick={() => setSubTab("sem_lentes")}
              >
                Medicamentos
              </button>
              {doctorData?.can_prescribe_lenses && (
                <button
                  className={`flex-1 p-2 ${subTab === "lentes"
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
                  className={`flex-1 p-2 ${subTab === "exames"
                    ? "border-b-2 border-blue-500 font-semibold"
                    : ""
                    }`}
                  onClick={() => setSubTab("exames")}
                >
                  Exames Oftalmo
                </button>
              )}
              {doctorData?.can_prescribe_urology_exams && (
                <button
                  className={`flex-1 p-2 ${subTab === "exames_urologicos"
                    ? "border-b-2 border-blue-500 font-semibold"
                    : ""
                    }`}
                  onClick={() => setSubTab("exames_urologicos")}
                >
                  Exames Urologia
                </button>
              )}
              {doctorData?.can_prescribe_cardiology_exams && (
                <button
                  className={`flex-1 p-2 ${subTab === "exames_cardiologicos"
                    ? "border-b-2 border-red-500 font-semibold"
                    : ""
                    }`}
                  onClick={() => setSubTab("exames_cardiologicos")}
                >
                  Exames Cardio
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
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Observações
                    </label>
                    <textarea
                      placeholder="Digite observações sobre a prescrição de lentes..."
                      className="border rounded p-2 w-full h-24 resize-none"
                      value={lensData.observacoes}
                      onChange={(e) =>
                        setLensData({ ...lensData, observacoes: e.target.value })
                      }
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

            {/* Subaba: Exames Urológicos */}
            {subTab === "exames_urologicos" && doctorData?.can_prescribe_urology_exams && (
              <div>
                <div className="max-h-80 overflow-y-auto border p-3 rounded mb-4 space-y-4">
                  {/* Laboratoriais */}
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 mb-2 border-b pb-1">🧪 Laboratoriais</h4>
                    <div className="grid grid-cols-2 gap-1">
                      {urologyExamOptions.laboratoriais.map((exam) => (
                        <label key={exam} className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedUrologyExams.includes(exam)}
                            onChange={() => toggleUrologyExam(exam)}
                          />
                          <span>{exam}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Hormônios e outros */}
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 mb-2 border-b pb-1">💉 Hormônios e Outros</h4>
                    <div className="grid grid-cols-2 gap-1">
                      {urologyExamOptions.hormonios.map((exam) => (
                        <label key={exam} className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedUrologyExams.includes(exam)}
                            onChange={() => toggleUrologyExam(exam)}
                          />
                          <span>{exam}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Imagem e Procedimentos */}
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 mb-2 border-b pb-1">📷 Imagem e Procedimentos</h4>
                    <div className="grid grid-cols-2 gap-1">
                      {urologyExamOptions.imagem.map((exam) => (
                        <label key={exam} className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedUrologyExams.includes(exam)}
                            onChange={() => toggleUrologyExam(exam)}
                          />
                          <span>{exam}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center gap-3">
                  <span className="text-xs text-gray-500">
                    {selectedUrologyExams.length} exame(s) selecionado(s)
                  </span>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={onClose}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => handleSave("urology_exams")}
                      disabled={loading}
                    >
                      {loading ? "Salvando..." : "Criar & Imprimir Exames"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Subaba: Exames Cardiológicos */}
            {subTab === "exames_cardiologicos" && doctorData?.can_prescribe_cardiology_exams && (
              <div>
                <div className="max-h-80 overflow-y-auto border p-3 rounded mb-4 space-y-4">
                  {/* Hemograma */}
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 mb-2 border-b pb-1">🩸 Hemograma</h4>
                    <div className="grid grid-cols-2 gap-1">
                      {cardiologyExamOptions.hemograma.map((exam) => (
                        <label key={exam} className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedCardiologyExams.includes(exam)}
                            onChange={() => toggleCardiologyExam(exam)}
                          />
                          <span>{exam}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Perfil Lipídico */}
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 mb-2 border-b pb-1">💉 Perfil Lipídico</h4>
                    <div className="grid grid-cols-2 gap-1">
                      {cardiologyExamOptions.perfilLipidico.map((exam) => (
                        <label key={exam} className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedCardiologyExams.includes(exam)}
                            onChange={() => toggleCardiologyExam(exam)}
                          />
                          <span>{exam}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Função Metabólica/Renal */}
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 mb-2 border-b pb-1">🔬 Função Metabólica/Renal</h4>
                    <div className="grid grid-cols-2 gap-1">
                      {cardiologyExamOptions.metabolico.map((exam) => (
                        <label key={exam} className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedCardiologyExams.includes(exam)}
                            onChange={() => toggleCardiologyExam(exam)}
                          />
                          <span>{exam}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Função Hepática */}
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 mb-2 border-b pb-1">🫀 Função Hepática</h4>
                    <div className="grid grid-cols-2 gap-1">
                      {cardiologyExamOptions.hepatico.map((exam) => (
                        <label key={exam} className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedCardiologyExams.includes(exam)}
                            onChange={() => toggleCardiologyExam(exam)}
                          />
                          <span>{exam}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Tireoide */}
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 mb-2 border-b pb-1">🦋 Tireoide</h4>
                    <div className="grid grid-cols-2 gap-1">
                      {cardiologyExamOptions.tireoide.map((exam) => (
                        <label key={exam} className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedCardiologyExams.includes(exam)}
                            onChange={() => toggleCardiologyExam(exam)}
                          />
                          <span>{exam}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Ferro e Vitaminas */}
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 mb-2 border-b pb-1">💊 Ferro e Vitaminas</h4>
                    <div className="grid grid-cols-2 gap-1">
                      {cardiologyExamOptions.ferroVitaminas.map((exam) => (
                        <label key={exam} className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedCardiologyExams.includes(exam)}
                            onChange={() => toggleCardiologyExam(exam)}
                          />
                          <span>{exam}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Eletrólitos */}
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 mb-2 border-b pb-1">⚡ Eletrólitos</h4>
                    <div className="grid grid-cols-2 gap-1">
                      {cardiologyExamOptions.eletrólitos.map((exam) => (
                        <label key={exam} className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedCardiologyExams.includes(exam)}
                            onChange={() => toggleCardiologyExam(exam)}
                          />
                          <span>{exam}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Urina */}
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 mb-2 border-b pb-1">🧪 Exames de Urina</h4>
                    <div className="grid grid-cols-2 gap-1">
                      {cardiologyExamOptions.urina.map((exam) => (
                        <label key={exam} className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedCardiologyExams.includes(exam)}
                            onChange={() => toggleCardiologyExam(exam)}
                          />
                          <span>{exam}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center gap-3">
                  <span className="text-xs text-gray-500">
                    {selectedCardiologyExams.length} exame(s) selecionado(s)
                  </span>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={onClose}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => handleSave("cardiology_exams")}
                      disabled={loading}
                    >
                      {loading ? "Salvando..." : "Criar & Imprimir Exames"}
                    </Button>
                  </div>
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
