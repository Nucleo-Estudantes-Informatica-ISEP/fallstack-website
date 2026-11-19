import { cookies } from "next/headers";
import { beforeEach, expect, test, vi } from "vitest";

import { passesAuthPolicy } from "@/domain/auth/authPolicy";

import { findUserSessionByZitadelUserId } from "../repositories/userRepository";
import getServerSession from "./sessionService";
import { verifyAppSession } from "./zitadelAuthService";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("../repositories/userRepository", () => ({
  findUserSessionByZitadelUserId: vi.fn(),
}));
vi.mock("./zitadelAuthService", () => ({ verifyAppSession: vi.fn() }));

const cookieGet = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(cookies).mockResolvedValue({ get: cookieGet } as never);
  cookieGet.mockReturnValue({ value: "session-token" });
});

test("returns null when there is no Fallstack session cookie", async () => {
  cookieGet.mockReturnValue(undefined);

  expect(await getServerSession()).toBeNull();
  expect(findUserSessionByZitadelUserId).not.toHaveBeenCalled();
});

test("returns null for an invalid app session", async () => {
  vi.mocked(verifyAppSession).mockReturnValue(null);

  expect(await getServerSession()).toBeNull();
});

test("resolves an active student by ZITADEL subject", async () => {
  vi.mocked(verifyAppSession).mockReturnValue({
    sub: "zitadel-user-1",
    email: "a@isep.ipp.pt",
    employee: false,
    admin: false,
  });
  vi.mocked(findUserSessionByZitadelUserId).mockResolvedValue({
    id: "app-user-1",
    zitadelUserId: "zitadel-user-1",
    email: "a@isep.ipp.pt",
    role: "STUDENT",
    adminRole: null,
    active: true,
    student: { id: "app-user-1", code: "A123", name: "Student" },
    employee: null,
  } as never);

  const session = await getServerSession();
  expect(session?.role).toBe("STUDENT");
  expect(session?.adminRole).toBeNull();
  expect(findUserSessionByZitadelUserId).toHaveBeenCalledWith("zitadel-user-1");
});

test("maps the NEI Global admin role to superadmin access", async () => {
  vi.mocked(verifyAppSession).mockReturnValue({
    sub: "admin-sub",
    email: "admin@nei-isep.org",
    employee: false,
    admin: true,
  });
  vi.mocked(findUserSessionByZitadelUserId).mockResolvedValue({
    id: "app-admin",
    zitadelUserId: "admin-sub",
    email: "admin@nei-isep.org",
    role: null,
    adminRole: null,
    active: true,
    student: null,
    employee: null,
  } as never);

  expect((await getServerSession())?.adminRole).toBe("SUPER_ADMIN");
});

test("preserves the configured Admin tier behind the NEI Global grant", async () => {
  vi.mocked(verifyAppSession).mockReturnValue({
    sub: "admin-sub",
    email: "admin@nei-isep.org",
    employee: false,
    admin: true,
  });
  vi.mocked(findUserSessionByZitadelUserId).mockResolvedValue({
    id: "app-admin",
    zitadelUserId: "admin-sub",
    email: "admin@nei-isep.org",
    role: null,
    adminRole: "ADMIN",
    active: true,
    student: null,
    employee: null,
  } as never);

  expect((await getServerSession())?.adminRole).toBe("ADMIN");
});

test("does not trust a stale local admin tier without the NEI Global grant", async () => {
  vi.mocked(verifyAppSession).mockReturnValue({
    sub: "former-admin-sub",
    email: "former-admin@nei-isep.org",
    employee: false,
    admin: false,
  });
  vi.mocked(findUserSessionByZitadelUserId).mockResolvedValue({
    id: "app-admin",
    zitadelUserId: "former-admin-sub",
    email: "former-admin@nei-isep.org",
    role: null,
    adminRole: "SUPER_ADMIN",
    active: true,
    student: null,
    employee: null,
  } as never);

  expect((await getServerSession())?.adminRole).toBeNull();
});

test("does not trust a stale local employee role without the ZITADEL role", async () => {
  vi.mocked(verifyAppSession).mockReturnValue({
    sub: "employee-sub",
    email: "employee@example.com",
    employee: false,
    admin: false,
  });
  vi.mocked(findUserSessionByZitadelUserId).mockResolvedValue({
    id: "app-employee",
    zitadelUserId: "employee-sub",
    email: "employee@example.com",
    role: "EMPLOYEE",
    adminRole: null,
    active: true,
    student: null,
    employee: {
      id: "app-employee",
      name: "Employee",
      companyId: "company-1",
      company: { id: "company-1", name: "Company", avatar: null },
    },
  } as never);

  expect((await getServerSession())?.role).toBeNull();
});

test("rejects deactivated local accounts", async () => {
  vi.mocked(verifyAppSession).mockReturnValue({
    sub: "zitadel-user-1",
    email: "a@isep.ipp.pt",
    employee: false,
    admin: false,
  });
  vi.mocked(findUserSessionByZitadelUserId).mockResolvedValue({
    id: "app-user-1",
    active: false,
  } as never);

  expect(await getServerSession()).toBeNull();
});

test.each([undefined, 1100000, 0, 45000000])(
  "preserves membership and bounds attendance deadline %s",
  async (attendanceExpiresAt) => {
    vi.mocked(verifyAppSession).mockReturnValue({
      sub: "member-sub",
      email: "member@example.org",
      employee: false,
      admin: false,
      neiMember: true,
      iat: 1000,
      attendanceExpiresAt,
    });
    vi.mocked(findUserSessionByZitadelUserId).mockResolvedValue({
      id: "member",
      active: true,
      role: "STUDENT",
      adminRole: null,
      student: { id: "member" },
      employee: null,
    } as never);
    const session = await getServerSession();
    expect(session?.neiMember).toBe(true);
    expect(session?.attendanceExpiresAt).toBe(
      Math.min(44200000, attendanceExpiresAt ?? Infinity)
    );
  }
);

test.each([
  ["2026-11-17T09:06:00Z", true],
  ["2026-11-17T20:59:59Z", true],
  ["2026-11-17T21:00:00Z", false],
])(
  "attendance authorization at %s respects the 12-hour deadline",
  async (time, allowed) => {
    vi.mocked(verifyAppSession).mockReturnValue({
      sub: "member-sub",
      email: "member@example.org",
      employee: false,
      admin: false,
      neiMember: true,
      iat: Date.parse("2026-11-17T09:00:00Z") / 1000,
    });
    vi.mocked(findUserSessionByZitadelUserId).mockResolvedValue({
      id: "member",
      active: true,
      role: null,
      adminRole: null,
      student: null,
      employee: null,
    } as never);
    const session = await getServerSession();
    const spy = vi.spyOn(Date, "now").mockReturnValue(Date.parse(time));
    try {
      expect(passesAuthPolicy("staff", session)).toBe(allowed);
    } finally {
      spy.mockRestore();
    }
  }
);

test("an employee of an inactive company receives no application session", async () => {
  vi.mocked(verifyAppSession).mockReturnValue({
    sub: "blocked",
    employee: true,
    admin: false,
  } as never);
  vi.mocked(findUserSessionByZitadelUserId).mockResolvedValue({
    active: true,
    role: "EMPLOYEE",
    employee: { company: { active: false } },
  } as never);
  expect(await getServerSession()).toBeNull();
});

test("an inactive company does not remove an active global admin's management access", async () => {
  vi.mocked(verifyAppSession).mockReturnValue({
    sub: "admin-employee",
    employee: true,
    admin: true,
  } as never);
  vi.mocked(findUserSessionByZitadelUserId).mockResolvedValue({
    active: true,
    role: "EMPLOYEE",
    adminRole: "ADMIN",
    employee: { company: { active: false } },
  } as never);
  expect((await getServerSession())?.adminRole).toBe("ADMIN");
});
