import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/application/services/sessionService", () => ({
  default: vi.fn(),
}));
vi.mock("@/application/services/studentTokenService", () => ({
  jwtStudent: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  reportError: vi.fn(),
  default: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

const employeeSession = {
  id: "employee-1",
  role: "EMPLOYEE",
  adminRole: null,
  student: null,
  employee: {
    id: "employee-1",
    company: { id: "company-1" },
  },
};

const studentSession = {
  id: "student-1",
  role: "STUDENT",
  adminRole: null,
  student: { id: "student-1", code: "AB12", name: "Student" },
  employee: null,
};

function request(body: unknown) {
  return new NextRequest("http://localhost/api/students/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function post(body: unknown) {
  const { POST } = await import("./route");

  return POST(request(body), {
    params: Promise.resolve({}),
  });
}

beforeEach(() => {
  // The rate limiter is module-scoped, so isolate its state between tests.
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

test("rejects a student session before minting a preview token", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(studentSession as never);

  const { jwtStudent } =
    await import("@/application/services/studentTokenService");

  const response = await post({ code: "AB12" });

  assert.equal(response.status, 403);
  assert.equal(vi.mocked(jwtStudent).mock.calls.length, 0);
});

test("rejects an invalid code before minting a preview token", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(employeeSession as never);

  const { jwtStudent } =
    await import("@/application/services/studentTokenService");

  const response = await post({ code: "invalid" });

  assert.equal(response.status, 400);
  assert.equal(vi.mocked(jwtStudent).mock.calls.length, 0);
});

test("returns 404 when an employee submits an unknown code", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(employeeSession as never);

  const { jwtStudent } =
    await import("@/application/services/studentTokenService");

  vi.mocked(jwtStudent).mockResolvedValue(null);

  const response = await post({ code: "ZZ99" });

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Student not found" });
});

test("normalizes a code and mints a token for an employee", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(employeeSession as never);

  const { jwtStudent } =
    await import("@/application/services/studentTokenService");

  vi.mocked(jwtStudent).mockResolvedValue("preview-token");

  const response = await post({ code: " ab12 " });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { token: "preview-token" });
  assert.deepEqual(vi.mocked(jwtStudent).mock.calls[0], ["AB12"]);
});

test("rate limits repeated requests with unknown student codes", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(employeeSession as never);

  const { jwtStudent } =
    await import("@/application/services/studentTokenService");

  vi.mocked(jwtStudent).mockResolvedValue(null);

  for (let i = 0; i < 5; i++) {
    const response = await post({ code: "ZZ99" });
    assert.equal(response.status, 404);
  }

  const response = await post({ code: "ZZ99" });

  assert.equal(response.status, 429);

  assert.equal(vi.mocked(jwtStudent).mock.calls.length, 5);
});

test("rate limits a valid code when the employee is over budget", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(employeeSession as never);

  const { jwtStudent } =
    await import("@/application/services/studentTokenService");

  vi.mocked(jwtStudent).mockResolvedValue(null);

  for (let i = 0; i < 5; i++) {
    assert.equal((await post({ code: "ZZ99" })).status, 404);
  }

  vi.mocked(jwtStudent).mockResolvedValue("preview-token");

  const response = await post({ code: "AB12" });

  assert.equal(response.status, 429);
  assert.equal(vi.mocked(jwtStudent).mock.calls.length, 5);
});

test("does not rate limit valid student scans", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(employeeSession as never);

  const { jwtStudent } =
    await import("@/application/services/studentTokenService");

  vi.mocked(jwtStudent).mockResolvedValue("preview-token");

  for (let i = 0; i < 10; i++) {
    const response = await post({ code: "AB12" });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      token: "preview-token",
    });
  }

  assert.equal(vi.mocked(jwtStudent).mock.calls.length, 10);
});

test("scopes invalid-code rate limits to each employee", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(employeeSession as never);

  const { jwtStudent } =
    await import("@/application/services/studentTokenService");

  vi.mocked(jwtStudent).mockResolvedValue(null);

  for (let i = 0; i < 5; i++) {
    assert.equal((await post({ code: "ZZ99" })).status, 404);
  }

  assert.equal((await post({ code: "ZZ99" })).status, 429);

  vi.mocked(getServerSession).mockResolvedValue({
    ...employeeSession,
    id: "employee-2",
    employee: {
      ...employeeSession.employee,
      id: "employee-2",
    },
  } as never);

  // A different employee has an independent rate-limit counter.
  assert.equal((await post({ code: "ZZ99" })).status, 404);
  assert.equal(vi.mocked(jwtStudent).mock.calls.length, 6);
});

test("returns 403 when the employee session has no employee ID", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue({
    ...employeeSession,
    employee: {
      ...employeeSession.employee,
      id: undefined,
    },
  } as never);

  const { jwtStudent } =
    await import("@/application/services/studentTokenService");

  const response = await post({ code: "AB12" });

  assert.equal(response.status, 403);
  assert.equal(vi.mocked(jwtStudent).mock.calls.length, 0);
});

test("resets the invalid-code limit after the window expires", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-15T10:00:00Z"));

  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(employeeSession as never);

  const { jwtStudent } =
    await import("@/application/services/studentTokenService");

  vi.mocked(jwtStudent).mockResolvedValue(null);

  for (let i = 0; i < 5; i++) {
    assert.equal((await post({ code: "ZZ99" })).status, 404);
  }

  assert.equal((await post({ code: "ZZ99" })).status, 429);

  vi.advanceTimersByTime(60_001);

  assert.equal((await post({ code: "ZZ99" })).status, 404);
  assert.equal(vi.mocked(jwtStudent).mock.calls.length, 6);
});

test("returns the expected Retry-After header when rate limited", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-15T10:00:00Z"));

  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(employeeSession as never);

  const { jwtStudent } =
    await import("@/application/services/studentTokenService");

  vi.mocked(jwtStudent).mockResolvedValue(null);

  for (let i = 0; i < 5; i++) {
    await post({ code: "ZZ99" });
  }

  const response = await post({ code: "ZZ99" });

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "60");
  assert.equal(vi.mocked(jwtStudent).mock.calls.length, 5);
});

test("successful scans do not reset the invalid-code count", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(employeeSession as never);

  const { jwtStudent } =
    await import("@/application/services/studentTokenService");

  vi.mocked(jwtStudent)
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce("preview-token")
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce(null);

  assert.equal((await post({ code: "ZZ99" })).status, 404);
  assert.equal((await post({ code: "ZZ99" })).status, 404);

  // A successful scan must not count as an invalid attempt.
  assert.equal((await post({ code: "AB12" })).status, 200);

  assert.equal((await post({ code: "ZZ99" })).status, 404);
  assert.equal((await post({ code: "ZZ99" })).status, 404);

  // The fifth invalid attempt should still be allowed.
  assert.equal((await post({ code: "ZZ99" })).status, 404);

  // The sixth invalid attempt should be rate-limited.
  assert.equal((await post({ code: "ZZ99" })).status, 429);
});

test("allows only the permitted number of concurrent invalid-code requests", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(employeeSession as never);

  const { jwtStudent } =
    await import("@/application/services/studentTokenService");

  vi.mocked(jwtStudent).mockResolvedValue(null);

  const responses = await Promise.all(
    Array.from({ length: 6 }, () => post({ code: "ZZ99" }))
  );

  assert.equal(
    responses.filter((response) => response.status === 404).length,
    5
  );
  assert.equal(
    responses.filter((response) => response.status === 429).length,
    1
  );

  assert.equal(vi.mocked(jwtStudent).mock.calls.length, 5);
});

test("allows concurrent valid student scans beyond the invalid-code limit", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(employeeSession as never);

  const { jwtStudent } =
    await import("@/application/services/studentTokenService");

  vi.mocked(jwtStudent).mockImplementation(
    async () =>
      new Promise((resolve) => {
        setTimeout(() => resolve("preview-token"), 10);
      })
  );

  const responses = await Promise.all(
    Array.from({ length: 10 }, () => post({ code: "AB12" }))
  );

  assert.equal(
    responses.filter((response) => response.status === 200).length,
    10
  );
  assert.equal(
    responses.filter((response) => response.status === 429).length,
    0
  );

  assert.equal(vi.mocked(jwtStudent).mock.calls.length, 10);
});

test("audits invalid and limited attempts without codes or tokens", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-21T10:00:00Z"));
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(employeeSession as never);
  const { jwtStudent } =
    await import("@/application/services/studentTokenService");
  const logger = (await import("@/lib/logger")).default;
  const { createLogger } =
    await vi.importActual<typeof import("@/lib/logger")>("@/lib/logger");
  const lines: string[] = [];
  const auditLogger = createLogger(
    { base: undefined, timestamp: false },
    {
      write(chunk: string) {
        lines.push(chunk);
      },
    }
  );
  vi.mocked(logger.warn).mockImplementation((record, message) =>
    auditLogger.warn(record, message)
  );
  const employeeRef = createHash("sha256").update("employee-1").digest("hex");
  vi.mocked(jwtStudent)
    .mockResolvedValueOnce("secret-preview-token")
    .mockResolvedValue(null);

  assert.equal((await post({ code: "AB12" })).status, 200);
  for (let i = 0; i < 5; i++) await post({ code: "ZZ99" });
  const limited = await post({ code: "AB12" });
  assert.equal(limited.status, 429);
  assert.deepEqual(await limited.json(), { error: "Too many requests" });
  assert.deepEqual(vi.mocked(logger.warn).mock.calls, [
    ...Array.from({ length: 5 }, () => [
      { event: "student_token.invalid_code", employeeRef },
      "Invalid student token code",
    ]),
    [
      {
        event: "student_token.rate_limited",
        employeeRef,
        retryAfterMs: 60_000,
      },
      "Student token requests rate limited",
    ],
  ]);
  assert.equal(lines.length, 6);
  for (const line of lines) {
    assert.equal(JSON.parse(line).employeeRef, employeeRef);
    assert.doesNotMatch(line, /AB12|ZZ99|secret-preview-token|employee-1/);
  }
});

test("lookup errors release the employee gate without consuming invalid budget", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(employeeSession as never);
  const { jwtStudent } =
    await import("@/application/services/studentTokenService");
  vi.mocked(jwtStudent)
    .mockRejectedValueOnce(new Error("Database unavailable"))
    .mockResolvedValue(null);

  const responses = await Promise.all(
    Array.from({ length: 7 }, () => post({ code: "ZZ99" }))
  );
  assert.deepEqual(
    responses.map((response) => response.status),
    [500, 404, 404, 404, 404, 404, 429]
  );
  assert.equal(vi.mocked(jwtStudent).mock.calls.length, 6);
  assert.deepEqual(await responses[0].json(), {
    error: "Something went wrong",
  });
});

test("a pending lookup does not block another employee", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  const { jwtStudent } =
    await import("@/application/services/studentTokenService");
  let finish!: (value: string) => void;
  let entered!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  vi.mocked(jwtStudent)
    .mockImplementationOnce(() => {
      entered();
      return new Promise((resolve) => {
        finish = resolve;
      });
    })
    .mockResolvedValue("second-token");
  vi.mocked(getServerSession).mockResolvedValue(employeeSession as never);
  const first = post({ code: "AB12" });
  await started;
  vi.mocked(getServerSession).mockResolvedValue({
    ...employeeSession,
    employee: { ...employeeSession.employee, id: "employee-2" },
  } as never);
  try {
    assert.equal((await post({ code: "AB12" })).status, 200);
  } finally {
    finish("first-token");
    assert.equal((await first).status, 200);
  }
});
