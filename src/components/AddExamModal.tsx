// @ts-nocheck
import React, { useState, useEffect, FormEvent, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { X, FileText, Upload, Paperclip, Trash2, Printer, Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";

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

interface LaudoData {
  indicacaoClinica: string;
  metodo: string;
  achados: string;
  conclusao: string;
  observacoes: string;
}

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
  const [laudo, setLaudo] = useState<LaudoData>({
    indicacaoClinica: "",
    metodo: "",
    achados: "",
    conclusao: "",
    observacoes: "",
  });
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [doctorInfo, setDoctorInfo] = useState<DoctorInfo | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [currentField, setCurrentField] = useState<keyof LaudoData | null>(null);
  const [transcriptPreview, setTranscriptPreview] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

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
      recognitionRef.current.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;

    let fullTranscript = "";
    let detectedField: keyof LaudoData | null = null;
    let isExamType = false;
    let fieldConfirmed = false;

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

      const currentTranscript = fullTranscript + finalTranscript + interimTranscript;
      setTranscriptPreview(currentTranscript);

      // Detectar se é tipo de exame ou campo do laudo
      if (!fieldConfirmed) {
        // Verificar primeiro se é tipo de exame
        if (isExamTypeText(currentTranscript)) {
          isExamType = true;
          setCurrentField(null); // Não é um campo do laudo
        } else {
          const detected = detectField(currentTranscript);
          if (detected) {
            detectedField = detected;
            isExamType = false;
            setCurrentField(detected);
          }
        }
        
        // Se tiver texto final, confirmar
        if (finalTranscript.trim()) {
          fieldConfirmed = true;
        }
      }

      // Atualizar o transcript completo
      if (finalTranscript) {
        fullTranscript += finalTranscript;
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Erro no reconhecimento de voz:", event.error);
      if (event.error === "no-speech") {
        toast({
          title: "Nenhuma fala detectada",
          description: "Tente novamente e fale mais perto do microfone.",
          variant: "destructive",
        });
      } else if (event.error === "not-allowed") {
        toast({
          title: "Microfone bloqueado",
          description: "Permita o acesso ao microfone nas configurações do navegador.",
          variant: "destructive",
        });
      }
      setIsListening(false);
      setCurrentField(null);
      setTranscriptPreview("");
    };

    recognition.onend = () => {
      setIsListening(false);
      
      // Se é tipo de exame
      if (fullTranscript.trim() && isExamType) {
        const extractedType = extractExamTypeFromText(fullTranscript);
        setExamName(extractedType);
        toast({
          title: "✓ Tipo de Exame definido",
          description: extractedType,
        });
      }
      // Se é campo do laudo
      else if (fullTranscript.trim() && detectedField) {
        // Remover a palavra-chave e limpar o texto
        let cleanText = removeKeywordFromText(fullTranscript, detectedField);
        cleanText = correctAndFormatText(cleanText);
        
        // Adicionar ao campo detectado
        setLaudo((prev) => {
          const existingText = prev[detectedField!];
          const newText = existingText 
            ? existingText + " " + cleanText 
            : cleanText;
          return { ...prev, [detectedField!]: newText };
        });

        const fieldNames: Record<keyof LaudoData, string> = {
          indicacaoClinica: "Indicação Clínica",
          metodo: "Método",
          achados: "Achados",
          conclusao: "Conclusão",
          observacoes: "Observações",
        };

        toast({
          title: `✓ Adicionado em "${fieldNames[detectedField]}"`,
          description: cleanText.substring(0, 50) + (cleanText.length > 50 ? "..." : ""),
        });
      } 
      // Tentar detectar tipo de exame automaticamente pelo conteúdo
      else if (fullTranscript.trim() && !detectedField && !isExamType) {
        const autoDetectedType = detectExamType(fullTranscript);
        if (autoDetectedType && !examName) {
          setExamName(autoDetectedType);
          toast({
            title: "✓ Tipo de Exame detectado automaticamente",
            description: autoDetectedType,
          });
        } else {
          toast({
            title: "Campo não identificado",
            description: "Diga: 'Exame:', 'Indicação:', 'Método:', 'Achados:', 'Conclusão:' ou 'Observações:'",
            variant: "destructive",
          });
        }
      }

      setCurrentField(null);
      setTranscriptPreview("");
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isListening, detectField, removeKeywordFromText, correctAndFormatText]);

  // Função para corrigir texto manualmente
  const applyCorrection = useCallback((field: keyof LaudoData) => {
    setLaudo((prev) => ({
      ...prev,
      [field]: correctAndFormatText(prev[field]),
    }));
    toast({
      title: "✓ Texto corrigido",
      description: "Correções ortográficas e de formatação aplicadas.",
    });
  }, [correctAndFormatText]);

  // Função para limpar um campo
  const clearField = useCallback((field: keyof LaudoData) => {
    setLaudo((prev) => ({ ...prev, [field]: "" }));
  }, []);

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

  const handleLaudoChange = (field: keyof LaudoData, value: string) => {
    setLaudo((prev) => ({ ...prev, [field]: value }));
  };

  // Gera o texto formatado do laudo para salvar
  const generateLaudoText = () => {
    const parts = [];
    
    if (laudo.indicacaoClinica.trim()) {
      parts.push(`INDICAÇÃO CLÍNICA / QUEIXA PRINCIPAL:\n${laudo.indicacaoClinica}`);
    }
    if (laudo.metodo.trim()) {
      parts.push(`MÉTODO:\n${laudo.metodo}`);
    }
    if (laudo.achados.trim()) {
      parts.push(`ACHADOS:\n${laudo.achados}`);
    }
    if (laudo.conclusao.trim()) {
      parts.push(`CONCLUSÃO / IMPRESSÃO DIAGNÓSTICA:\n${laudo.conclusao}`);
    }
    if (laudo.observacoes.trim()) {
      parts.push(`OBSERVAÇÕES:\n${laudo.observacoes}`);
    }
    
    return parts.join("\n\n");
  };

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
      ? new Date(patientInfo.birth_date).toLocaleDateString("pt-BR")
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

            ${laudo.indicacaoClinica.trim() ? `
              <div class="section">
                <div class="section-title">1. INDICAÇÃO CLÍNICA / QUEIXA PRINCIPAL</div>
                <div class="section-content">${laudo.indicacaoClinica}</div>
              </div>
            ` : ''}

            ${laudo.metodo.trim() ? `
              <div class="section">
                <div class="section-title">2. MÉTODO</div>
                <div class="section-content">${laudo.metodo}</div>
              </div>
            ` : ''}

            ${laudo.achados.trim() ? `
              <div class="section">
                <div class="section-title">3. ACHADOS</div>
                <div class="section-content">${laudo.achados}</div>
              </div>
            ` : ''}

            ${laudo.conclusao.trim() ? `
              <div class="section">
                <div class="section-title">4. CONCLUSÃO / IMPRESSÃO DIAGNÓSTICA</div>
                <div class="section-content">${laudo.conclusao}</div>
              </div>
            ` : ''}

            ${laudo.observacoes.trim() ? `
              <div class="section">
                <div class="section-title">5. OBSERVAÇÕES</div>
                <div class="section-content">${laudo.observacoes}</div>
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
        results: generateLaudoText() || null,
        file_url: fileUrl,
        file_name: attachedFile?.name || null,
      });

      if (error) throw error;

      toast({
        title: "Exame adicionado com sucesso! ✅",
        description: `${examName} foi registrado para ${patientName}`,
      });

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
              className={`w-full px-4 py-2 rounded-lg border transition-all outline-none ${
                examName 
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

            {/* Botão de Ditado Inteligente Central */}
            <div className={`p-4 rounded-xl border-2 transition-all ${
              isListening 
                ? "bg-red-50 border-red-300" 
                : "bg-purple-50 border-purple-200 hover:border-purple-300"
            }`}>
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={toggleSmartVoiceRecording}
                  className={`p-4 rounded-full transition-all shadow-lg ${
                    isListening
                      ? "bg-red-500 text-white animate-pulse scale-110"
                      : "bg-purple-600 text-white hover:bg-purple-700 hover:scale-105"
                  }`}
                >
                  {isListening ? (
                    <MicOff className="w-8 h-8" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </button>
                <div className="flex-1">
                  <p className={`font-medium ${isListening ? "text-red-700" : "text-purple-700"}`}>
                    {isListening ? "🔴 Gravando... Clique para parar" : "🎤 Ditado Inteligente"}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {isListening 
                      ? "Diga o nome da seção seguido do conteúdo" 
                      : "Diga: \"Exame: ultrassom\", \"Indicação: dor...\", \"Achados: normal...\", \"Conclusão: ...\""}
                  </p>
                </div>
              </div>

              {/* Preview do que está sendo ditado */}
              {isListening && (
                <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                    <span className="text-xs font-medium text-gray-600">
                      {currentField 
                        ? `Detectado: ${
                            currentField === "indicacaoClinica" ? "Indicação Clínica" :
                            currentField === "metodo" ? "Método" :
                            currentField === "achados" ? "Achados" :
                            currentField === "conclusao" ? "Conclusão" :
                            "Observações"
                          }`
                        : isExamTypeText(transcriptPreview)
                          ? "Detectado: Tipo de Exame"
                          : "Aguardando identificação..."}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 italic">
                    {transcriptPreview || "..."}
                  </p>
                </div>
              )}
            </div>

            {/* Campos do Laudo */}
            <div className="grid gap-3">
              {/* 1. Indicação Clínica */}
              <div className={`p-3 rounded-lg border transition-all ${
                currentField === "indicacaoClinica" ? "border-purple-400 bg-purple-50" : "border-gray-200"
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">
                    1. Indicação Clínica / Queixa Principal
                  </label>
                  {laudo.indicacaoClinica && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => applyCorrection("indicacaoClinica")}
                        className="text-xs text-purple-600 hover:text-purple-800 px-2 py-0.5 rounded hover:bg-purple-100"
                      >
                        Corrigir
                      </button>
                      <button
                        type="button"
                        onClick={() => clearField("indicacaoClinica")}
                        className="text-xs text-red-500 hover:text-red-700 px-2 py-0.5 rounded hover:bg-red-50"
                      >
                        Limpar
                      </button>
                    </div>
                  )}
                </div>
                <textarea
                  value={laudo.indicacaoClinica}
                  onChange={(e) => handleLaudoChange("indicacaoClinica", e.target.value)}
                  placeholder='Diga: "Indicação: paciente apresenta dor..."'
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none resize-none text-sm"
                />
              </div>

              {/* 2. Método */}
              <div className={`p-3 rounded-lg border transition-all ${
                currentField === "metodo" ? "border-purple-400 bg-purple-50" : "border-gray-200"
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">
                    2. Método
                  </label>
                  {laudo.metodo && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => applyCorrection("metodo")}
                        className="text-xs text-purple-600 hover:text-purple-800 px-2 py-0.5 rounded hover:bg-purple-100"
                      >
                        Corrigir
                      </button>
                      <button
                        type="button"
                        onClick={() => clearField("metodo")}
                        className="text-xs text-red-500 hover:text-red-700 px-2 py-0.5 rounded hover:bg-red-50"
                      >
                        Limpar
                      </button>
                    </div>
                  )}
                </div>
                <textarea
                  value={laudo.metodo}
                  onChange={(e) => handleLaudoChange("metodo", e.target.value)}
                  placeholder='Diga: "Método: ultrassonografia abdominal..."'
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none resize-none text-sm"
                />
              </div>

              {/* 3. Achados */}
              <div className={`p-3 rounded-lg border transition-all ${
                currentField === "achados" ? "border-purple-400 bg-purple-50" : "border-gray-200"
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">
                    3. Achados
                  </label>
                  {laudo.achados && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => applyCorrection("achados")}
                        className="text-xs text-purple-600 hover:text-purple-800 px-2 py-0.5 rounded hover:bg-purple-100"
                      >
                        Corrigir
                      </button>
                      <button
                        type="button"
                        onClick={() => clearField("achados")}
                        className="text-xs text-red-500 hover:text-red-700 px-2 py-0.5 rounded hover:bg-red-50"
                      >
                        Limpar
                      </button>
                    </div>
                  )}
                </div>
                <textarea
                  value={laudo.achados}
                  onChange={(e) => handleLaudoChange("achados", e.target.value)}
                  placeholder='Diga: "Achados: fígado de dimensões normais..."'
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none resize-none text-sm"
                />
              </div>

              {/* 4. Conclusão */}
              <div className={`p-3 rounded-lg border transition-all ${
                currentField === "conclusao" ? "border-purple-400 bg-purple-50" : "border-gray-200"
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">
                    4. Conclusão / Impressão Diagnóstica
                  </label>
                  {laudo.conclusao && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => applyCorrection("conclusao")}
                        className="text-xs text-purple-600 hover:text-purple-800 px-2 py-0.5 rounded hover:bg-purple-100"
                      >
                        Corrigir
                      </button>
                      <button
                        type="button"
                        onClick={() => clearField("conclusao")}
                        className="text-xs text-red-500 hover:text-red-700 px-2 py-0.5 rounded hover:bg-red-50"
                      >
                        Limpar
                      </button>
                    </div>
                  )}
                </div>
                <textarea
                  value={laudo.conclusao}
                  onChange={(e) => handleLaudoChange("conclusao", e.target.value)}
                  placeholder='Diga: "Conclusão: exame sem alterações significativas..."'
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none resize-none text-sm"
                />
              </div>

              {/* 5. Observações */}
              <div className={`p-3 rounded-lg border transition-all ${
                currentField === "observacoes" ? "border-purple-400 bg-purple-50" : "border-gray-200"
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">
                    5. Observações <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  {laudo.observacoes && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => applyCorrection("observacoes")}
                        className="text-xs text-purple-600 hover:text-purple-800 px-2 py-0.5 rounded hover:bg-purple-100"
                      >
                        Corrigir
                      </button>
                      <button
                        type="button"
                        onClick={() => clearField("observacoes")}
                        className="text-xs text-red-500 hover:text-red-700 px-2 py-0.5 rounded hover:bg-red-50"
                      >
                        Limpar
                      </button>
                    </div>
                  )}
                </div>
                <textarea
                  value={laudo.observacoes}
                  onChange={(e) => handleLaudoChange("observacoes", e.target.value)}
                  placeholder='Diga: "Observações: retorno em 30 dias..."'
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none resize-none text-sm"
                />
              </div>
            </div>

            <div className="text-xs text-gray-500 pt-2 border-t border-gray-200 space-y-1">
              <p>🎤 <strong>Como usar:</strong> Clique no microfone e diga o nome da seção seguido de dois pontos e o conteúdo.</p>
              <p>📝 <strong>Exemplos:</strong></p>
              <ul className="ml-4 space-y-0.5">
                <li>• <strong>"Exame: ultrassonografia abdominal"</strong> → preenche o tipo de exame</li>
                <li>• <strong>"Indicação: dor abdominal há 3 dias"</strong> → preenche indicação clínica</li>
                <li>• <strong>"Achados: fígado de dimensões normais"</strong> → preenche achados</li>
                <li>• <strong>"Conclusão: exame sem alterações"</strong> → preenche conclusão</li>
              </ul>
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
    </div>
  );
};

export default AddExamModal;
