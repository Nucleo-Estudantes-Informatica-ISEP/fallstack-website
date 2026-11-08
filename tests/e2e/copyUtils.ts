import type { APIRequestContext } from "@playwright/test";

/** Response header set by `src/middleware.ts`; one opaque value per web copy. */
export const INSTANCE_ID_HEADER = "x-instance-id";

interface HeaderSource {
  headers(): Record<string, string>;
  url(): string;
}

export function copyOf(response: HeaderSource): string {
  const id = response.headers()[INSTANCE_ID_HEADER];
  if (!id)
    throw new Error(
      `No ${INSTANCE_ID_HEADER} header on ${new URL(response.url()).pathname}. ` +
        "Deploy a build that includes it, and check the proxy keeps it."
    );
  return id;
}

/**
 * Sends cheap requests until a different copy answers than `current`.
 * Used to force the next step of a flow onto another copy without sticky
 * routing. Fails when the proxy never leaves `current`.
 */
export async function untilOtherCopy(
  context: APIRequestContext,
  current: string,
  attempts: number
): Promise<string> {
  for (let i = 0; i < attempts; i += 1) {
    const probe = await context.get("/api/health");
    const id = copyOf(probe);
    if (id !== current) return id;
  }
  throw new Error(
    `Copy ${current} answered ${attempts} probes in a row; the proxy looks sticky or has one healthy copy.`
  );
}

/** Probe budget: round-robin reaches another copy within one pass. */
export const probeAttempts = (copies: number) => copies * 4;
