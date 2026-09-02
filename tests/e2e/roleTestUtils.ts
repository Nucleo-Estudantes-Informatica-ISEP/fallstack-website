import { request as pwRequest, type APIRequestContext } from "@playwright/test";

import { e2eEnv } from "./env";

const baseURL = (e2eEnv.baseUrl ?? "http://127.0.0.1:3000").replace(/\/$/, "");

export type Role =
  "student" | "employee" | "admin" | "superadmin" | "anonymous";

const storageStateByRole: Partial<
  Record<Exclude<Role, "anonymous">, string | undefined>
> = {
  student: e2eEnv.storageState,
  employee: e2eEnv.employeeStorageState,
  admin: e2eEnv.adminStorageState,
  superadmin: e2eEnv.superAdminStorageState,
};

/** Whether the storage-state env var required for this role is configured. */
export function hasStorageStateFor(role: Role): boolean {
  return role === "anonymous" || !!storageStateByRole[role];
}

/** Creates a standalone, authenticated API context for the given role. */
export async function createRoleContext(
  role: Role
): Promise<APIRequestContext> {
  const storageState =
    role === "anonymous" ? undefined : storageStateByRole[role];
  return pwRequest.newContext({ baseURL, storageState });
}

interface QrTokenPayload {
  code: string;
  timestamp?: number;
}

/**
 * Reads the payload of a JWT without verifying its signature. Only used to
 * inspect claims (e.g. a student `code`) issued by staging itself; the
 * actual verification always happens server-side.
 */
export function decodeQrTokenPayload(token: string): QrTokenPayload {
  const [, payloadSegment] = token.split(".");
  if (!payloadSegment)
    throw new Error("Malformed token: missing payload segment");

  const normalized = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );

  return JSON.parse(
    Buffer.from(padded, "base64").toString("utf8")
  ) as QrTokenPayload;
}
