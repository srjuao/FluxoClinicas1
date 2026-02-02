import { useState, useCallback, useEffect } from "react";
import type { WhatsAppMessage } from "@/types/whatsapp.types";
import { whatsappClient } from "@/lib/whatsappClient";
import { prepareMediaPayload } from "@/lib/fileUpload";
import { toast } from "@/components/ui/use-toast";

export function useWhatsAppMessages(chatId: string | null) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const loadMessages = useCallback(async () => {
    if (!chatId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    try {
      const response = await whatsappClient.getMessages(chatId, limit, 0);
      // Messages come from API in descending order (newest first)
      // We need to reverse them to show oldest first in the UI
      const sortedMessages = [...response.messages].reverse();
      setMessages(sortedMessages);
      setOffset(response.messages.length);
      setHasMore(response.messages.length === limit);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao carregar mensagens";
      toast({
        title: "Erro ao carregar mensagens",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  const loadMore = useCallback(async () => {
    if (!chatId || !hasMore || loading) return;

    setLoading(true);
    try {
      const response = await whatsappClient.getMessages(chatId, limit, offset);
      if (response.messages.length > 0) {
        // Reverse messages to show oldest first, then prepend to existing messages
        const olderMessages = [...response.messages].reverse();
        setMessages((prev) => [...olderMessages, ...prev]);
        setOffset((prev) => prev + response.messages.length);
        setHasMore(response.messages.length === limit);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao carregar mais mensagens";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [chatId, hasMore, loading, offset]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!chatId) return;

      try {
        await whatsappClient.sendTextMessage({
          to: chatId,
          text,
        });

        // Optimistically add message to list
        const optimisticMessage: WhatsAppMessage = {
          id: `temp-${Date.now()}`,
          clinic_id: "",
          message_id: "",
          remote_jid: chatId,
          from_me: true,
          message_type: "text",
          content: { text },
          status: "sent",
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, optimisticMessage]);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erro ao enviar mensagem";
        toast({
          title: "Erro ao enviar mensagem",
          description: errorMessage,
          variant: "destructive",
        });
        throw err;
      }
    },
    [chatId]
  );

  const sendMedia = useCallback(
    async (file: File, type: string, caption?: string) => {
      if (!chatId) return;

      try {
        const payload = await prepareMediaPayload(file, chatId, caption);

        switch (type) {
          case "image":
            await whatsappClient.sendImage(payload);
            break;
          case "video":
            await whatsappClient.sendVideo(payload);
            break;
          case "audio":
            await whatsappClient.sendAudio(payload);
            break;
          case "document":
            await whatsappClient.sendDocument(payload);
            break;
          default:
            throw new Error("Tipo de mídia não suportado");
        }

        // Reload messages to get the sent media
        await loadMessages();

        toast({
          title: "Mídia enviada",
          description: "Arquivo enviado com sucesso",
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erro ao enviar mídia";
        toast({
          title: "Erro ao enviar mídia",
          description: errorMessage,
          variant: "destructive",
        });
        throw err;
      }
    },
    [chatId, loadMessages]
  );

  const addMessage = useCallback((message: WhatsAppMessage) => {
    setMessages((prev) => {
      // Check if message already exists
      if (prev.some((m) => m.message_id === message.message_id)) {
        return prev;
      }
      return [...prev, message];
    });
  }, []);

  // Reset when chat changes
  useEffect(() => {
    setMessages([]);
    setOffset(0);
    setHasMore(true);
    if (chatId) {
      loadMessages();
    }
  }, [chatId, loadMessages]);

  return {
    messages,
    loading,
    hasMore,
    loadMessages,
    loadMore,
    sendMessage,
    sendMedia,
    addMessage,
  };
}
