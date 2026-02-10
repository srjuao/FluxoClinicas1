import { useEffect, useRef } from "react";
import type { WhatsAppMessage } from "@/types/whatsapp.types";
import { whatsappClient } from "@/lib/whatsappClient";
import { supabase } from "@/lib/customSupabaseClient";

interface UseWhatsAppRealtimeOptions {
  chatId: string | null;
  onNewMessage: (message: WhatsAppMessage) => void;
  enabled?: boolean;
  pollingInterval?: number;
}

export function useWhatsAppRealtime({
  chatId,
  onNewMessage,
  enabled = true,
  pollingInterval = 5000,
}: UseWhatsAppRealtimeOptions) {
  const onNewMessageRef = useRef(onNewMessage);
  onNewMessageRef.current = onNewMessage;
  const knownIdsRef = useRef<Set<string>>(new Set());

  // Reset known IDs when chat changes
  useEffect(() => {
    knownIdsRef.current = new Set();
  }, [chatId]);

  // Supabase Realtime subscription (instant if enabled on table)
  useEffect(() => {
    if (!enabled || !chatId) return;

    const channel = supabase
      .channel(`whatsapp-messages-${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_messages",
          filter: `remote_jid=eq.${chatId}`,
        },
        (payload) => {
          const row = payload.new as WhatsAppMessage;
          if (!knownIdsRef.current.has(row.message_id)) {
            knownIdsRef.current.add(row.message_id);
            onNewMessageRef.current(row);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, enabled]);

  // Polling fallback (in case Supabase Realtime is not enabled on the table)
  useEffect(() => {
    if (!enabled || !chatId) return;

    const poll = async () => {
      try {
        const response = await whatsappClient.getMessages(chatId, 10, 0);
        for (const msg of response.messages) {
          if (!knownIdsRef.current.has(msg.message_id)) {
            knownIdsRef.current.add(msg.message_id);
            onNewMessageRef.current(msg);
          }
        }
      } catch {
        // Ignore poll errors silently
      }
    };

    // Initial baseline — populate known IDs without dispatching
    whatsappClient.getMessages(chatId, 50, 0).then((response) => {
      for (const msg of response.messages) {
        knownIdsRef.current.add(msg.message_id);
      }
    }).catch(() => {});

    const interval = setInterval(poll, pollingInterval);
    return () => clearInterval(interval);
  }, [chatId, enabled, pollingInterval]);
}
