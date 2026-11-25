import { NextRequest } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";

import logger from "@/lib/logger";
import { checkRateLimit } from "@/application/services/rateLimitService";
import getServerSession from "@/application/services/sessionService";
import { jwtStudent } from "@/application/services/studentTokenService";

import { POST } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/application/services/sessionService", () => ({ default: vi.fn() }));
vi.mock("@/application/services/rateLimitService", () => ({
  checkRateLimit: vi.fn(),
}));
vi.mock("@/application/services/studentTokenService", () => ({
  jwtStudent: vi.fn(),
  studentPreviewCookieName: "fallstack-student-preview",
  studentPreviewTtlSeconds: 900,
}));
vi.mock("@/lib/logger", () => ({
  reportError: vi.fn(),
  default: { warn: vi.fn() },
}));

const employee = {
  id: "employee",
  role: "EMPLOYEE",
  employee: { id: "employee", company: { id: "company" } },
};

function post(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/students/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({}) }
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getServerSession).mockResolvedValue(employee as never);
  vi.mocked(checkRateLimit).mockResolvedValue({ status: "allowed" });
});

test.each([
  null,
  { role: "STUDENT" },
  { ...employee, employee: { company: { id: "company" } } },
])(
  "declines a request without a complete employee session",
  async (session) => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    expect((await post({ code: "AB12" })).status).toBe(session ? 403 : 401);
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(jwtStudent).not.toHaveBeenCalled();
  }
);

test("rejects an invalid length before touching Redis or looking up a credential", async () => {
  expect((await post({ code: "WRONG" })).status).toBe(400);
  expect(checkRateLimit).not.toHaveBeenCalled();
  expect(jwtStudent).not.toHaveBeenCalled();
});

test.each([
  [{ code: " ab12 " }, "AB12"],
  [{ code: "ab12cd" }, "AB12CD"],
  [{ token: "signed-pass" }, { token: "signed-pass" }],
])(
  "allows valid scans without consuming the miss budget",
  async (body, input) => {
    vi.mocked(jwtStudent).mockResolvedValue({
      code: "AB12",
      token: "preview-token",
    });
    const response = await post(body);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      code: "AB12",
      token: "preview-token",
    });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("set-cookie")).toMatch(
      /Path=\/student\/AB12\/preview;.*HttpOnly.*SameSite=strict/i
    );
    const reservation =
      vi.mocked(checkRateLimit).mock.calls[0]?.[2].reservation;
    expect(reservation?.id).toEqual(expect.any(String));
    expect(checkRateLimit).toHaveBeenLastCalledWith(
      "student_token",
      "employee",
      {
        max: 5,
        windowMs: 60000,
        reservation: { ...reservation, release: true },
      }
    );
    expect(jwtStudent).toHaveBeenCalledWith(input, "company");
  }
);

test("records a miss and logs only the hashed subject", async () => {
  vi.mocked(jwtStudent).mockResolvedValue(null);
  const response = await post({ code: "ZZ99" });
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ error: "Student not found" });
  expect(checkRateLimit).toHaveBeenCalledTimes(1);
  expect(logger.warn).toHaveBeenCalledWith(
    {
      event: "student_token.invalid_code",
      employeeRef: expect.stringMatching(/^[a-f0-9]{64}$/),
    },
    expect.any(String)
  );
});

test("concurrent misses enter the lookup only after reserving a slot", async () => {
  const slots = new Set<string>();
  vi.mocked(checkRateLimit).mockImplementation(
    async (_endpoint, _id, policy) => {
      const reservation = policy.reservation;
      if (!reservation) throw new Error("Expected a reservation before lookup");
      if (reservation.release) slots.delete(reservation.id);
      else if (slots.size >= policy.max)
        return { status: "limited", retryAfterMs: 5200 };
      else slots.add(reservation.id);
      return { status: "allowed" };
    }
  );
  vi.mocked(jwtStudent).mockResolvedValue(null);
  const responses = await Promise.all(
    Array.from({ length: 8 }, () => post({ code: "ZZ99" }))
  );
  expect(jwtStudent).toHaveBeenCalledTimes(5);
  expect(responses.filter(({ status }) => status === 404)).toHaveLength(5);
  const limited = responses.filter(({ status }) => status === 429);
  expect(limited).toHaveLength(3);
  expect(limited[0]?.headers.get("retry-after")).toBe("6");
});

test("does not look up a code while Redis is unavailable or the budget is exhausted", async () => {
  vi.mocked(checkRateLimit)
    .mockResolvedValueOnce({ status: "unavailable" })
    .mockResolvedValueOnce({ status: "limited", retryAfterMs: 1000 });
  expect((await post({ code: "AB12" })).status).toBe(503);
  expect((await post({ code: "AB12" })).status).toBe(429);
  expect(jwtStudent).not.toHaveBeenCalled();
});

test("does not consume the miss budget when the lookup itself fails", async () => {
  vi.mocked(jwtStudent).mockRejectedValue(new Error("database unavailable"));
  expect((await post({ code: "AB12" })).status).toBe(500);
  expect(checkRateLimit).toHaveBeenCalledTimes(2);
  expect(
    vi.mocked(checkRateLimit).mock.calls[1]?.[2].reservation
  ).toMatchObject({ release: true });
});
