import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2, FileText, Music, Film, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { validateMediaFile, formatFileSize } from "@/lib/fileUpload";

interface MediaPreviewModalProps {
  file: File | null;
  mediaType: "image" | "video" | "audio" | "document";
  onSend: (caption?: string) => void;
  onCancel: () => void;
  sending?: boolean;
}

export function MediaPreviewModal({
  file,
  mediaType,
  onSend,
  onCancel,
  sending = false,
}: MediaPreviewModalProps) {
  const [caption, setCaption] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [validationError, setValidationError] = useState<string>("");

  useEffect(() => {
    if (!file) return;

    // Validate file
    const validation = validateMediaFile(file, mediaType);
    if (!validation.valid) {
      setValidationError(validation.error || "Arquivo inválido");
      return;
    }

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file, mediaType]);

  if (!file) return null;

  const handleSend = () => {
    if (validationError) return;
    onSend(caption || undefined);
  };

  const renderPreview = () => {
    if (validationError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-red-500">
          <X className="w-16 h-16 mb-4" />
          <p className="text-center">{validationError}</p>
        </div>
      );
    }

    switch (mediaType) {
      case "image":
        return (
          <img
            src={previewUrl}
            alt="Preview"
            className="max-h-96 max-w-full object-contain rounded-lg"
          />
        );
      case "video":
        return (
          <video
            src={previewUrl}
            controls
            className="max-h-96 max-w-full rounded-lg"
          >
            Seu navegador não suporta vídeos.
          </video>
        );
      case "audio":
        return (
          <div className="flex flex-col items-center gap-4 p-8">
            <Music className="w-16 h-16 text-gray-400" />
            <audio src={previewUrl} controls className="w-full max-w-md">
              Seu navegador não suporta áudio.
            </audio>
          </div>
        );
      case "document":
        return (
          <div className="flex flex-col items-center gap-4 p-8">
            <FileText className="w-16 h-16 text-gray-400" />
            <div className="text-center">
              <p className="font-medium text-lg">{file.name}</p>
              <p className="text-sm text-gray-500 mt-1">
                {formatFileSize(file.size)}
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const getMediaIcon = () => {
    switch (mediaType) {
      case "image":
        return <ImageIcon className="w-5 h-5" />;
      case "video":
        return <Film className="w-5 h-5" />;
      case "audio":
        return <Music className="w-5 h-5" />;
      case "document":
        return <FileText className="w-5 h-5" />;
    }
  };

  const getMediaLabel = () => {
    switch (mediaType) {
      case "image":
        return "Imagem";
      case "video":
        return "Vídeo";
      case "audio":
        return "Áudio";
      case "document":
        return "Documento";
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && !sending && onCancel()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <div className="flex items-center gap-2">
              {getMediaIcon()}
              <h2 className="text-lg font-semibold">Enviar {getMediaLabel()}</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              disabled={sending}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Preview */}
          <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center bg-gray-100">
            {renderPreview()}
          </div>

          {/* Caption Input */}
          {!validationError && (mediaType === "image" || mediaType === "video") && (
            <div className="p-4 border-t">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Adicionar legenda (opcional)..."
                rows={2}
                disabled={sending}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none disabled:bg-gray-100"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={sending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || !!validationError}
              className="bg-green-500 hover:bg-green-600 text-white gap-2"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
