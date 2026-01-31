import { supabase } from "./customSupabaseClient";

const WHATSAPP_API_URL = import.meta.env.VITE_WHATSAPP_API_URL || "http://localhost:9000";

interface WhatsAppStatus {
  status: "connected" | "disconnected" | "connecting" | "qr_pending";
  qr?: string;
  phone?: string;
  canReconnect?: boolean;
}

interface SendMessagePayload {
  to: string;
  text: string;
}

interface ApiResponse<T = unknown> {
  success?: boolean;
  error?: string;
  data?: T;
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
  async connect(): Promise<WhatsAppStatus> {
    return apiRequest<WhatsAppStatus>("/api/instance/connect", {
      method: "POST",
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

  async sendTextMessage(payload: SendMessagePayload): Promise<ApiResponse> {
    return apiRequest<ApiResponse>("/api/messages/text", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

export type { WhatsAppStatus, SendMessagePayload };
