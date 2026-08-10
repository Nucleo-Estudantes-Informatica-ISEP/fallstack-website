import "client-only";

import { matchesDeclaredType } from "@/lib/fileSignature";
import { httpClient, HttpClientError } from "@/lib/http/client";
import { createClient } from "@/utils/supabase/client";

type StorageBucket = "avatars" | "cvs";

interface UploadTicket {
  id: string;
  path: string;
  token: string;
}

async function isValidFile(file: Blob): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  return matchesDeclaredType(bytes, file.type);
}

async function uploadToStorage(
  file: Blob,
  endpoint: "/storage/avatar" | "/storage/cv",
  bucket: StorageBucket
): Promise<UploadTicket | null> {
  if (!(await isValidFile(file))) return null;

  try {
    const ticket = await httpClient.post<UploadTicket>(endpoint, {
      contentType: file.type,
      size: file.size,
    });
    const { error } = await createClient()
      .storage.from(bucket)
      .uploadToSignedUrl(ticket.path, ticket.token, file, {
        contentType: file.type,
      });
    if (error) return null;
    return ticket;
  } catch (error) {
    if (error instanceof HttpClientError) return null;
    throw error;
  }
}

export async function uploadAvatar(image: Blob) {
  const ticket = await uploadToStorage(image, "/storage/avatar", "avatars");
  if (!ticket) return null;
  const {
    data: { publicUrl },
  } = createClient().storage.from("avatars").getPublicUrl(ticket.path);
  return { id: ticket.id, url: publicUrl };
}

export async function uploadCv(file: File) {
  const ticket = await uploadToStorage(file, "/storage/cv", "cvs");
  if (!ticket) return null;
  return { id: ticket.id };
}
