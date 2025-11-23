// @ts-nocheck
import React, { useState, FormEvent, useRef } from "react";
import { motion } from "framer-motion";
import { X, FileText, Upload, Paperclip, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";

interface AddExamModalProps {
  patientId: string;
  patientName: string;
  doctorId: string;
  clinicId: string;
  onClose: () => void;
  onSuccess: () => void;
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
  const [results, setResults] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        results: results || null,
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
              Nome do Exame <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              placeholder="Ex: Hemograma Completo, Raio-X de Tórax..."
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none"
              required
            />
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

          {/* Results */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resultados
            </label>
            <textarea
              value={results}
              onChange={(e) => setResults(e.target.value)}
              placeholder="Cole aqui os resultados do exame ou observações clínicas..."
              rows={6}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none resize-none font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 Dica: Você pode colar resultados de exames laboratoriais
              diretamente aqui
            </p>
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
