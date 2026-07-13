import "client-only";

import { UserWithProfile } from "@/types/UserWithProfile";
import { clientEnv } from "@/config/env.client";

export default async function getSession() {
  const response = await fetch(
    `${clientEnv.NEXT_PUBLIC_BASE_URL}/auth/session`,
    { cache: "no-store" }
  );
  return response.status === 200
    ? ((await response.json()) as UserWithProfile)
    : null;
}
