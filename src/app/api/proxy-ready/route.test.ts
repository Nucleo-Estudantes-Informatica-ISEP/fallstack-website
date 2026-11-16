// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";

import { GET } from "./route";

const isShuttingDown = vi.hoisted(() => vi.fn());
vi.mock("@/application/services/shutdownService", () => ({ isShuttingDown }));
afterEach(() => vi.resetAllMocks());

test.each([
  [false, 200, { status: "ready" }],
  [true, 503, { error: "Service unavailable" }],
])(
  "proxy readiness returns expected status: stopping=%s -> status=%s",
  async (stopping, expectedStatus, expectedBody) => {
    isShuttingDown.mockReturnValue(stopping);
    const response = await GET();
    expect(response.status).toBe(expectedStatus);
    expect(await response.json()).toEqual(expectedBody);
    expect(response.headers.get("cache-control")).toBe("no-store");
  }
);
