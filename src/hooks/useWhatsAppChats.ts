import { useState, useCallback } from "react";
import type { WhatsAppChat } from "@/types/whatsapp.types";
import { whatsappClient } from "@/lib/whatsappClient";
import { extractPhoneFromJid } from "@/lib/whatsappUtils";
import { toast } from "@/components/ui/use-toast";

export function useWhatsAppChats() {
  const [chats, setChats] = useState<WhatsAppChat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await whatsappClient.getChats();
      
      // Transform API response to WhatsAppChat format
      const transformedChats: WhatsAppChat[] = await Promise.all(
        response.chats.map(async (chat) => {
          const phone = extractPhoneFromJid(chat.jid);
          
          // Try to get profile picture
          let profile_picture: string | undefined;
          try {
            const picResponse = await whatsappClient.getProfilePicture(phone);
            profile_picture = picResponse.profile_picture_url || undefined;
          } catch {
            // Profile picture not available
          }

          return {
            jid: chat.jid,
            phone,
            profile_picture,
            unread_count: 0,
            pinned: false,
            archived: false,
            muted: false,
          };
        })
      );

      setChats(transformedChats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao carregar conversas";
      setError(errorMessage);
      toast({
        title: "Erro ao carregar conversas",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshChats = useCallback(async () => {
    await loadChats();
  }, [loadChats]);

  const updateChatInList = useCallback((jid: string, updates: Partial<WhatsAppChat>) => {
    setChats((prev) =>
      prev.map((chat) => (chat.jid === jid ? { ...chat, ...updates } : chat))
    );
  }, []);

  const addOrUpdateChat = useCallback((chat: WhatsAppChat) => {
    setChats((prev) => {
      const existingIndex = prev.findIndex((c) => c.jid === chat.jid);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...chat };
        return updated;
      }
      return [chat, ...prev];
    });
  }, []);

  return {
    chats,
    loading,
    error,
    loadChats,
    refreshChats,
    updateChatInList,
    addOrUpdateChat,
  };
}
