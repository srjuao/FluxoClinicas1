// @ts-nocheck
import React, { useState, useEffect, FormEvent, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { X, FileText, Upload, Paperclip, Trash2, Printer, Mic, MicOff, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import { formatDate } from "@/utils";
import { generateMedicalReport } from "@/lib/geminiClient";

// Declaração para TypeScript reconhecer a Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface AddExamModalProps {
  patientId: string;
  patientName: string;
  doctorId: string;
  clinicId: string;
  onClose: () => void;
  onSuccess: () => void;
}

// Laudo agora é um texto único gerado pela IA

interface PatientInfo {
  birth_date: string | null;
  sexo: string | null;
  cpf: string | null;
}

interface DoctorInfo {
  name: string;
  crm: string;
}

const AddExamModal: React.FC<AddExamModalProps> = ({
  patientId,
  patientName,
  doctorId,
  clinicId,
  onClose,
  onSuccess,
}) => {
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [description, setDescription] = useState("");
  const [laudoText, setLaudoText] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [doctorInfo, setDoctorInfo] = useState<DoctorInfo | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [transcriptPreview, setTranscriptPreview] = useState("");
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiDescription, setAIDescription] = useState("");
  const [generatingAI, setGeneratingAI] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const fullTranscriptRef = useRef<string>("");
  const detectedFieldRef = useRef<keyof LaudoData | null>(null);
  const isExamTypeRef = useRef<boolean>(false);
  const fieldConfirmedRef = useRef<boolean>(false);

  // Palavras-chave para detectar o tipo de exame (título)
  const examTypeKeywords = [
    "tipo de exame", "tipo do exame", "exame", "título", "titulo", "nome do exame"
  ];

  // Tipos de exames comuns para auto-detectar
  const commonExamTypes = [
    "ultrassonografia", "ultrassom", "ecografia",
    "ressonância magnética", "ressonancia magnetica", "rm",
    "tomografia", "tomografia computadorizada", "tc", "ct",
    "raio-x", "raio x", "rx", "radiografia",
    "hemograma", "hemograma completo",
    "eletrocardiograma", "ecg", "ekg",
    "ecocardiograma", "eco",
    "endoscopia", "colonoscopia",
    "mamografia",
    "densitometria", "densitometria óssea",
    "glicemia", "glicose",
    "colesterol", "perfil lipídico", "perfil lipidico",
    "função renal", "funcao renal", "ureia", "creatinina",
    "função hepática", "funcao hepatica", "tgo", "tgp",
    "urina", "eas", "exame de urina",
    "tireoide", "tsh", "t3", "t4",
    "psa",
    "vitamina d",
    "ferritina", "ferro sérico",
  ];

  // Palavras-chave para detectar qual campo o médico está ditando
  const fieldKeywords: Record<keyof LaudoData, string[]> = {
    indicacaoClinica: [
      "indicação", "indicacao", "indicação clínica", "indicacao clinica",
      "queixa", "queixa principal", "motivo", "histórico", "historico",
      "paciente apresenta", "paciente relata", "paciente refere"
    ],
    metodo: [
      "método", "metodo", "técnica", "tecnica", "realizado",
      "exame realizado", "procedimento", "utilizando", "através de", "atraves de"
    ],
    achados: [
      "achados", "achado", "encontrado", "observado", "visualizado",
      "identificado", "nota-se", "observa-se", "evidencia-se", "presença de", "presenca de"
    ],
    conclusao: [
      "conclusão", "conclusao", "impressão", "impressao", "diagnóstico", "diagnostico",
      "laudo", "parecer", "em resumo", "conclui-se", "sugere-se"
    ],
    observacoes: [
      "observação", "observacao", "observações", "observacoes", "nota", "notas",
      "adicional", "complementar", "recomendação", "recomendacao", "orientação", "orientacao"
    ],
  };

  // Função para detectar tipo de exame
  const detectExamType = useCallback((text: string): string | null => {
    const lowerText = text.toLowerCase().trim();

    // Primeiro, verificar se começa com "tipo de exame:", "exame:", etc.
    for (const keyword of examTypeKeywords) {
      const pattern = new RegExp(`^${keyword}\\s*:\\s*(.+)`, "i");
      const match = lowerText.match(pattern);
      if (match) {
        // Capitalizar primeira letra de cada palavra
        return match[1].trim().replace(/\b\w/g, l => l.toUpperCase());
      }
    }

    // Depois, verificar se menciona um tipo comum de exame
    for (const examType of commonExamTypes) {
      if (lowerText.includes(examType)) {
        // Retornar o tipo formatado corretamente
        const formatted = examType
          .split(" ")
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        return formatted;
      }
    }

    return null;
  }, []);

  // Função para detectar qual campo baseado no texto
  const detectField = useCallback((text: string): keyof LaudoData | null => {
    const lowerText = text.toLowerCase().trim();

    // Verificar se é tipo de exame primeiro (retorna null para não adicionar a campos de laudo)
    for (const keyword of examTypeKeywords) {
      if (lowerText.startsWith(keyword)) {
        return null; // Será tratado separadamente como tipo de exame
      }
    }

    for (const [field, keywords] of Object.entries(fieldKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.startsWith(keyword) || lowerText.includes(keyword + ":") || lowerText.includes(keyword + " ")) {
          return field as keyof LaudoData;
        }
      }
    }
    return null;
  }, []);

  // Função para verificar se o texto é para tipo de exame
  const isExamTypeText = useCallback((text: string): boolean => {
    const lowerText = text.toLowerCase().trim();
    for (const keyword of examTypeKeywords) {
      if (lowerText.startsWith(keyword)) {
        return true;
      }
    }
    return false;
  }, []);

  // Função para extrair o tipo de exame do texto
  const extractExamTypeFromText = useCallback((text: string): string => {
    const lowerText = text.toLowerCase().trim();

    for (const keyword of examTypeKeywords) {
      const patterns = [
        new RegExp(`^${keyword}\\s*:\\s*`, "i"),
        new RegExp(`^${keyword}\\s+`, "i"),
      ];

      for (const pattern of patterns) {
        const cleanText = text.replace(pattern, "").trim();
        if (cleanText !== text.trim()) {
          // Capitalizar primeira letra de cada palavra
          return cleanText.replace(/\b\w/g, l => l.toUpperCase());
        }
      }
    }

    return text.trim().replace(/\b\w/g, l => l.toUpperCase());
  }, []);

  // Função para remover a palavra-chave do início do texto
  const removeKeywordFromText = useCallback((text: string, field: keyof LaudoData): string => {
    let cleanText = text;
    const keywords = fieldKeywords[field];

    for (const keyword of keywords) {
      // Remove keyword seguido de : ou espaço no início
      const patterns = [
        new RegExp(`^${keyword}\\s*:\\s*`, "i"),
        new RegExp(`^${keyword}\\s+`, "i"),
      ];

      for (const pattern of patterns) {
        cleanText = cleanText.replace(pattern, "");
      }
    }

    return cleanText.trim();
  }, []);

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

    // Adicionar ponto final se não terminar com pontuação
    if (corrected && !/[.!?]$/.test(corrected.trim())) {
      corrected = corrected.trim() + ".";
    }

    // Remover espaços duplos
    corrected = corrected.replace(/\s+/g, " ");

    // Corrigir espaços antes de pontuação
    corrected = corrected.replace(/\s+([.,;:!?])/g, "$1");

    // Adicionar espaço após pontuação se não houver
    corrected = corrected.replace(/([.,;:!?])([A-Za-záàâãéêíóôõúç])/g, "$1 $2");

    return corrected.trim();
  }, []);

  // Função para iniciar/parar gravação de voz inteligente
  const toggleSmartVoiceRecording = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast({
        title: "Navegador não suportado",
        description: "Seu navegador não suporta reconhecimento de voz. Use Chrome, Edge ou Safari.",
        variant: "destructive",
      });
      return;
    }

    // Se já está gravando, parar
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Erro ao parar gravação:", error);
      }
      return;
    }

    // Resetar refs
    fullTranscriptRef.current = "";
    detectedFieldRef.current = null;
    isExamTypeRef.current = false;
    fieldConfirmedRef.current = false;

    // Criar nova instância do recognition
    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setCurrentField(null);
      setTranscriptPreview("");
      toast({
        title: "🎤 Ditado Inteligente Ativado",
        description: "Diga: 'Exame: ultrassom', 'Indicação: dor...', 'Achados: normal...'",
      });
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      // Atualizar transcript completo
      if (finalTranscript) {
        fullTranscriptRef.current += finalTranscript;
      }

      const currentTranscript = fullTranscriptRef.current + interimTranscript;
      setTranscriptPreview(currentTranscript);

      // Detectar se é tipo de exame ou campo do laudo (apenas uma vez)
      if (!fieldConfirmedRef.current) {
        // Verificar primeiro se é tipo de exame
        if (isExamTypeText(currentTranscript)) {
          isExamTypeRef.current = true;
          setCurrentField(null);
        } else {
          const detected = detectField(currentTranscript);
          if (detected) {
            detectedFieldRef.current = detected;
            isExamTypeRef.current = false;
            setCurrentField(detected);
          }
        }

        // Se tiver texto final, confirmar
        if (finalTranscript.trim()) {
          fieldConfirmedRef.current = true;
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Erro no reconhecimento de voz:", event.error);

      let errorMessage = "Ocorreu um erro no reconhecimento de voz.";
      if (event.error === "no-speech") {
        errorMessage = "Nenhuma fala detectada. Tente falar mais perto do microfone.";
      } else if (event.error === "not-allowed") {
        errorMessage = "Permissão de microfone negada. Permita o acesso nas configurações do navegador.";
      } else if (event.error === "network") {
        errorMessage = "Erro de rede. Verifique sua conexão com a internet.";
      } else if (event.error === "aborted") {
        // Ignorar erro de aborto (quando para manualmente)
        return;
      }

      toast({
        title: "Erro no reconhecimento de voz",
        description: errorMessage,
        variant: "destructive",
      });

      setIsListening(false);
      setCurrentField(null);
      setTranscriptPreview("");
    };

    recognition.onend = () => {
      setIsListening(false);

      const fullTranscript = fullTranscriptRef.current;

      // Se o modal de IA está aberto, preencher o campo aiDescription
      if (showAIModal && fullTranscript.trim()) {
        setAIDescription((prev) => {
          const newText = prev ? prev + " " + fullTranscript.trim() : fullTranscript.trim();
          return newText;
        });
        toast({
          title: "✓ Texto adicionado",
          description: "Clique em 'Gerar Laudo' para processar com IA.",
        });
      }

      setCurrentField(null);
      setTranscriptPreview("");
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error: any) {
      console.error("Erro ao iniciar gravação:", error);
      setIsListening(false);

      if (error.message?.includes("already started")) {
        // Se já estava iniciado, apenas atualizar estado
        setIsListening(true);
      } else {
        toast({
          title: "Erro ao iniciar gravação",
          description: "Não foi possível iniciar o reconhecimento de voz. Tente novamente.",
          variant: "destructive",
        });
      }
    }
  }, [isListening, showAIModal]);

  // Função para gerar laudo com IA
  const handleGenerateWithAI = async () => {
    if (!aiDescription.trim()) {
      toast({
        title: "Descrição vazia",
        description: "Por favor, descreva o exame para gerar o laudo.",
        variant: "destructive",
      });
      return;
    }

    setGeneratingAI(true);

    try {
      const result = await generateMedicalReport(patientName, aiDescription);

      // Preencher o laudo com o texto gerado
      setLaudoText(result.laudoText);

      // Preencher o nome do exame se estiver vazio
      if (!examName && result.examName) {
        setExamName(result.examName);
      }

      toast({
        title: "✨ Laudo gerado com sucesso!",
        description: "Os campos foram preenchidos automaticamente. Revise antes de salvar.",
      });

      setShowAIModal(false);
      setAIDescription("");
    } catch (error: any) {
      toast({
        title: "Erro ao gerar laudo",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setGeneratingAI(false);
    }
  };

  // Chave do localStorage para rascunho deste paciente
  const draftKey = `exam_draft_${patientId}`;

  // Carregar rascunho ao abrir o modal
  useEffect(() => {
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.examName) setExamName(draft.examName);
        if (draft.examDate) setExamDate(draft.examDate);
        if (draft.description) setDescription(draft.description);
        if (draft.laudoText) setLaudoText(draft.laudoText);
      } catch (e) {
        console.error("Erro ao carregar rascunho:", e);
      }
    }
  }, [draftKey]);

  // Salvar rascunho automaticamente quando os campos mudam
  useEffect(() => {
    const draft = { examName, examDate, description, laudoText };
    // Só salva se tiver algum conteúdo
    if (examName || description || laudoText) {
      localStorage.setItem(draftKey, JSON.stringify(draft));
    }
  }, [examName, examDate, description, laudoText, draftKey]);

  // Limpar rascunho após salvar com sucesso (será chamado no onSuccess)
  const clearDraft = () => {
    localStorage.removeItem(draftKey);
  };

  // Carregar dados do paciente e médico
  useEffect(() => {
    const loadData = async () => {
      // Buscar dados do paciente
      const { data: patient } = await supabase
        .from("patients")
        .select("birth_date, sexo, cpf")
        .eq("id", patientId)
        .single();

      if (patient) {
        setPatientInfo(patient);
      }

      // Buscar dados do médico
      const { data: doctor } = await supabase
        .from("doctors")
        .select("crm, profile:profiles(name)")
        .eq("id", doctorId)
        .single();

      if (doctor) {
        setDoctorInfo({
          name: doctor.profile?.name || "",
          crm: doctor.crm || "",
        });
      }
    };

    loadData();
  }, [patientId, doctorId]);

  // Função para imprimir o laudo
  const handlePrintLaudo = () => {
    if (!examName.trim()) {
      toast({
        title: "Nome do exame obrigatório",
        description: "Informe o tipo de exame antes de imprimir.",
        variant: "destructive",
      });
      return;
    }

    const formattedBirthDate = patientInfo?.birth_date
      ? formatDate(patientInfo.birth_date)
      : "Não informada";

    const formattedExamDate = new Date(examDate).toLocaleDateString("pt-BR");
    const currentDate = new Date().toLocaleDateString("pt-BR");

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Laudo de Exame - ${patientName}</title>
          <style>
            @page { 
              size: A4; 
              margin: 20mm; 
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Times New Roman', Times, serif;
              font-size: 12pt;
              line-height: 1.6;
              color: #000;
              padding: 0;
            }
            .container {
              max-width: 100%;
            }
            .header {
              text-align: center;
              margin-bottom: 25px;
              padding-bottom: 15px;
              border-bottom: 2px solid #333;
            }
            .header h1 {
              font-size: 18pt;
              font-weight: bold;
              margin-bottom: 5px;
              letter-spacing: 2px;
            }
            .patient-info {
              margin-bottom: 20px;
              padding: 15px;
              background: #f9f9f9;
              border: 1px solid #ddd;
            }
            .patient-info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
            }
            .patient-info p {
              margin: 4px 0;
              font-size: 11pt;
            }
            .patient-info strong {
              font-weight: bold;
            }
            .section {
              margin-bottom: 20px;
            }
            .section-title {
              font-size: 11pt;
              font-weight: bold;
              background: #e5e5e5;
              padding: 8px 12px;
              margin-bottom: 10px;
              border-left: 4px solid #333;
            }
            .section-content {
              padding: 0 12px;
              text-align: justify;
              white-space: pre-wrap;
            }
            .signature-area {
              margin-top: 50px;
              text-align: center;
            }
            .signature-line {
              width: 300px;
              border-top: 1px solid #000;
              margin: 0 auto 5px;
              padding-top: 5px;
            }
            .doctor-info {
              font-size: 11pt;
            }
            .footer {
              margin-top: 30px;
              padding-top: 10px;
              border-top: 1px solid #ddd;
              font-size: 9pt;
              color: #666;
              text-align: center;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>LAUDO DE EXAME</h1>
            </div>

            <div class="patient-info">
              <div class="patient-info-grid">
                <p><strong>Paciente:</strong> ${patientName}</p>
                <p><strong>Data de Nascimento:</strong> ${formattedBirthDate}</p>
                <p><strong>Sexo:</strong> ${patientInfo?.sexo === "M" ? "Masculino" : patientInfo?.sexo === "F" ? "Feminino" : "Não informado"}</p>
                <p><strong>Documento:</strong> ${patientInfo?.cpf || "Não informado"}</p>
                <p><strong>Solicitante:</strong> Dr(a). ${doctorInfo?.name || ""}</p>
                <p><strong>Data do Exame:</strong> ${formattedExamDate}</p>
              </div>
              <p style="margin-top: 10px;"><strong>Tipo de Exame:</strong> ${examName}</p>
            </div>

            ${laudoText.trim() ? `
              <div class="section">
                <div class="section-title">LAUDO</div>
                <div class="section-content">${laudoText.replace(/\n/g, '<br>')}</div>
              </div>
            ` : ''}

            <div class="signature-area">
              <div class="signature-line"></div>
              <div class="doctor-info">
                <p><strong>Dr(a). ${doctorInfo?.name || ""}</strong></p>
                <p>CRM: ${doctorInfo?.crm || ""}</p>
              </div>
              <p style="margin-top: 15px; font-size: 10pt;">Data: ${currentDate}</p>
            </div>

            <div class="footer">
              <p>Documento gerado eletronicamente pelo Sistema de Gestão de Clínicas</p>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    }, 200);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB.",
          variant: "destructive",
        });
        return;
      }

      // Check file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Tipo de arquivo não suportado",
          description: "Por favor, envie imagens, PDFs ou documentos Word.",
          variant: "destructive",
        });
        return;
      }

      setAttachedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${patientId}/${Date.now()}.${fileExt}`;
      const filePath = `exam-files/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("exames")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("exames")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast({
        title: "Erro ao fazer upload",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!examName.trim()) {
      toast({
        title: "Nome do exame obrigatório",
        description: "Por favor, informe o nome do exame.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      let fileUrl = null;

      // Upload file if attached
      if (attachedFile) {
        fileUrl = await uploadFile(attachedFile);
        if (!fileUrl) {
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase.from("exams").insert({
        patient_id: patientId,
        doctor_id: doctorId,
        clinic_id: clinicId,
        exam_name: examName,
        exam_date: examDate,
        description: description || null,
        results: laudoText || null,
        file_url: fileUrl,
        file_name: attachedFile?.name || null,
      });

      if (error) throw error;

      toast({
        title: "Exame adicionado com sucesso! ✅",
        description: `${examName} foi registrado para ${patientName}`,
      });

      clearDraft(); // Limpa rascunho após salvar
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar exame",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-effect rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Adicionar Exame
              </h2>
              <p className="text-sm text-gray-600">{patientName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Exam Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Exame <span className="text-red-500">*</span>
              <span className="ml-2 text-xs text-purple-600 font-normal">
                (ou dite: "Exame: ultrassonografia...")
              </span>
            </label>
            <input
              type="text"
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              placeholder='Ex: Ultrassonografia Abdominal, Hemograma, Raio-X... (dite: "Exame: ...")'
              className={`w-full px-4 py-2 rounded-lg border transition-all outline-none ${examName
                ? "border-green-300 bg-green-50"
                : "border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                }`}
              required
            />
            {examName && (
              <p className="text-xs text-green-600 mt-1">✓ Tipo de exame definido</p>
            )}
          </div>

          {/* Exam Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data do Exame
            </label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição / Observações
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Informações adicionais sobre o exame solicitado..."
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none resize-none"
            />
          </div>

          {/* Laudo de Exame */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            {/* Header com microfone central */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                Laudo do Exame
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => setShowAIModal(true)}
                  size="sm"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md"
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  Gerar com IA
                </Button>
                <Button
                  type="button"
                  onClick={handlePrintLaudo}
                  variant="outline"
                  size="sm"
                  className="text-purple-600 border-purple-300 hover:bg-purple-50"
                >
                  <Printer className="w-4 h-4 mr-1" />
                  Imprimir
                </Button>
              </div>
            </div>

            {/* Campo único do Laudo */}
            <div className="mt-4">
              <textarea
                value={laudoText}
                onChange={(e) => setLaudoText(e.target.value)}
                placeholder="Clique em 'Gerar com IA' e descreva o exame por voz para gerar o laudo automaticamente..."
                rows={10}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none resize-none text-sm font-mono whitespace-pre-wrap"
              />
              {laudoText && (
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => setLaudoText("")}
                    className="text-xs text-red-500 hover:text-red-700 px-3 py-1 rounded hover:bg-red-50"
                  >
                    Limpar Laudo
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* File Attachment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Anexar Arquivo
            </label>

            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx"
              className="hidden"
            />

            {!attachedFile ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-400 transition-colors flex items-center justify-center space-x-2 text-gray-600 hover:text-purple-600"
              >
                <Paperclip className="w-5 h-5" />
                <span className="text-sm">
                  Clique para anexar imagem, PDF ou documento
                </span>
              </button>
            ) : (
              <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-purple-300 bg-purple-50">
                <div className="flex items-center space-x-3">
                  <Paperclip className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {attachedFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(attachedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            )}

            <p className="text-xs text-gray-500 mt-1">
              📎 Formatos aceitos: JPG, PNG, GIF, PDF, DOC, DOCX (máx. 10MB)
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 gradient-primary text-white"
              disabled={loading || uploading}
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enviando arquivo...
                </>
              ) : loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Adicionar Exame
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>

      {/* Modal de Geração com IA */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl"
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Gerar Laudo com IA</h3>
                  <p className="text-xs text-gray-500">Descreva o exame em linguagem natural</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAIModal(false);
                  setAIDescription("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Descreva os detalhes do exame:
                </label>
                <button
                  type="button"
                  onClick={toggleSmartVoiceRecording}
                  disabled={generatingAI}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isListening
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
              <div className="relative">
                <textarea
                  value={aiDescription}
                  onChange={(e) => setAIDescription(e.target.value)}
                  placeholder="Ex: Paciente veio hoje para fazer uma mamografia. No peito direito deu um nó de 8mm, no peito esquerdo não apresentou nada. Aparentemente tudo ok, mas precisa acompanhar."
                  rows={5}
                  className={`w-full px-4 py-3 rounded-lg border transition-all outline-none resize-none text-sm ${isListening
                    ? "border-red-400 ring-2 ring-red-200 bg-red-50"
                    : "border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                    }`}
                  disabled={generatingAI}
                />
                {isListening && (
                  <div className="absolute bottom-2 left-2 right-2 p-2 bg-yellow-100 border border-yellow-300 rounded-lg">
                    <p className="text-sm text-yellow-800 flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="font-medium">Ouvindo...</span> {transcriptPreview || "Fale agora"}
                    </p>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 Dica: Clique em "Ditar" para falar o exame por voz. A IA irá estruturar em formato profissional.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAIModal(false);
                  setAIDescription("");
                }}
                className="flex-1"
                disabled={generatingAI}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleGenerateWithAI}
                disabled={generatingAI || !aiDescription.trim()}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {generatingAI ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Gerar Laudo
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AddExamModal;
