import "client-only";

import { httpClient, HttpClientError } from "@/lib/http/client";

export async function uploadAvatar(image: Blob) {
  const form = new FormData();
  form.append("file", image);
  try {
    return await httpClient.post<{ id: string; url: string }>(
      "/storage/avatar",
      form
    );
  } catch (error) {
    if (error instanceof HttpClientError) return null;
    throw error;
  }
}

export async function uploadCv(file: File) {
  const form = new FormData();
  form.append("file", file);
  try {
    return await httpClient.post<{ id: string }>("/storage/cv", form);
  } catch (error) {
    if (error instanceof HttpClientError) return null;
    throw error;
  }
}
