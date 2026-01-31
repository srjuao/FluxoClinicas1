import { useEffect, useRef } from "react";
import type { WhatsAppMessage } from "@/types/whatsapp.types";
import { whatsappClient } from "@/lib/whatsappClient";

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
  pollingInterval = 3000,
}: UseWhatsAppRealtimeOptions) {
  const lastMessageIdRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || !chatId) {
      return;
    }

    const checkForNewMessages = async () => {
      try {
        const response = await whatsappClient.getMessages(chatId, 10, 0);
        
        if (response.messages.length > 0) {
          const latestMessage = response.messages[0];
          
          // Check if this is a new message
          if (
            lastMessageIdRef.current &&
            latestMessage.message_id !== lastMessageIdRef.current
          ) {
            // Find all new messages
            const newMessages = [];
            for (const message of response.messages) {
              if (message.message_id === lastMessageIdRef.current) {
                break;
              }
              newMessages.push(message);
            }
            
            // Notify about new messages (oldest first)
            newMessages.reverse().forEach((message) => {
              onNewMessage(message);
            });
          }
          
          // Update last message ID
          lastMessageIdRef.current = latestMessage.message_id;
        }
      } catch (error) {
        console.error("Error checking for new messages:", error);
      }
    };

    // Initial check to set the baseline
    checkForNewMessages();

    // Set up polling
    intervalRef.current = setInterval(checkForNewMessages, pollingInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [chatId, enabled, pollingInterval, onNewMessage]);

  // Reset when chat changes
  useEffect(() => {
    lastMessageIdRef.current = null;
  }, [chatId]);
}
