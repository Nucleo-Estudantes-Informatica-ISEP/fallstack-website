import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";
import { z } from "zod";

import { HttpError } from "@/types/HttpError";
import { reportError } from "@/lib/logger";

import { httpErrorResponse } from "./server";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({ reportError: vi.fn() }));

beforeEach(() => {
  vi.mocked(reportError).mockClear();
});

test("reports unexpected errors and returns a generic 500", async () => {
  const error = new Error("boom");

  const response = httpErrorResponse(error);

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Something went wrong" });
  assert.equal(vi.mocked(reportError).mock.calls.length, 1);
  assert.equal(vi.mocked(reportError).mock.calls[0][0], error);
});

test("does not report expected HttpError instances", async () => {
  const error = new HttpError("Not found", 404);

  const response = httpErrorResponse(error);

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Not found" });
  assert.equal(vi.mocked(reportError).mock.calls.length, 0);
});

test("does not report Zod validation errors", async () => {
  const { error } = z.object({ name: z.string() }).safeParse({});

  const response = httpErrorResponse(error);

  assert.equal(response.status, 400);
  assert.equal(vi.mocked(reportError).mock.calls.length, 0);
});
