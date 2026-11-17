import "client-only";

import { httpClient, HttpClientError } from "@/lib/http/client";

export async function getStudentPreviewToken(
  input: string | { token: string }
) {
  try {
    const { token } = await httpClient.post<{ token: string }>(
      "/students/token",
      typeof input === "string" ? { code: input } : input
    );
    return token;
  } catch (error) {
    // 404: no student has this code. 400: the server rejected the code's
    // format (e.g. a typed five-character code). Both mean "invalid code".
    if (
      error instanceof HttpClientError &&
      (error.status === 404 || error.status === 400)
    )
      return null;
    throw error;
  }
}
