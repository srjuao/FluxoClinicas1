export interface WhatsAppMessage {
  id: string;
  clinic_id: string;
  message_id: string;
  remote_jid: string;
  from_me: boolean;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'location' | 'contact';
  content: {
    text?: string;
    caption?: string;
    url?: string;
    mimetype?: string;
    filename?: string;
    latitude?: number;
    longitude?: number;
    name?: string;
    address?: string;
    phone?: string;
  };
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  created_at: string;
}

export interface WhatsAppChat {
  jid: string;
  name?: string;
  phone: string;
  profile_picture?: string;
  last_message?: WhatsAppMessage;
  unread_count?: number;
  pinned?: boolean;
  archived?: boolean;
  muted?: boolean;
  last_message_time?: string;
}

export interface WhatsAppContact {
  jid: string;
  name?: string;
  phone: string;
  profile_picture?: string;
  status?: string;
  exists: boolean;
}

export interface SendMediaPayload {
  to: string;
  url?: string;
  base64?: string;
  caption?: string;
  mimetype?: string;
  filename?: string;
}

export interface ChatListResponse {
  chats: Array<{
    jid: string;
    last_message?: {
      message_type: string;
      content: Record<string, unknown>;
      timestamp: string;
      from_me: boolean;
    };
    incoming_count?: number;
  }>;
}

export interface MessagesResponse {
  messages: WhatsAppMessage[];
}

export interface ContactInfoResponse {
  exists: boolean;
  jid: string;
}

export interface ProfilePictureResponse {
  profile_picture_url: string | null;
}

export interface ApiResponse<T = unknown> {
  success?: boolean;
  error?: string;
  data?: T;
  message_id?: string;
}
