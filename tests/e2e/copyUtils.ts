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

/** Probe budget: round-robin reaches another copy within one pass. */
export const probeAttempts = (copies: number) => copies * 4;

/**
 * Repeats a safe, repeatable operation until a copy other than `current`
 * answers it, and returns that response. A probe on another route cannot do
 * this: it consumes the proxy's turn, so the real operation may land on the
 * same copy again. Use only for operations that are safe to repeat.
 */
export async function repeatOnOtherCopy<T extends HeaderSource>(
  operation: () => Promise<T>,
  current: string,
  attempts: number
): Promise<T> {
  for (let i = 0; i < attempts; i += 1) {
    const response = await operation();
    if (copyOf(response) !== current) return response;
  }
  throw new Error(
    `Copy ${current} answered ${attempts} attempts in a row; the proxy looks sticky or has one healthy copy.`
  );
}

/**
 * Repeats a safe operation until `target` answers it. A round-robin proxy
 * sends the next request to a different copy, so a state-changing request
 * sent right after this returns avoids `target`. Use only for operations that
 * are safe to repeat.
 */
export async function repeatUntilCopy<T extends HeaderSource>(
  operation: () => Promise<T>,
  target: string,
  attempts: number
): Promise<T> {
  for (let i = 0; i < attempts; i += 1) {
    const response = await operation();
    if (copyOf(response) === target) return response;
  }
  throw new Error(
    `Copy ${target} never answered in ${attempts} attempts; it may be unhealthy or excluded by the proxy.`
  );
}

/**
 * Repeats a safe operation until every expected copy has answered it, running
 * `check` on each response. Returns the copies seen, so each scenario is
 * tracked on its own.
 */
export async function collectCopies<T extends HeaderSource>(
  operation: () => Promise<T>,
  copies: number,
  attempts: number,
  check: (response: T) => void | Promise<void>
): Promise<Set<string>> {
  const seen = new Set<string>();
  for (let i = 0; i < attempts && seen.size < copies; i += 1) {
    const response = await operation();
    await check(response);
    seen.add(copyOf(response));
  }
  return seen;
}
