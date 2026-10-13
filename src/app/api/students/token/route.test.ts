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
