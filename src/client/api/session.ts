import "client-only";

import { httpClient, HttpClientError } from "@/lib/http/client";
import type { SessionDto } from "@/application/dto/sessionDto";

export default async function getSession() {
  try {
    return await httpClient.get<SessionDto>("/auth/session", {
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof HttpClientError && error.status === 401) return null;
    throw error;
  }
}
