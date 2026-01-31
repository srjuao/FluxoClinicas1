import { User, Archive, Bell, BellOff, Trash2, X } from "lucide-react";
import type { WhatsAppChat } from "@/types/whatsapp.types";
import { getContactDisplayName, formatPhoneDisplay } from "@/lib/whatsappUtils";
import { Button } from "@/components/ui/button";

interface ContactInfoProps {
  chat: WhatsAppChat | null;
  onArchive: () => void;
  onMute: () => void;
  onDelete: () => void;
  onClose?: () => void;
}

export function ContactInfo({
  chat,
  onArchive,
  onMute,
  onDelete,
  onClose,
}: ContactInfoProps) {
  if (!chat) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 flex items-center justify-center text-gray-500">
        <p>Selecione uma conversa</p>
      </div>
    );
  }

  const displayName = getContactDisplayName(chat);
  const formattedPhone = formatPhoneDisplay(chat.phone);

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Informações do Contato</h3>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Profile Section */}
      <div className="p-6 border-b border-gray-200 flex flex-col items-center">
        {chat.profile_picture ? (
          <img
            src={chat.profile_picture}
            alt={displayName}
            className="w-24 h-24 rounded-full object-cover mb-4"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center mb-4">
            <User className="w-12 h-12 text-gray-600" />
          </div>
        )}
        <h2 className="text-xl font-semibold text-gray-900 text-center">
          {displayName}
        </h2>
        <p className="text-sm text-gray-600 mt-1">{formattedPhone}</p>
      </div>

      {/* Actions */}
      <div className="p-4 space-y-2">
        <button
          onClick={onArchive}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
        >
          <Archive className="w-5 h-5 text-gray-600" />
          <div>
            <div className="font-medium text-gray-900">
              {chat.archived ? "Desarquivar" : "Arquivar"} conversa
            </div>
            <div className="text-xs text-gray-500">
              {chat.archived
                ? "Restaurar para lista principal"
                : "Ocultar da lista principal"}
            </div>
          </div>
        </button>

        <button
          onClick={onMute}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
        >
          {chat.muted ? (
            <Bell className="w-5 h-5 text-gray-600" />
          ) : (
            <BellOff className="w-5 h-5 text-gray-600" />
          )}
          <div>
            <div className="font-medium text-gray-900">
              {chat.muted ? "Ativar" : "Silenciar"} notificações
            </div>
            <div className="text-xs text-gray-500">
              {chat.muted
                ? "Receber notificações novamente"
                : "Parar de receber notificações"}
            </div>
          </div>
        </button>

        <button
          onClick={onDelete}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 rounded-lg transition-colors text-left"
        >
          <Trash2 className="w-5 h-5 text-red-600" />
          <div>
            <div className="font-medium text-red-600">Excluir conversa</div>
            <div className="text-xs text-red-500">
              Remover todas as mensagens
            </div>
          </div>
        </button>
      </div>

      {/* Additional Info */}
      <div className="p-4 border-t border-gray-200 mt-auto">
        <div className="text-xs text-gray-500 space-y-1">
          {chat.pinned && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>Conversa fixada</span>
            </div>
          )}
          {chat.archived && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
              <span>Conversa arquivada</span>
            </div>
          )}
          {chat.muted && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              <span>Notificações silenciadas</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
