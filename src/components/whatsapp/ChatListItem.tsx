import { User, Pin } from "lucide-react";
import type { WhatsAppChat } from "@/types/whatsapp.types";
import {
  getContactDisplayName,
  getMessagePreview,
  formatMessageTime,
  truncateText,
} from "@/lib/whatsappUtils";

interface ChatListItemProps {
  chat: WhatsAppChat;
  isSelected: boolean;
  onClick: () => void;
}

export function ChatListItem({ chat, isSelected, onClick }: ChatListItemProps) {
  const displayName = getContactDisplayName(chat);
  const lastMessagePreview = chat.last_message
    ? getMessagePreview(chat.last_message)
    : "Sem mensagens";
  const lastMessageTime = chat.last_message?.timestamp
    ? formatMessageTime(chat.last_message.timestamp)
    : "";

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
        isSelected ? "bg-gray-100" : ""
      }`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {chat.profile_picture ? (
          <img
            src={chat.profile_picture}
            alt={displayName}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
            <User className="w-6 h-6 text-gray-600" />
          </div>
        )}
      </div>

      {/* Chat Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 truncate">
              {displayName}
            </h3>
            {chat.pinned && (
              <Pin className="w-4 h-4 text-gray-500 flex-shrink-0" />
            )}
          </div>
          {lastMessageTime && (
            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
              {lastMessageTime}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 truncate flex-1">
            {truncateText(lastMessagePreview, 40)}
          </p>
          {chat.unread_count != null && chat.unread_count > 0 && (
            <span className="ml-2 bg-green-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
              {chat.unread_count > 99 ? "99+" : chat.unread_count}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
