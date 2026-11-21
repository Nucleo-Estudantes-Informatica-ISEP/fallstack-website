import "client-only";

import { httpClient, HttpClientError } from "@/lib/http/client";

export type StudentPreview = { code: string; token: string };

export async function getStudentPreview(input: string | { token: string }) {
  try {
    return await httpClient.post<StudentPreview>(
      "/students/token",
      typeof input === "string" ? { code: input } : input
    );
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
