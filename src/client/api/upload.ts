import "client-only";

import { BASE_URL } from "@/services/api";

export async function uploadAvatar(image: Blob) {
  const form = new FormData();
  form.append("file", image);
  const response = await fetch(`${BASE_URL}/storage/avatar`, {
    method: "POST",
    body: form,
  });
  return response.ok
    ? ((await response.json()) as { id: string; url: string })
    : null;
}

export async function uploadCv(file: File) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${BASE_URL}/storage/cv`, {
    method: "POST",
    body: form,
  });
  return response.ok ? ((await response.json()) as { id: string }) : null;
}
