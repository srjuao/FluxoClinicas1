import { useState } from "react";
import { Check, CheckCheck, Clock, Download, FileText, MapPin, User } from "lucide-react";
import type { WhatsAppMessage } from "@/types/whatsapp.types";
import { formatMessageTime, getMediaUrl, formatFileSize } from "@/lib/whatsappUtils";

interface MessageBubbleProps {
  message: WhatsAppMessage;
  onMediaClick?: (url: string, type: string) => void;
}

export function MessageBubble({ message, onMediaClick }: MessageBubbleProps) {
  const [imageError, setImageError] = useState(false);
  const isFromMe = message.from_me;
  const mediaUrl = getMediaUrl(message);

  const renderStatusIcon = () => {
    if (!isFromMe) return null;

    switch (message.status) {
      case "sent":
        return <Check className="w-4 h-4 text-gray-400" />;
      case "delivered":
        return <CheckCheck className="w-4 h-4 text-gray-400" />;
      case "read":
        return <CheckCheck className="w-4 h-4 text-blue-500" />;
      case "failed":
        return <Clock className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const renderTextMessage = () => (
    <div className="whitespace-pre-wrap break-words">
      {message.content.text}
    </div>
  );

  const renderImageMessage = () => {
    if (!mediaUrl || imageError) {
      return (
        <div className="flex items-center gap-2 text-gray-500">
          <FileText className="w-5 h-5" />
          <span>Imagem não disponível</span>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <img
          src={mediaUrl}
          alt="Imagem"
          className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => onMediaClick?.(mediaUrl, "image")}
          onError={() => setImageError(true)}
        />
        {message.content.caption && (
          <div className="text-sm">{message.content.caption}</div>
        )}
      </div>
    );
  };

  const renderVideoMessage = () => {
    if (!mediaUrl) {
      return (
        <div className="flex items-center gap-2 text-gray-500">
          <FileText className="w-5 h-5" />
          <span>Vídeo não disponível</span>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <video
          src={mediaUrl}
          controls
          className="max-w-xs rounded-lg"
          onClick={() => onMediaClick?.(mediaUrl, "video")}
        >
          Seu navegador não suporta vídeos.
        </video>
        {message.content.caption && (
          <div className="text-sm">{message.content.caption}</div>
        )}
      </div>
    );
  };

  const renderAudioMessage = () => {
    if (!mediaUrl) {
      return (
        <div className="flex items-center gap-2 text-gray-500">
          <FileText className="w-5 h-5" />
          <span>Áudio não disponível</span>
        </div>
      );
    }

    return (
      <div className="w-64">
        <audio src={mediaUrl} controls className="w-full">
          Seu navegador não suporta áudio.
        </audio>
      </div>
    );
  };

  const renderDocumentMessage = () => {
    const filename = message.content.filename || "documento";
    
    return (
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg max-w-xs">
        <FileText className="w-8 h-8 text-gray-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{filename}</div>
          <div className="text-xs text-gray-500">Documento</div>
        </div>
        {mediaUrl && (
          <a
            href={mediaUrl}
            download={filename}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0"
          >
            <Download className="w-5 h-5 text-gray-600 hover:text-gray-900" />
          </a>
        )}
      </div>
    );
  };

  const renderLocationMessage = () => {
    const { latitude, longitude, name, address } = message.content;
    
    return (
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <MapPin className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            {name && <div className="font-medium">{name}</div>}
            {address && <div className="text-sm text-gray-600">{address}</div>}
            {latitude && longitude && (
              <a
                href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                Ver no mapa
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderContactMessage = () => {
    const { name, phone } = message.content;
    
    return (
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <User className="w-8 h-8 text-gray-600" />
        <div>
          {name && <div className="font-medium">{name}</div>}
          {phone && <div className="text-sm text-gray-600">{phone}</div>}
        </div>
      </div>
    );
  };

  const renderMessageContent = () => {
    switch (message.message_type) {
      case "text":
        return renderTextMessage();
      case "image":
        return renderImageMessage();
      case "video":
        return renderVideoMessage();
      case "audio":
        return renderAudioMessage();
      case "document":
        return renderDocumentMessage();
      case "location":
        return renderLocationMessage();
      case "contact":
        return renderContactMessage();
      case "sticker":
        return (
          <div className="text-sm text-gray-500 italic">
            Figurinha não suportada
          </div>
        );
      default:
        return (
          <div className="text-sm text-gray-500 italic">
            Tipo de mensagem não suportado
          </div>
        );
    }
  };

  return (
    <div className={`flex ${isFromMe ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={`max-w-[70%] rounded-lg px-3 py-2 ${
          isFromMe
            ? "bg-green-100 text-gray-900"
            : "bg-white text-gray-900 border border-gray-200"
        }`}
      >
        {renderMessageContent()}
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-xs text-gray-500">
            {formatMessageTime(message.timestamp)}
          </span>
          {renderStatusIcon()}
        </div>
      </div>
    </div>
  );
}
