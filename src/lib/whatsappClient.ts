import { supabase } from "./customSupabaseClient";
import type {
  SendMediaPayload,
  ChatListResponse,
  MessagesResponse,
  ContactInfoResponse,
  ProfilePictureResponse,
  ApiResponse,
} from "@/types/whatsapp.types";

const WHATSAPP_API_URL = import.meta.env.VITE_WHATSAPP_API_URL || "http://localhost:9000";

interface WhatsAppStatus {
  status: "connected" | "disconnected" | "connecting" | "qr_pending";
  qr?: string;
  phone?: string;
  has_saved_session?: boolean;
  can_reconnect?: boolean;
  connected_at?: string;
  updated_at?: string;
}

interface WhatsAppSessionInfo {
  clinic_id: string;
  phone_number: string | null;
  db_status: string;
  live_status: string;
  connected_at: string | null;
  updated_at: string | null;
  qr?: string;
}

interface SendMessagePayload {
  to: string;
  text: string;
  quoted_message_id?: string;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error("Usuário não autenticado");
  }

  return {
    "Authorization": `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${WHATSAPP_API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Erro na requisição: ${response.status}`);
  }

  return data;
}

export const whatsappClient = {
  async connect(options?: { syncFullHistory?: boolean }): Promise<WhatsAppStatus> {
    return apiRequest<WhatsAppStatus>("/api/instance/connect", {
      method: "POST",
      body: JSON.stringify(options || {}),
    });
  },

  async getStatus(): Promise<WhatsAppStatus> {
    return apiRequest<WhatsAppStatus>("/api/instance/status");
  },

  async getQR(): Promise<{ qr: string | null }> {
    return apiRequest<{ qr: string | null }>("/api/instance/qr");
  },

  async disconnect(): Promise<ApiResponse> {
    return apiRequest<ApiResponse>("/api/instance/disconnect", {
      method: "POST",
    });
  },

  async logout(): Promise<ApiResponse> {
    return apiRequest<ApiResponse>("/api/instance/logout", {
      method: "POST",
    });
  },

  async reconnect(): Promise<WhatsAppStatus> {
    return apiRequest<WhatsAppStatus>("/api/instance/reconnect", {
      method: "POST",
    });
  },

  async getSessions(): Promise<{ sessions: WhatsAppSessionInfo[] }> {
    return apiRequest<{ sessions: WhatsAppSessionInfo[] }>("/api/instance/sessions");
  },

  async sendTextMessage(payload: SendMessagePayload): Promise<ApiResponse> {
    return apiRequest<ApiResponse>("/api/messages/text", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // Chat Management
  async getChats(): Promise<ChatListResponse> {
    return apiRequest<ChatListResponse>("/api/chats");
  },

  async getChatInfo(chatId: string): Promise<{ chat: any }> {
    return apiRequest<{ chat: any }>(`/api/chats/${chatId}`);
  },

  async archiveChat(chatId: string): Promise<ApiResponse> {
    return apiRequest<ApiResponse>(`/api/chats/${chatId}/archive`, {
      method: "POST",
    });
  },

  async unarchiveChat(chatId: string): Promise<ApiResponse> {
    return apiRequest<ApiResponse>(`/api/chats/${chatId}/unarchive`, {
      method: "POST",
    });
  },

  async pinChat(chatId: string): Promise<ApiResponse> {
    return apiRequest<ApiResponse>(`/api/chats/${chatId}/pin`, {
      method: "POST",
    });
  },

  async unpinChat(chatId: string): Promise<ApiResponse> {
    return apiRequest<ApiResponse>(`/api/chats/${chatId}/unpin`, {
      method: "POST",
    });
  },

  async muteChat(chatId: string, duration?: number): Promise<ApiResponse> {
    return apiRequest<ApiResponse>(`/api/chats/${chatId}/mute`, {
      method: "POST",
      body: JSON.stringify({ duration }),
    });
  },

  async unmuteChat(chatId: string): Promise<ApiResponse> {
    return apiRequest<ApiResponse>(`/api/chats/${chatId}/unmute`, {
      method: "POST",
    });
  },

  async markAsRead(chatId: string): Promise<ApiResponse> {
    return apiRequest<ApiResponse>(`/api/chats/${chatId}/mark-read`, {
      method: "POST",
    });
  },

  async markAsUnread(chatId: string): Promise<ApiResponse> {
    return apiRequest<ApiResponse>(`/api/chats/${chatId}/mark-unread`, {
      method: "POST",
    });
  },

  async deleteChat(chatId: string): Promise<ApiResponse> {
    return apiRequest<ApiResponse>(`/api/chats/${chatId}`, {
      method: "DELETE",
    });
  },

  // Message Management
  async getMessages(
    chatId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<MessagesResponse> {
    return apiRequest<MessagesResponse>(
      `/api/messages/${chatId}?limit=${limit}&offset=${offset}`
    );
  },

  async sendImage(payload: SendMediaPayload): Promise<ApiResponse> {
    return apiRequest<ApiResponse>("/api/messages/image", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async sendVideo(payload: SendMediaPayload): Promise<ApiResponse> {
    return apiRequest<ApiResponse>("/api/messages/video", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async sendAudio(payload: SendMediaPayload): Promise<ApiResponse> {
    return apiRequest<ApiResponse>("/api/messages/audio", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async sendDocument(payload: SendMediaPayload): Promise<ApiResponse> {
    return apiRequest<ApiResponse>("/api/messages/document", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async deleteMessage(messageId: string, chatId: string): Promise<ApiResponse> {
    return apiRequest<ApiResponse>(`/api/messages/${messageId}`, {
      method: "DELETE",
      body: JSON.stringify({ chat_id: chatId }),
    });
  },

  // Contact Management
  async getContactInfo(phoneNumber: string): Promise<ContactInfoResponse> {
    return apiRequest<ContactInfoResponse>(`/api/contacts/${phoneNumber}`);
  },

  async getProfilePicture(phoneNumber: string): Promise<ProfilePictureResponse> {
    return apiRequest<ProfilePictureResponse>(
      `/api/contacts/${phoneNumber}/profile-picture`
    );
  },

  async checkExists(phones: string[]): Promise<{
    results: Array<{ phone: string; exists: boolean; jid: string }>;
  }> {
    return apiRequest<{
      results: Array<{ phone: string; exists: boolean; jid: string }>;
    }>("/api/contacts/check-exists", {
      method: "POST",
      body: JSON.stringify({ phones }),
    });
  },
};

export type { WhatsAppStatus, WhatsAppSessionInfo, SendMessagePayload };
