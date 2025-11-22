import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

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

const CreatePrescriptionModal = ({
  doctorId,
  clinicId,
  onClose,
  onSuccess,
  preselectedPatient,
}) => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(
    preselectedPatient?.id || ""
  );
  const [activeTab, setActiveTab] = useState("receita");
  const [subTab, setSubTab] = useState("sem_lentes"); // 🔹 nova subaba
  const [medicationContent, setMedicationContent] = useState("");
  const [lensData, setLensData] = useState({
    od_esf: "",
    od_cil: "",
    od_eixo: "",
    oe_esf: "",
    oe_cil: "",
    oe_eixo: "",
    adicao: "",
  });
  const [selectedExams, setSelectedExams] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const toggleExam = (exam) => {
    setSelectedExams((prev) =>
      prev.includes(exam) ? prev.filter((e) => e !== exam) : [...prev, exam]
    );
  };

  const handleSave = async (type) => {
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
    const { error } = await supabase
      .from("prescriptions")
      .insert([
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

  const handlePrint = (type, content) => {
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

    if (type === "medication" && parsed.medicationContent?.trim()) {
      printContent += `<h3>Receita Médica</h3><p style="white-space: pre-line;">${parsed.medicationContent}</p>`;
    }

    if (type === "exams" && parsed.selectedExams?.length) {
      printContent += `<h3>Exames</h3><ul>${parsed.selectedExams
        .map((e) => `<li>${e}</li>`)
        .join("")}</ul>`;
    }

    if (type === "lenses" && Object.values(parsed.lensData).some((v) => v)) {
      printContent += `
        <h3>Lentes</h3>
        <table>
          <tr><th></th><th>ESF</th><th>CIL</th><th>EIXO</th></tr>
          <tr><td>OD</td><td>${parsed.lensData.od_esf}</td><td>${parsed.lensData.od_cil}</td><td>${parsed.lensData.od_eixo}</td></tr>
          <tr><td>OE</td><td>${parsed.lensData.oe_esf}</td><td>${parsed.lensData.oe_cil}</td><td>${parsed.lensData.oe_eixo}</td></tr>
          <tr><td>Adição</td><td colspan="3">${parsed.lensData.adicao}</td></tr>
        </table>`;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Prescrição</title>
          <style>
            body { font-family: Arial, sans-serif; padding-top: 170px; text-align: center; position: relative; min-height: 100vh; }
            .patient { font-weight: bold; margin-bottom: 20px; }
            table { border-collapse: collapse; margin: 15px auto; width: 80%; }
            td, th { border: 1px solid #ccc; padding: 8px; text-align: center; }
            ul { list-style: none; padding: 0; margin-top: 10px; }
            li { margin: 4px 0; }
            .footer { position: absolute; bottom: 80px; right: 60px; font-size: 14px; color: #555; display: flex; gap: 12px; }
            h3 { margin-top: 20px; margin-bottom: 8px; }
          </style>
        </head>
        <body>
          <p class="patient">Paciente: ${patientName}</p>
          ${printContent || "<p>Nada para imprimir.</p>"}
          <div class="footer">
            <span>Cidade:________ UF:_____</span>
            <span>${formattedDate}</span>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
    printWindow.onafterprint = () => printWindow.close();
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
            {subTab === "lentes" && (
              <div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <h3>Olho Direito (OD)</h3>
                    <input
                      placeholder="ESF"
                      className="border rounded p-2 w-full mb-2"
                      value={lensData.od_esf}
                      onChange={(e) =>
                        setLensData({ ...lensData, od_esf: e.target.value })
                      }
                    />
                    <input
                      placeholder="CIL"
                      className="border rounded p-2 w-full mb-2"
                      value={lensData.od_cil}
                      onChange={(e) =>
                        setLensData({ ...lensData, od_cil: e.target.value })
                      }
                    />
                    <input
                      placeholder="EIXO"
                      className="border rounded p-2 w-full"
                      value={lensData.od_eixo}
                      onChange={(e) =>
                        setLensData({ ...lensData, od_eixo: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <h3>Olho Esquerdo (OE)</h3>
                    <input
                      placeholder="ESF"
                      className="border rounded p-2 w-full mb-2"
                      value={lensData.oe_esf}
                      onChange={(e) =>
                        setLensData({ ...lensData, oe_esf: e.target.value })
                      }
                    />
                    <input
                      placeholder="CIL"
                      className="border rounded p-2 w-full mb-2"
                      value={lensData.oe_cil}
                      onChange={(e) =>
                        setLensData({ ...lensData, oe_cil: e.target.value })
                      }
                    />
                    <input
                      placeholder="EIXO"
                      className="border rounded p-2 w-full"
                      value={lensData.oe_eixo}
                      onChange={(e) =>
                        setLensData({ ...lensData, oe_eixo: e.target.value })
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      placeholder="Adição"
                      className="border rounded p-2 w-full"
                      value={lensData.adicao}
                      onChange={(e) =>
                        setLensData({ ...lensData, adicao: e.target.value })
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
            {subTab === "exames" && (
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
