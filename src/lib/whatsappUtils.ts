import type { WhatsAppMessage, WhatsAppChat } from "@/types/whatsapp.types";

/**
 * Format phone number to WhatsApp JID format
 */
export function formatPhoneToJid(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  
  if (phone.includes("@")) {
    return phone;
  }
  
  // Add Brazil country code if not present
  let formattedPhone = cleaned;
  if (cleaned.length === 11 || cleaned.length === 10) {
    formattedPhone = "55" + cleaned;
  }
  
  return `${formattedPhone}@s.whatsapp.net`;
}

/**
 * Extract phone number from WhatsApp JID
 */
export function extractPhoneFromJid(jid: string): string {
  return jid.split("@")[0];
}

/**
 * Format phone number for display (BR format)
 */
export function formatPhoneDisplay(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  
  // Remove country code if present
  let localPhone = cleaned;
  if (cleaned.startsWith("55") && cleaned.length > 11) {
    localPhone = cleaned.substring(2);
  }
  
  if (localPhone.length === 11) {
    return `(${localPhone.slice(0, 2)}) ${localPhone.slice(2, 7)}-${localPhone.slice(7)}`;
  } else if (localPhone.length === 10) {
    return `(${localPhone.slice(0, 2)}) ${localPhone.slice(2, 6)}-${localPhone.slice(6)}`;
  }
  
  return phone;
}

/**
 * Format timestamp for message display
 */
export function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
  
  // Today: show time only
  if (diffInHours < 24 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  
  // Yesterday
  if (diffInDays < 2 && date.getDate() === now.getDate() - 1) {
    return "Ontem";
  }
  
  // This week: show day name
  if (diffInDays < 7) {
    return date.toLocaleDateString("pt-BR", { weekday: "long" });
  }
  
  // Older: show date
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

/**
 * Format full date for message separators
 */
export function formatDateSeparator(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
  
  // Today
  if (diffInDays < 1 && date.getDate() === now.getDate()) {
    return "Hoje";
  }
  
  // Yesterday
  if (diffInDays < 2 && date.getDate() === now.getDate() - 1) {
    return "Ontem";
  }
  
  // This year: show day and month
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
    });
  }
  
  // Other years: show full date
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * Get contact display name (name or formatted phone)
 */
export function getContactDisplayName(chat: WhatsAppChat): string {
  if (chat.name) {
    return chat.name;
  }
  return formatPhoneDisplay(chat.phone);
}

/**
 * Group messages by date for display
 */
export function groupMessagesByDate(
  messages: WhatsAppMessage[]
): Map<string, WhatsAppMessage[]> {
  const grouped = new Map<string, WhatsAppMessage[]>();
  
  messages.forEach((message) => {
    const dateKey = new Date(message.timestamp).toDateString();
    const existing = grouped.get(dateKey) || [];
    grouped.set(dateKey, [...existing, message]);
  });
  
  return grouped;
}

/**
 * Check if message contains media
 */
export function isMediaMessage(message: WhatsAppMessage): boolean {
  return ["image", "video", "audio", "document", "sticker"].includes(
    message.message_type
  );
}

/**
 * Get media URL from message content
 */
export function getMediaUrl(message: WhatsAppMessage): string | null {
  if (!isMediaMessage(message)) {
    return null;
  }
  return message.content.url || null;
}

/**
 * Get message preview text for chat list
 */
export function getMessagePreview(message: WhatsAppMessage): string {
  const type = message.message_type as string;
  const raw = message.content as Record<string, any>;

  switch (type) {
    case "text":
      return raw?.text || "";
    case "image":
      return "📷 Imagem";
    case "video":
      return "🎥 Vídeo";
    case "audio":
      return "🎤 Áudio";
    case "document":
      return `📎 ${raw?.filename || raw?.fileName || "Documento"}`;
    case "sticker":
      return "🎨 Figurinha";
    case "location":
      return "📍 Localização";
    case "contact":
      return "👤 Contato";
    // Legacy Baileys raw types
    case "conversation":
      return raw?.conversation || raw?.text || "";
    case "extendedTextMessage":
      return raw?.extendedTextMessage?.text || raw?.text || "";
    case "imageMessage":
      return "📷 Imagem";
    case "videoMessage":
      return "🎥 Vídeo";
    case "audioMessage":
      return "🎤 Áudio";
    case "documentMessage":
      return `📎 ${raw?.documentMessage?.fileName || "Documento"}`;
    case "stickerMessage":
      return "🎨 Figurinha";
    case "locationMessage":
      return "📍 Localização";
    case "contactMessage":
    case "contactsArrayMessage":
      return "👤 Contato";
    default:
      return "Mensagem";
  }
}

/**
 * Truncate text for preview
 */
export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + "...";
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

/**
 * Check if JID is a group
 */
export function isGroupJid(jid: string): boolean {
  return jid.includes("@g.us");
}

/**
 * Sort chats by last message time
 */
export function sortChatsByTime(chats: WhatsAppChat[]): WhatsAppChat[] {
  return [...chats].sort((a, b) => {
    const timeA = a.last_message_time
      ? new Date(a.last_message_time).getTime()
      : 0;
    const timeB = b.last_message_time
      ? new Date(b.last_message_time).getTime()
      : 0;
    return timeB - timeA;
  });
}
