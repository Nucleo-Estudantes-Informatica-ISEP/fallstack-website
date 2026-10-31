// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";

import { GET as liveness } from "../health/route";
import { GET } from "./route";

const isReady = vi.hoisted(() => vi.fn());
vi.mock("@/application/services/readinessService", () => ({ isReady }));
afterEach(() => vi.resetAllMocks());

test.each([true, false])(
  "readiness returns a minimal uncached response: %s",
  async (ready) => {
    isReady.mockResolvedValue(ready);
    const response = await GET();
    expect(response.status).toBe(ready ? 200 : 503);
    expect(await response.json()).toEqual(
      ready ? { status: "ready" } : { error: "Service unavailable" }
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
  }
);

test("dependency failures do not affect liveness or cause dependency/session work", async () => {
  isReady.mockRejectedValue(new Error("dependency offline"));
  const response = await liveness();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: 200 });
  expect(isReady).not.toHaveBeenCalled();
});
