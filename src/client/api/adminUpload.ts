import "client-only";

import { httpClient, HttpClientError } from "@/lib/http/client";

export async function uploadAdminImage(image: Blob) {
  const form = new FormData();
  form.append("file", image);
  try {
    return await httpClient.post<{ id: string; url: string }>(
      "/admin/storage/avatar",
      form
    );
  } catch (error) {
    if (error instanceof HttpClientError) return null;
    throw error;
  }
}
