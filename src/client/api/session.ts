import "client-only";

import { clientEnv } from "@/config/env.client";
import type { SessionDto } from "@/application/dto/sessionDto";

export default async function getSession() {
  const response = await fetch(
    `${clientEnv.NEXT_PUBLIC_BASE_URL}/auth/session`,
    { cache: "no-store" }
  );
  return response.status === 200
    ? ((await response.json()) as SessionDto)
    : null;
}
