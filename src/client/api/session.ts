import "client-only";

import { UserWithProfile } from "@/types/UserWithProfile";

export default async function getSession() {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/auth/session`,
    { cache: "no-store" }
  );
  return response.status === 200
    ? ((await response.json()) as UserWithProfile)
    : null;
}
