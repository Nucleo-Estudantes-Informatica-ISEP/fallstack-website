import "client-only";

import { httpClient, HttpClientError } from "@/lib/http/client";

export async function getStudentPreviewToken(code: string) {
  try {
    const { token } = await httpClient.post<{ token: string }>(
      "/students/token",
      { code }
    );
    return token;
  } catch (error) {
    if (error instanceof HttpClientError && error.status === 404) return null;
    throw error;
  }
}
