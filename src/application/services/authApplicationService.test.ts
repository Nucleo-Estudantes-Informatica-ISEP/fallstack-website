import { beforeEach, expect, test, vi } from "vitest";

import { Email } from "@/types/Email";

import { findCompanyByInviteCodeHash } from "../repositories/companyInviteRepository";
import {
  deleteUser,
  findUserSessionByZitadelUserId,
  provisionZitadelUser,
} from "../repositories/userRepository";
import {
  completeZitadelSignIn,
  deleteUserAccount,
  setAuthUserBanned,
  signUpEmployee,
} from "./authApplicationService";
import { assignEmployeeRole, signAppSession } from "./zitadelAuthService";

vi.mock("server-only", () => ({}));
vi.mock("../repositories/companyInviteRepository", () => ({
  findCompanyByInviteCodeHash: vi.fn(),
}));
vi.mock("../repositories/companyRepository", () => ({
  createEmployee: vi.fn(),
}));
vi.mock("../repositories/transaction", () => ({
  withTransaction: vi.fn(async (callback) => callback({})),
}));
vi.mock("../repositories/userRepository", () => ({
  deleteUser: vi.fn(),
  findUserByEmail: vi.fn(),
  findUserSessionByZitadelUserId: vi.fn(),
  provisionZitadelUser: vi.fn(),
  setUserRole: vi.fn(),
}));
vi.mock("./zitadelAuthService", () => ({
  assignEmployeeRole: vi.fn(),
  signAppSession: vi.fn(() => "new-session"),
}));

const identity = {
  sub: "zitadel-user-1",
  email: "student@isep.ipp.pt",
  name: "Student",
  emailVerified: true,
  isEmployee: false,
  isGlobalAdmin: false,
};

beforeEach(() => {
  vi.clearAllMocks();
});

test("provisions a verified ZITADEL student and sends an incomplete profile to signup", async () => {
  vi.mocked(provisionZitadelUser).mockResolvedValue({
    id: "app-user-1",
    role: "STUDENT",
    student: null,
    employee: null,
  } as never);

  await expect(
    completeZitadelSignIn({ identity, fallback: "/" })
  ).resolves.toBe("/signup?authnei=1");

  expect(provisionZitadelUser).toHaveBeenCalledWith({
    zitadelUserId: identity.sub,
    email: Email.create(identity.email),
    name: identity.name,
    isEmployee: false,
    isGlobalAdmin: false,
  });
});

test("routes a returning employee to the dashboard", async () => {
  vi.mocked(provisionZitadelUser).mockResolvedValue({
    id: "app-user-1",
    role: "EMPLOYEE",
    student: null,
    employee: { id: "app-user-1", company: {} },
  } as never);

  await expect(
    completeZitadelSignIn({
      identity: { ...identity, isEmployee: true },
      fallback: "/",
    })
  ).resolves.toBe("/dashboard");
});

test("maps the NEI Global admin grant to the admin backoffice", async () => {
  vi.mocked(provisionZitadelUser).mockResolvedValue({
    id: "app-admin",
    role: null,
    student: null,
    employee: null,
  } as never);

  await expect(
    completeZitadelSignIn({
      identity: { ...identity, isGlobalAdmin: true },
      fallback: "/",
    })
  ).resolves.toBe("/overview");
});

test("preserves a sanitized requested destination after AuthNEI", async () => {
  vi.mocked(provisionZitadelUser).mockResolvedValue({
    id: "app-user-1",
    role: "STUDENT",
    student: null,
    employee: null,
  } as never);

  await expect(
    completeZitadelSignIn({ identity, fallback: "/login?modal=employee" })
  ).resolves.toBe("/login?modal=employee");
});

test("account deletion is app-local and does not touch the shared ZITADEL identity", async () => {
  await deleteUserAccount("app-user-1");
  expect(deleteUser).toHaveBeenCalledWith("app-user-1");
});

test("Fallstack deactivation does not ban the shared ZITADEL account", async () => {
  await expect(setAuthUserBanned("app-user-1", true)).resolves.toBeUndefined();
});

test("employee onboarding rejects an invalid company code before assigning a role", async () => {
  vi.mocked(findCompanyByInviteCodeHash).mockResolvedValue(null);

  await expect(
    signUpEmployee({
      userId: "app-user-1",
      zitadelUserId: "zitadel-user-1",
      email: Email.create("employee@example.com"),
      name: "Employee",
      companyCode: "fs_emp_invalid",
    })
  ).rejects.toThrow("Invalid company code");

  expect(assignEmployeeRole).not.toHaveBeenCalled();
});

test("employee onboarding assigns the project role and returns a refreshed app session", async () => {
  vi.mocked(findCompanyByInviteCodeHash).mockResolvedValue({
    id: "company-1",
  } as never);
  vi.mocked(findUserSessionByZitadelUserId).mockResolvedValue({
    id: "app-user-1",
    employee: null,
  } as never);

  await expect(
    signUpEmployee({
      userId: "app-user-1",
      zitadelUserId: "zitadel-user-1",
      email: Email.create("employee@example.com"),
      name: "Employee",
      companyCode: "fs_emp_12345678",
    })
  ).resolves.toBe("new-session");

  expect(assignEmployeeRole).toHaveBeenCalledWith("zitadel-user-1");
  expect(signAppSession).toHaveBeenCalledWith(
    expect.objectContaining({ isEmployee: true, sub: "zitadel-user-1" })
  );
});
