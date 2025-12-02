import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  FormEvent,
} from "react";
import { motion } from "framer-motion";
import { X, FileText, Search, Mic, MicOff, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import { formatCPF } from "@/utils";
import type { Patient } from "@/types/database.types";
import type { CreateReportModalProps } from "@/types/components.types";

// Declaração para TypeScript reconhecer a Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const CreateReportModal: React.FC<CreateReportModalProps> = ({
  doctorId,
  clinicId,
  defaultPatient,
  onClose,
  onSuccess,
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(
    defaultPatient || null
  );
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [interimText, setInterimText] = useState<string>(""); // texto provisório enquanto fala
  const [loading, setLoading] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);

  const lastSavedPatientId = useRef<string | null>(null); // para controlar troca de paciente
  const recognitionRef = useRef<any>(null);
  const baseContentRef = useRef<string>(""); // guarda o conteúdo base antes de começar a falar

  // Função para corrigir erros comuns de português e formatar texto
  const correctAndFormatText = useCallback((text: string): string => {
    if (!text) return "";

    let corrected = text;

    // Corrigir erros comuns de digitação por voz
    const corrections: Record<string, string> = {
      // Termos médicos comuns
      "hiper tensão": "hipertensão",
      "hiper tensao": "hipertensão",
      "diabetis": "diabetes",
      "diabete": "diabetes",
      "colesterol": "colesterol",
      "triglicerideos": "triglicerídeos",
      "triglicerides": "triglicerídeos",
      "ultra som": "ultrassom",
      "ultra sonografia": "ultrassonografia",
      "ressonancia": "ressonância",
      "resonancia": "ressonância",
      "tomografia": "tomografia",
      "raio x": "raio-X",
      "raio-x": "raio-X",
      "rx": "RX",
      "ecg": "ECG",
      "ekg": "ECG",
      "hemograma": "hemograma",
      "glicemia": "glicemia",
      "glicose": "glicose",
      "creatinina": "creatinina",
      "ureia": "ureia",
      "uréia": "ureia",
      // Anatomia
      "figado": "fígado",
      "vesicula": "vesícula",
      "pancreas": "pâncreas",
      "estomago": "estômago",
      "intestino": "intestino",
      "rim": "rim",
      "rins": "rins",
      "coracao": "coração",
      "pulmao": "pulmão",
      "pulmoes": "pulmões",
      "tireoide": "tireoide",
      "tireóide": "tireoide",
      "cabeca": "cabeça",
      "barriga": "abdômen",
      "pescoco": "pescoço",
      "joelho": "joelho",
      "tornozelo": "tornozelo",
      // Sintomas e termos clínicos
      "dor de cabeca": "cefaleia",
      "dor de cabeça": "cefaleia",
      "febre": "febre",
      "tosse": "tosse",
      "nausea": "náusea",
      "vomito": "vômito",
      "diarreia": "diarreia",
      "diarréia": "diarreia",
      "constipacao": "constipação",
      "prisao de ventre": "constipação",
      "falta de ar": "dispneia",
      "cansaco": "fadiga",
      "cansaço": "fadiga",
      "tontura": "tontura",
      "vertigem": "vertigem",
      "inchaço": "edema",
      "inchaco": "edema",
      // Termos gerais
      "paciente": "paciente",
      "exame": "exame",
      "normal": "normal",
      "alterado": "alterado",
      "sem alteracoes": "sem alterações",
      "sem alterações": "sem alterações",
      "presenca": "presença",
      "ausencia": "ausência",
      "aumento": "aumento",
      "diminuicao": "diminuição",
      "diminuição": "diminuição",
      "queixa": "queixa",
      "historia": "história",
      "historico": "histórico",
      "antecedente": "antecedente",
      "alergia": "alergia",
      "medicacao": "medicação",
      "medicamento": "medicamento",
      "cirurgia": "cirurgia",
      "internacao": "internação",
      // Conectivos e palavras comuns
      "nao": "não",
      "entao": "então",
      "tambem": "também",
      "porem": "porém",
      "atraves": "através",
      "apos": "após",
      "ate": "até",
      "ja": "já",
      "so": "só",
      "esta": "está",
      "sao": "são",
      "estao": "estão",
      "voce": "você",
      "tambem": "também",
      "necessario": "necessário",
      "necessaria": "necessária",
      "proximo": "próximo",
      "proxima": "próxima",
      "medico": "médico",
      "medica": "médica",
      "familia": "família",
      "mamae": "mãe",
      "papai": "pai",
      "irmao": "irmão",
      "irma": "irmã",
    };

    // Aplicar correções (case insensitive)
    Object.entries(corrections).forEach(([wrong, right]) => {
      const regex = new RegExp(`\\b${wrong}\\b`, "gi");
      corrected = corrected.replace(regex, right);
    });

    // Primeira letra maiúscula após ponto, exclamação ou interrogação
    corrected = corrected.replace(/([.!?]\s*)([a-záàâãéêíóôõúç])/gi, (match, p1, p2) => {
      return p1 + p2.toUpperCase();
    });

    // Primeira letra do texto em maiúscula
    corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);

    // Remover espaços duplos
    corrected = corrected.replace(/\s+/g, " ");

    // Corrigir espaços antes de pontuação
    corrected = corrected.replace(/\s+([.,;:!?])/g, "$1");

    // Adicionar espaço após pontuação se não houver
    corrected = corrected.replace(/([.,;:!?])([A-Za-záàâãéêíóôõúç])/g, "$1 $2");

    return corrected.trim();
  }, []);

  // Função para aplicar correção manualmente
  const applyCorrection = useCallback(() => {
    setContent((prev) => correctAndFormatText(prev));
    toast({
      title: "✓ Texto corrigido",
      description: "Correções ortográficas e de formatação aplicadas.",
    });
  }, [correctAndFormatText]);

  // 🔹 Inicializar reconhecimento de voz
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "pt-BR";

      let accumulatedFinal = "";

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + " ";
          } else {
            interimTranscript += transcript;
          }
        }

        // Acumular texto final
        if (finalTranscript) {
          accumulatedFinal += finalTranscript;
          // Atualizar o conteúdo com o texto final
          setContent(baseContentRef.current + accumulatedFinal);
        }

        // Mostrar texto provisório em tempo real
        setInterimText(interimTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error("Erro no reconhecimento de voz:", event.error);
        setIsListening(false);
        setInterimText("");
        toast({
          title: "Erro no reconhecimento de voz",
          description: `Ocorreu um erro: ${event.error}`,
          variant: "destructive",
        });
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText("");
        // Aplicar correção automática ao parar de gravar
        setContent((prev) => correctAndFormatText(prev));
        accumulatedFinal = "";
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [correctAndFormatText]);

  // 🔹 Função para iniciar/parar transcrição
  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Navegador não suportado",
        description: "Seu navegador não suporta reconhecimento de voz.",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimText("");
    } else {
      // Guardar o conteúdo atual como base
      baseContentRef.current = content;
      recognitionRef.current.start();
      setIsListening(true);
      toast({
        title: "🎤 Escutando...",
        description: "Fale agora. O texto aparecerá em tempo real.",
      });
    }
  };

  // 🔹 Carregar pacientes
  const loadPatients = useCallback(async () => {
    if (!clinicId) return;
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .eq("clinic_id", clinicId);
    if (!error) setPatients(data || []);
  }, [clinicId]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // 🔹 Restaurar rascunho ao abrir
  useEffect(() => {
    const saved = localStorage.getItem(`reportDraft-${selectedPatient?.id}`);
    if (saved) {
      const { patient, title, content } = JSON.parse(saved);
      if (patient) {
        setSelectedPatient(patient);
        lastSavedPatientId.current = patient.id;
      }
      if (title) setTitle(title);
      if (content) setContent(content);
    }
  }, []);

  // 🔹 Salvar rascunho e apagar ao trocar de paciente
  useEffect(() => {
    if (!selectedPatient) return;

    // se mudou de paciente, limpa o rascunho antigo
    if (
      lastSavedPatientId.current &&
      lastSavedPatientId.current !== selectedPatient.id
    ) {
      localStorage.removeItem(`reportDraft-${lastSavedPatientId.current}`);
    }

    localStorage.setItem(
      `reportDraft-${selectedPatient.id}`,
      JSON.stringify({
        patient: selectedPatient,
        title,
        content,
      })
    );

    lastSavedPatientId.current = selectedPatient.id;
  }, [selectedPatient, title, content]);

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.cpf && p.cpf.includes(searchTerm))
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPatient)
      return toast({ title: "Selecione um paciente!", variant: "destructive" });
    if (!title || !content)
      return toast({
        title: "Preencha todos os campos!",
        variant: "destructive",
      });

    setLoading(true);
    const { error } = await supabase.from("medical_reports").insert({
      doctor_id: doctorId,
      clinic_id: clinicId,
      patient_id: selectedPatient.id,
      title,
      content,
    });
    setLoading(false);

    if (error)
      return toast({
        title: "Erro ao salvar anamnese!",
        description: error.message,
        variant: "destructive",
      });

    toast({ title: "Anamnese registrada com sucesso! 🎉" });

    // limpa rascunho depois de salvar
    localStorage.removeItem(`reportDraft-${selectedPatient.id}`);
    onSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-bold">Nova Anamnese</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!selectedPatient ? (
            <>
              <div>
                <label className="text-sm font-medium">Buscar Paciente</label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    className="w-full pl-10 pr-3 py-2 border rounded-lg"
                    placeholder="Nome ou CPF"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {searchTerm && (
                <div className="border rounded-lg max-h-48 overflow-auto">
                  {filteredPatients.map((p) => (
                    <div
                      key={p.id}
                      className="p-2 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedPatient(p)}
                    >
                      {p.name} — {formatCPF(p.cpf || "")}
                    </div>
                  ))}
                  {filteredPatients.length === 0 && (
                    <p className="p-2 text-gray-500 text-sm text-center">
                      Nenhum paciente encontrado
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="p-3 border rounded-lg bg-gray-50">
              <p className="font-semibold">{selectedPatient.name}</p>
              <p className="text-sm text-gray-600">
                CPF: {formatCPF(selectedPatient.cpf || "")}
              </p>
              <button
                onClick={() => setSelectedPatient(null)}
                type="button"
                className="text-xs text-blue-600 mt-1"
              >
                Trocar paciente
              </button>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Título</label>
            <input
              className="w-full border rounded-lg p-2 mt-1"
              placeholder="Ex: Consulta inicial"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium">Anamnese</label>
              <div className="flex items-center gap-2">
                {content && (
                  <button
                    type="button"
                    onClick={applyCorrection}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-100 text-green-600 hover:bg-green-200 transition-all"
                    title="Corrigir erros de português"
                  >
                    <Sparkles className="w-4 h-4" />
                    Corrigir
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isListening
                      ? "bg-red-100 text-red-600 hover:bg-red-200 animate-pulse"
                      : "bg-purple-100 text-purple-600 hover:bg-purple-200"
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      Parar
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      Ditar
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="relative">
              <textarea
                className={`w-full border rounded-lg p-2 h-40 transition-all ${
                  isListening ? "border-red-400 ring-2 ring-red-200 bg-red-50" : ""
                }`}
                placeholder="Digite a anamnese ou clique em 'Ditar' para transcrever por voz..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={isListening}
              />
              {/* Mostrar texto provisório em tempo real */}
              {isListening && interimText && (
                <div className="absolute bottom-2 left-2 right-2 p-2 bg-yellow-100 border border-yellow-300 rounded-lg">
                  <p className="text-sm text-yellow-800 italic">
                    <span className="font-medium">Ouvindo:</span> {interimText}
                  </p>
                </div>
              )}
            </div>
            {isListening && (
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  Gravando... O texto aparece em tempo real
                </p>
                <p className="text-xs text-gray-500">
                  ✨ Correção automática ao parar
                </p>
              </div>
            )}
            {!isListening && content && (
              <p className="text-xs text-gray-500 mt-1">
                💡 Clique em "Corrigir" para aplicar correções ortográficas e de formatação.
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Salvando..." : "Salvar Anamnese"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default CreateReportModal;
