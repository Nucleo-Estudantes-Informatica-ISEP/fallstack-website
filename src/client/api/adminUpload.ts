import "client-only";

import { httpClient, HttpClientError } from "@/lib/http/client";

export type AdminUploadKind = "avatar" | "logo";

export async function uploadAdminImage(image: Blob, kind: AdminUploadKind) {
  const form = new FormData();
  form.append("file", image);
  try {
    return await httpClient.post<{ id: string; url: string }>(
      `/admin/storage/${kind}`,
      form
    );
  } catch (error) {
    if (error instanceof HttpClientError) return null;
    throw error;
  }
}
