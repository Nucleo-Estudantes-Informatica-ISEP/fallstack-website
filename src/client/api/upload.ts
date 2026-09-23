import "client-only";

import { matchesDeclaredType } from "@/lib/fileSignature";
import { httpClient, HttpClientError } from "@/lib/http/client";

async function upload<T>(
  file: Blob,
  endpoint: "/storage/avatar" | "/storage/cv"
) {
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (!matchesDeclaredType(bytes, file.type)) return null;
  const form = new FormData();
  form.append("file", file);
  try {
    return await httpClient.post<T>(endpoint, form);
  } catch (error) {
    if (error instanceof HttpClientError) return null;
    throw error;
  }
}

export const uploadAvatar = (image: Blob) =>
  upload<{ id: string; url: string }>(image, "/storage/avatar");

export const uploadCv = (file: File) =>
  upload<{ id: string }>(file, "/storage/cv");
