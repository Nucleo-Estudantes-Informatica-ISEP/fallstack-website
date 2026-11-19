import "client-only";

import config from "@/config";
import { matchesDeclaredType } from "@/lib/fileSignature";
import { httpClient, HttpClientError } from "@/lib/http/client";

type UploadError = (message: string) => void;

async function upload<T>(
  file: Blob,
  endpoint: "/storage/avatar",
  onError?: UploadError
) {
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (!matchesDeclaredType(bytes, file.type)) {
    onError?.("A imagem não corresponde ao formato declarado.");
    return null;
  }
  const form = new FormData();
  form.append("file", file);
  try {
    return await httpClient.post<T>(endpoint, form);
  } catch (error) {
    if (error instanceof HttpClientError) {
      onError?.(
        error.status === 413
          ? "A imagem continua demasiado pesada após a compressão. Escolhe uma imagem mais pequena."
          : "O servidor rejeitou a imagem. Tenta novamente ou escolhe outra imagem."
      );
      return null;
    }
    throw error;
  }
}

export const uploadAvatar = (image: Blob, onError?: UploadError) =>
  upload<{ id: string; url: string }>(image, "/storage/avatar", onError);

export async function uploadCv(file: File, onError?: UploadError) {
  if (!file.size || file.size > config.uploads.cv.maxSize) {
    onError?.(
      `O CV é demasiado grande. O tamanho máximo é ${config.uploads.cv.maxSize / (1024 * 1024)} MB.`
    );
    return null;
  }
  if (file.type !== "application/pdf" || !/\.pdf$/i.test(file.name)) {
    onError?.("O CV tem de ser um ficheiro PDF.");
    return null;
  }
  if (
    !matchesDeclaredType(
      new Uint8Array(await file.slice(0, 8).arrayBuffer()),
      file.type
    )
  ) {
    onError?.("O ficheiro não é um PDF válido.");
    return null;
  }
  let uploadId: string | undefined;
  let transferred = false;
  try {
    const ticket = await httpClient.post<{
      uploadId: string;
      partSize: number;
    }>("/storage/cv/multipart", {
      filename: file.name,
      contentType: file.type,
      size: file.size,
    });
    uploadId = ticket.uploadId;
    if (ticket.partSize !== 5 * 1024 * 1024)
      throw new Error("Invalid upload part size");
    // One part at a time; retries never resend already accepted parts.
    for (
      let offset = 0, partNumber = 1;
      offset < file.size;
      offset += ticket.partSize, partNumber++
    ) {
      const part = file.slice(offset, offset + ticket.partSize);
      const hash = new Uint8Array(
        await crypto.subtle.digest("SHA-256", await part.arrayBuffer())
      );
      const checksum = btoa(String.fromCharCode(...hash));
      for (let attempt = 0; ; attempt++) {
        try {
          const signed = await httpClient.post<{
            url: string;
            headers: Record<string, string>;
          }>("/storage/cv/multipart/parts", { uploadId, partNumber, checksum });
          const response = await fetch(signed.url, {
            method: "PUT",
            body: part,
            headers: signed.headers,
            credentials: "omit",
            redirect: "error",
            signal: AbortSignal.timeout(55000),
          });
          if (!response.ok)
            throw new HttpClientError(
              "CV part transfer failed",
              response.status
            );
          break;
        } catch (error) {
          if (
            attempt === 2 ||
            (error instanceof HttpClientError &&
              error.status < 500 &&
              error.status !== 429)
          )
            throw error;
          await new Promise((resolve) =>
            setTimeout(resolve, 500 * 2 ** attempt)
          );
        }
      }
    }
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
  } catch (error) {
    if (uploadId && !transferred)
      await httpClient.post("/storage/cv/cancel", { uploadId }).catch(() => {});
    onError?.(
      error instanceof HttpClientError && error.status === 413
        ? "O CV excede o tamanho máximo aceite pelo servidor."
        : "Não foi possível carregar o CV. Verifica a ligação e tenta novamente."
    );
    return null;
  }
}
