// @vitest-environment node
import { NextRequest, NextResponse } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";
import { z } from "zod";

import getServerSession from "@/application/services/sessionService";

import { defineHandler, type Session } from "./server";

vi.mock("server-only", () => ({}));
vi.mock("@/application/services/sessionService", () => ({ default: vi.fn() }));

const session = {
  role: "STUDENT",
  adminRole: null,
  student: { code: "owned" },
  employee: null,
} as Session;
const request = () => new NextRequest("http://localhost/api/example");
const context = { params: Promise.resolve({ code: "owned" }) };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getServerSession).mockResolvedValue(null);
});

test.each([undefined, "invalid", "valid-session"])(
  "no-session policy skips resolution for cookie %s",
  async (cookie) => {
    vi.mocked(getServerSession).mockResolvedValue(session);
    const handler = vi.fn(({ session }) =>
      NextResponse.json({ session }, { status: 200 })
    );
    const route = defineHandler<{ code: string }>({ auth: "none", handler });
    const response = await route(
      new NextRequest("http://localhost/api/example", {
        headers: cookie ? { cookie: `session=${cookie}` } : {},
      }),
      context
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ session: null });
    expect(getServerSession).not.toHaveBeenCalled();
  }
);

test("no-session policy rejects ownership configuration instead of silently skipping it", () => {
  expect(() =>
    // @ts-expect-error No-session handlers cannot authorize an identity.
    defineHandler<{ code: string }>({
      auth: "none",
      authorize: () => true,
      handler: () => new Response(),
    })
  ).toThrow(/authorize/);
});

test("optional identity still resolves and reaches its handler", async () => {
  vi.mocked(getServerSession).mockResolvedValue(session);
  const handler = vi.fn(() => new Response());
  await defineHandler<{ code: string }>({ auth: "public", handler })(
    request(),
    context
  );
  expect(getServerSession).toHaveBeenCalledOnce();
  expect(handler).toHaveBeenCalledWith(expect.objectContaining({ session }));
});

test("default policy rejects anonymous requests before handler execution", async () => {
  const handler = vi.fn();
  const response = await defineHandler<{ code: string }>({ handler })(
    request(),
    context
  );
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ error: "Unauthorized" });
  expect(handler).not.toHaveBeenCalled();
});

test.each(["session", "student", "employee", "admin", "superadmin"] as const)(
  "%s retains role and missing-session checks",
  async (auth) => {
    const handler = vi.fn(() => new Response());
    const route = defineHandler<{ code: string }>({ auth, handler });
    expect((await route(request(), context)).status).toBe(401);
    vi.mocked(getServerSession).mockResolvedValue(session);
    expect((await route(request(), context)).status).toBe(
      auth === "session" || auth === "student" ? 200 : 403
    );
    vi.mocked(getServerSession).mockResolvedValue({
      ...session,
      role: "EMPLOYEE",
      student: null,
      employee: { company: {} },
      adminRole: "SUPER_ADMIN",
    } as Session);
    expect((await route(request(), context)).status).toBe(
      auth === "student" ? 403 : 200
    );
  }
);

test("ownership denial and JSON validation retain their status codes", async () => {
  vi.mocked(getServerSession).mockResolvedValue(session);
  const denied = defineHandler<{ code: string }>({
    authorize: (_session, params) => params.code !== "owned",
    handler: () => new Response(),
  });
  expect((await denied(request(), context)).status).toBe(403);
  const invalid = defineHandler({
    auth: "none",
    schema: z.object({ name: z.string() }),
    handler: () => new Response(),
  });
  expect(
    (
      await invalid(
        new NextRequest("http://localhost/api/example", {
          method: "POST",
          body: "{}",
        }),
        { params: Promise.resolve({}) }
      )
    ).status
  ).toBe(400);
});
