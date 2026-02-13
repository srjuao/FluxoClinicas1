import { useState, useMemo } from "react";
import { Search, Loader2, MessageSquare, MessageSquarePlus } from "lucide-react";
import type { WhatsAppChat } from "@/types/whatsapp.types";
import { ChatListItem } from "./ChatListItem";
import { sortChatsByTime } from "@/lib/whatsappUtils";

interface ChatListProps {
  chats: WhatsAppChat[];
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onRefresh?: () => void;
  onNewChat?: () => void;
  loading?: boolean;
}

export function ChatList({
  chats,
  selectedChatId,
  onSelectChat,
  onNewChat,
  loading = false,
}: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) {
      return sortChatsByTime(chats);
    }

    const query = searchQuery.toLowerCase();
    const filtered = chats.filter((chat) => {
      const name = chat.name?.toLowerCase() || "";
      const phone = chat.phone.toLowerCase();
      return name.includes(query) || phone.includes(query);
    });

    return sortChatsByTime(filtered);
  }, [chats, searchQuery]);

  if (loading && chats.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Conversas</h2>
          {onNewChat && (
            <button
              onClick={onNewChat}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
              title="Nova conversa"
            >
              <MessageSquarePlus className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-6">
            <MessageSquare className="w-12 h-12 mb-3 text-gray-400" />
            <p className="text-center">
              {searchQuery
                ? "Nenhuma conversa encontrada"
                : "Nenhuma conversa ainda"}
            </p>
            {!searchQuery && (
              <p className="text-sm text-center mt-2">
                Envie uma mensagem para começar
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredChats.map((chat) => (
              <ChatListItem
                key={chat.jid}
                chat={chat}
                isSelected={selectedChatId === chat.jid}
                onClick={() => onSelectChat(chat.jid)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
