import { useState, useCallback, useRef } from "react";
import type { WhatsAppChat } from "@/types/whatsapp.types";
import { whatsappClient } from "@/lib/whatsappClient";
import { extractPhoneFromJid } from "@/lib/whatsappUtils";
import { toast } from "@/components/ui/use-toast";

export function useWhatsAppChats() {
  const [chats, setChats] = useState<WhatsAppChat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedPicsRef = useRef<Set<string>>(new Set());
  // Track the incoming_count at the time the user last "read" each chat
  const seenCountsRef = useRef<Map<string, number>>(new Map());
  // Track the latest incoming_count from the backend per chat
  const incomingCountsRef = useRef<Map<string, number>>(new Map());

  const loadChats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await whatsappClient.getChats();

      // Transform API response to WhatsAppChat format
      const transformedChats: WhatsAppChat[] = response.chats.map((chat) => {
        const phone = extractPhoneFromJid(chat.jid);
        const lastMsg = chat.last_message;
        const incomingCount = chat.incoming_count || 0;
        incomingCountsRef.current.set(chat.jid, incomingCount);

        // Compute unread: total incoming - seen at last read
        const seenCount = seenCountsRef.current.get(chat.jid) ?? 0;
        const unread = Math.max(0, incomingCount - seenCount);

        return {
          jid: chat.jid,
          phone,
          last_message: lastMsg
            ? ({
                message_type: lastMsg.message_type,
                content: lastMsg.content as any,
                timestamp: lastMsg.timestamp,
                from_me: lastMsg.from_me,
              } as any)
            : undefined,
          last_message_time: lastMsg?.timestamp,
          unread_count: unread,
          pinned: false,
          archived: false,
          muted: false,
        };
      });

      // Merge with existing state to preserve profile pictures and local state
      setChats((prev) => {
        const existingMap = new Map(prev.map((c) => [c.jid, c]));
        const merged = transformedChats.map((chat) => {
          const existing = existingMap.get(chat.jid);
          if (existing) {
            return {
              ...chat,
              profile_picture: existing.profile_picture,
              name: existing.name || chat.name,
            };
          }
          return chat;
        });
        return merged;
      });
      setLoading(false);

      // Fetch profile pictures only for chats we haven't fetched yet
      for (const chat of transformedChats) {
        if (fetchedPicsRef.current.has(chat.jid)) continue;
        fetchedPicsRef.current.add(chat.jid);

        whatsappClient.getProfilePicture(chat.phone).then((picResponse) => {
          if (picResponse.profile_picture_url) {
            setChats((prev) =>
              prev.map((c) =>
                c.jid === chat.jid
                  ? { ...c, profile_picture: picResponse.profile_picture_url || undefined }
                  : c
              )
            );
          }
        }).catch(() => {
          // Profile picture not available — ignore
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao carregar conversas";
      setError(errorMessage);
      toast({
        title: "Erro ao carregar conversas",
        description: errorMessage,
        variant: "destructive",
      });
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

  const incrementUnread = useCallback((jid: string) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.jid === jid
          ? { ...chat, unread_count: (chat.unread_count || 0) + 1 }
          : chat
      )
    );
  }, []);

  const resetUnread = useCallback((jid: string) => {
    // Snapshot current incoming count so future polls show 0 unread
    const currentCount = incomingCountsRef.current.get(jid) ?? 0;
    seenCountsRef.current.set(jid, currentCount);
    setChats((prev) =>
      prev.map((chat) =>
        chat.jid === jid ? { ...chat, unread_count: 0 } : chat
      )
    );
  }, []);

  return {
    chats,
    loading,
    error,
    loadChats,
    refreshChats,
    updateChatInList,
    addOrUpdateChat,
    incrementUnread,
    resetUnread,
  };
}
