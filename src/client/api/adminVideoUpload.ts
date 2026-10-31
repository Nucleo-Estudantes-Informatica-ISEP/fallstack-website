import "client-only";

import { httpClient } from "@/lib/http/client";
import { MAX_VIDEO_BYTES } from "@/domain/company/companyVideo";

export async function uploadAdminVideo(file: File) {
  if (file.type !== "video/mp4" || !file.size || file.size > MAX_VIDEO_BYTES)
    throw new Error("Seleciona um vídeo MP4 até 256 MiB.");
  const response = await httpClient.raw("/admin/storage/video", {
    method: "POST",
    headers: { "Content-Type": "video/mp4" },
    body: file,
  });
  return (await response.json()) as { url: string };
}
