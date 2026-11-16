import "client-only";

import config from "@/config";
import { matchesDeclaredType } from "@/lib/fileSignature";
import { httpClient, HttpClientError } from "@/lib/http/client";

async function upload<T>(file: Blob, endpoint: "/storage/avatar") {
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

export async function uploadCv(file: File) {
  if (
    !file.size ||
    file.size > config.uploads.cv.maxSize ||
    file.type !== "application/pdf" ||
    !/\.pdf$/i.test(file.name) ||
    !matchesDeclaredType(
      new Uint8Array(await file.slice(0, 8).arrayBuffer()),
      file.type
    )
  )
    return null;
  let uploadId: string | undefined;
  let transferred = false;
  try {
    const ticket = await httpClient.post<{
      uploadId: string;
      url: string;
      fields: Record<string, string>;
    }>("/storage/cv", {
      filename: file.name,
      contentType: file.type,
      size: file.size,
    });
    uploadId = ticket.uploadId;
    const form = new FormData();
    for (const [key, value] of Object.entries(ticket.fields))
      form.append(key, value);
    form.append("file", file); // S3 POST requires the file part last.
    // External, signed transfer: never send application cookies or API headers.
    const response = await fetch(ticket.url, {
      method: "POST",
      body: form,
      credentials: "omit",
      redirect: "error",
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok)
      throw new HttpClientError("CV transfer failed", response.status);
    transferred = true;
    // Retry only finalization. Never silently send bytes through Next.js.
    for (let attempt = 0; ; attempt++) {
      try {
        return await httpClient.post<{ id: string }>("/storage/cv/finalize", {
          uploadId,
        });
      } catch (error) {
        if (
          attempt === 2 ||
          (error instanceof HttpClientError &&
            ![409, 503].includes(error.status))
        )
          throw error;
        await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
      }
    }
  } catch {
    if (uploadId && !transferred)
      await httpClient.post("/storage/cv/cancel", { uploadId }).catch(() => {});
    return null;
  }
}
