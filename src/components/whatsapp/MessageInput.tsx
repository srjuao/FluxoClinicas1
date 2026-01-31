import { useState, useRef, KeyboardEvent } from "react";
import { Send, Paperclip, Image, Video, Mic, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MessageInputProps {
  onSendText: (text: string) => Promise<void>;
  onSendMedia: (file: File, type: string, caption?: string) => Promise<void>;
  disabled?: boolean;
}

export function MessageInput({
  onSendText,
  onSendMedia,
  disabled = false,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<string>("");

  const handleSendText = async () => {
    if (!message.trim() || sending) return;

    setSending(true);
    try {
      await onSendText(message.trim());
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const handleAttachClick = (type: string) => {
    setSelectedMediaType(type);
    setShowAttachMenu(false);
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSending(true);
    try {
      await onSendMedia(file, selectedMediaType);
    } catch (error) {
      console.error("Error sending media:", error);
    } finally {
      setSending(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const getAcceptTypes = () => {
    switch (selectedMediaType) {
      case "image":
        return "image/jpeg,image/png,image/gif,image/webp";
      case "video":
        return "video/mp4,video/quicktime,video/webm";
      case "audio":
        return "audio/mpeg,audio/ogg,audio/mp4,audio/wav";
      case "document":
        return ".pdf,.doc,.docx,.xls,.xlsx,.txt";
      default:
        return "";
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white p-3">
      <div className="flex items-end gap-2">
        {/* Attachment Button */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            disabled={disabled || sending}
            className="flex-shrink-0"
          >
            <Paperclip className="w-5 h-5" />
          </Button>

          {/* Attachment Menu */}
          {showAttachMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowAttachMenu(false)}
              />
              <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-20 min-w-[160px]">
                <button
                  onClick={() => handleAttachClick("image")}
                  className="flex items-center gap-3 w-full px-3 py-2 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <Image className="w-5 h-5 text-blue-500" />
                  <span className="text-sm">Imagem</span>
                </button>
                <button
                  onClick={() => handleAttachClick("video")}
                  className="flex items-center gap-3 w-full px-3 py-2 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <Video className="w-5 h-5 text-purple-500" />
                  <span className="text-sm">Vídeo</span>
                </button>
                <button
                  onClick={() => handleAttachClick("audio")}
                  className="flex items-center gap-3 w-full px-3 py-2 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <Mic className="w-5 h-5 text-red-500" />
                  <span className="text-sm">Áudio</span>
                </button>
                <button
                  onClick={() => handleAttachClick("document")}
                  className="flex items-center gap-3 w-full px-3 py-2 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <FileText className="w-5 h-5 text-gray-500" />
                  <span className="text-sm">Documento</span>
                </button>
              </div>
            </>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={getAcceptTypes()}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleTextareaChange}
          onKeyPress={handleKeyPress}
          placeholder="Digite uma mensagem..."
          disabled={disabled || sending}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          style={{ maxHeight: "120px" }}
        />

        {/* Send Button */}
        <Button
          onClick={handleSendText}
          disabled={!message.trim() || disabled || sending}
          className="bg-green-500 hover:bg-green-600 text-white flex-shrink-0"
          size="icon"
        >
          {sending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
