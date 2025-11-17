import { BASE_URL } from "@/services/api";

export async function uploadAvatar(image: Blob) {
  const form = new FormData();
  form.append("file", image);

  const res = await fetch(`${BASE_URL}/storage/avatar`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) return null;
  return (await res.json()) as { id: string; url: string };
}

export async function uploadCv(file: File) {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${BASE_URL}/storage/cv`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) return null;
  return (await res.json()) as { id: string };
}
