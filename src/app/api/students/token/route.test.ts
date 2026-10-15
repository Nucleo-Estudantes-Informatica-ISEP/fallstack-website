import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { beforeEach, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/application/services/sessionService", () => ({
  default: vi.fn(),
}));
vi.mock("@/application/services/studentTokenService", () => ({
  jwtStudent: vi.fn(),
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

beforeEach(() => {
  vi.clearAllMocks();

  // The route's rate limiter is module-scoped; reset modules so each test
  // gets a fresh limiter and cannot inherit another test's rate-limit state.
  vi.resetModules();
});

test("rejects a student session before minting a preview token", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(studentSession as never);

  const { jwtStudent } =
    await import("@/application/services/studentTokenService");
  const { POST } = await import("./route");
  const response = await POST(request({ code: "AB12" }), {
    params: Promise.resolve({}),
  });

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
  const { POST } = await import("./route");
  const response = await POST(request({ code: "invalid" }), {
    params: Promise.resolve({}),
  });

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

  const { POST } = await import("./route");
  const response = await POST(request({ code: "ZZ99" }), {
    params: Promise.resolve({}),
  });

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

  const { POST } = await import("./route");
  const response = await POST(request({ code: " ab12 " }), {
    params: Promise.resolve({}),
  });

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

  const { POST } = await import("./route");

  for (let i = 0; i < 5; i++) {
    const response = await POST(request({ code: "ZZ99" }), {
      params: Promise.resolve({}),
    });

    assert.equal(response.status, 404);
  }

  const response = await POST(request({ code: "ZZ99" }), {
    params: Promise.resolve({}),
  });

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

  const { POST } = await import("./route");

  for (let i = 0; i < 10; i++) {
    const response = await POST(request({ code: "AB12" }), {
      params: Promise.resolve({}),
    });

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

  const { POST } = await import("./route");

  for (let i = 0; i < 5; i++) {
    const response = await POST(request({ code: "ZZ99" }), {
      params: Promise.resolve({}),
    });

    assert.equal(response.status, 404);
  }

  const limitedResponse = await POST(request({ code: "ZZ99" }), {
    params: Promise.resolve({}),
  });

  assert.equal(limitedResponse.status, 429);

  vi.mocked(getServerSession).mockResolvedValue({
    ...employeeSession,
    id: "employee-2",
    employee: {
      ...employeeSession.employee,
      id: "employee-2",
    },
  } as never);

  const otherEmployeeResponse = await POST(request({ code: "ZZ99" }), {
    params: Promise.resolve({}),
  });

  assert.equal(otherEmployeeResponse.status, 404);
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
  const { POST } = await import("./route");

  const response = await POST(request({ code: "AB12" }), {
    params: Promise.resolve({}),
  });

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

  const { POST } = await import("./route");

  for (let i = 0; i < 5; i++) {
    const response = await POST(request({ code: "ZZ99" }), {
      params: Promise.resolve({}),
    });
    assert.equal(response.status, 404);
  }

  const blockedResponse = await POST(request({ code: "ZZ99" }), {
    params: Promise.resolve({}),
  });
  assert.equal(blockedResponse.status, 429);

  vi.advanceTimersByTime(60_001);

  const responseAfterExpiry = await POST(request({ code: "ZZ99" }), {
    params: Promise.resolve({}),
  });

  assert.equal(responseAfterExpiry.status, 404);
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

  const { POST } = await import("./route");

  for (let i = 0; i < 5; i++) {
    await POST(request({ code: "ZZ99" }), {
      params: Promise.resolve({}),
    });
  }

  const response = await POST(request({ code: "ZZ99" }), {
    params: Promise.resolve({}),
  });

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

  const { POST } = await import("./route");

  for (let i = 0; i < 2; i++) {
    const response = await POST(request({ code: "ZZ99" }), {
      params: Promise.resolve({}),
    });
    assert.equal(response.status, 404);
  }

  const successfulResponse = await POST(request({ code: "AB12" }), {
    params: Promise.resolve({}),
  });
  assert.equal(successfulResponse.status, 200);

  for (let i = 0; i < 3; i++) {
    const response = await POST(request({ code: "ZZ99" }), {
      params: Promise.resolve({}),
    });
    assert.equal(response.status, 404);
  }

  const limitedResponse = await POST(request({ code: "ZZ99" }), {
    params: Promise.resolve({}),
  });

  assert.equal(limitedResponse.status, 429);
  assert.equal(vi.mocked(jwtStudent).mock.calls.length, 6);
});

test("allows only the permitted number of concurrent invalid-code requests", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;

  vi.mocked(getServerSession).mockResolvedValue(employeeSession as never);

  const { jwtStudent } =
    await import("@/application/services/studentTokenService");

  vi.mocked(jwtStudent).mockResolvedValue(null);

  const { POST } = await import("./route");

  const responses = await Promise.all(
    Array.from({ length: 6 }, () =>
      POST(request({ code: "ZZ99" }), {
        params: Promise.resolve({}),
      })
    )
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
