import { supabase } from "./customSupabaseClient";

export interface UploadResult {
  url: string;
  path: string;
}

// Validation constants
export const ALLOWED_IMAGES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
export const ALLOWED_VIDEOS = ["video/mp4", "video/quicktime", "video/webm"];
export const ALLOWED_AUDIO = ["audio/mpeg", "audio/ogg", "audio/mp4", "audio/wav"];
export const ALLOWED_DOCUMENTS = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

export const MAX_IMAGE_SIZE = 5; // MB
export const MAX_VIDEO_SIZE = 16; // MB
export const MAX_AUDIO_SIZE = 16; // MB
export const MAX_DOCUMENT_SIZE = 10; // MB

/**
 * Upload file to Supabase Storage
 */
export async function uploadToSupabase(
  file: File,
  bucket: string = "whatsapp-media"
): Promise<UploadResult> {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split(".").pop();
    const filename = `${timestamp}-${randomString}.${extension}`;
    const path = `uploads/${filename}`;

    // Upload file
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(`Erro ao fazer upload: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
}

/**
 * Convert file to base64 string
 */
export async function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64Data = base64.split(",")[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Validate file type
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

/**
 * Validate file size
 */
export function validateFileSize(file: File, maxSizeMB: number): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * Get allowed types for media category
 */
export function getAllowedTypes(mediaType: string): string[] {
  switch (mediaType) {
    case "image":
      return ALLOWED_IMAGES;
    case "video":
      return ALLOWED_VIDEOS;
    case "audio":
      return ALLOWED_AUDIO;
    case "document":
      return ALLOWED_DOCUMENTS;
    default:
      return [];
  }
}

/**
 * Get max size for media category
 */
export function getMaxSize(mediaType: string): number {
  switch (mediaType) {
    case "image":
      return MAX_IMAGE_SIZE;
    case "video":
      return MAX_VIDEO_SIZE;
    case "audio":
      return MAX_AUDIO_SIZE;
    case "document":
      return MAX_DOCUMENT_SIZE;
    default:
      return 5;
  }
}

/**
 * Validate media file
 */
export function validateMediaFile(
  file: File,
  mediaType: string
): { valid: boolean; error?: string } {
  const allowedTypes = getAllowedTypes(mediaType);
  const maxSize = getMaxSize(mediaType);

  if (!validateFileType(file, allowedTypes)) {
    return {
      valid: false,
      error: `Tipo de arquivo não permitido. Tipos aceitos: ${allowedTypes.join(", ")}`,
    };
  }

  if (!validateFileSize(file, maxSize)) {
    return {
      valid: false,
      error: `Arquivo muito grande. Tamanho máximo: ${maxSize}MB`,
    };
  }

  return { valid: true };
}

/**
 * Prepare media payload for API
 */
export async function prepareMediaPayload(
  file: File,
  to: string,
  caption?: string
): Promise<{
  to: string;
  base64: string;
  caption?: string;
  mimetype: string;
  filename: string;
}> {
  const base64 = await convertFileToBase64(file);
  
  return {
    to,
    base64,
    caption,
    mimetype: file.type,
    filename: file.name,
  };
}
