/**
 * Opaque identifier for this server process, returned as `x-instance-id`.
 *
 * Every web copy generates its own value when it starts. It carries no host,
 * container or network detail. Multi-copy tests read it to prove that
 * successive requests were served by different copies (#456).
 */
export const INSTANCE_ID_HEADER = "x-instance-id";

export const instanceId = crypto.randomUUID().slice(0, 8);

const publicDocuments =
  /^\/(?:about|privacy-policy|terms|event\/(?:pt|en))\/?$/;

/** Paths where middleware sets the CSP nonce. */
export function needsCsp(pathname: string, headers: Headers): boolean {
  if (publicDocuments.test(pathname)) return false;
  if (pathname === "/" || pathname === "/api" || pathname.startsWith("/api/"))
    return false;
  if (headers.has("next-router-prefetch")) return false;
  return headers.get("purpose") !== "prefetch";
}
