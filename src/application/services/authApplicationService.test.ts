import { beforeEach, expect, test, vi } from "vitest";

import { Email } from "@/types/Email";

import {
  findUserSessionByEmail,
  findUserSessionById,
  relinkUserId,
  upsertUser,
} from "../repositories/userRepository";
import { completeOAuthSignIn } from "./authApplicationService";

vi.mock("server-only", () => ({}));
vi.mock("../repositories/userRepository", () => ({
  findUserSessionById: vi.fn(),
  findUserSessionByEmail: vi.fn(),
  relinkUserId: vi.fn(),
  upsertUser: vi.fn(),
}));

const email = Email.create("student@isep.ipp.pt");

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findUserSessionById).mockResolvedValue(null);
  vi.mocked(findUserSessionByEmail).mockResolvedValue(null);
});

test("routes an existing student with a profile to their student page", async () => {
  vi.mocked(findUserSessionById).mockResolvedValue({
    id: "auth-id-1",
    role: "STUDENT",
    isAdmin: false,
    student: { id: "auth-id-1", code: "S123", name: "Ana" },
    employee: null,
  } as never);

  const destination = await completeOAuthSignIn({
    id: "auth-id-1",
    email,
    fallback: "/signup",
  });

  expect(destination).toBe("/student/S123");
  expect(upsertUser).not.toHaveBeenCalled();
  expect(relinkUserId).not.toHaveBeenCalled();
});

test("routes an existing employee to the dashboard", async () => {
  vi.mocked(findUserSessionById).mockResolvedValue({
    id: "auth-id-1",
    role: "EMPLOYEE",
    isAdmin: false,
    student: null,
    employee: { id: "auth-id-1", name: "Rui", companyId: "c1", company: {} },
  } as never);

  const destination = await completeOAuthSignIn({
    id: "auth-id-1",
    email,
    fallback: "/signup",
  });

  expect(destination).toBe("/dashboard");
});

test("falls back to the wizard for a STUDENT role with no profile yet", async () => {
  vi.mocked(findUserSessionById).mockResolvedValue({
    id: "auth-id-1",
    role: "STUDENT",
    isAdmin: false,
    student: null,
    employee: null,
  } as never);

  const destination = await completeOAuthSignIn({
    id: "auth-id-1",
    email,
    fallback: "/signup?next=1",
  });

  expect(destination).toBe("/signup?next=1");
});

test("provisions a brand-new identity when no account exists by id or email", async () => {
  const destination = await completeOAuthSignIn({
    id: "auth-id-new",
    email,
    fallback: "/signup",
  });

  expect(upsertUser).toHaveBeenCalledWith({
    id: "auth-id-new",
    email,
    role: "STUDENT",
  });
  expect(relinkUserId).not.toHaveBeenCalled();
  expect(destination).toBe("/signup");
});

test("re-keys an existing password-account student found by email to the new AuthNEI id", async () => {
  vi.mocked(findUserSessionByEmail).mockResolvedValue({
    id: "old-password-id",
    role: "STUDENT",
    isAdmin: false,
    student: { id: "old-password-id", code: "S456", name: "Bea" },
    employee: null,
  } as never);

  const destination = await completeOAuthSignIn({
    id: "new-authnei-id",
    email,
    fallback: "/signup",
  });

  expect(findUserSessionByEmail).toHaveBeenCalledWith(email);
  expect(relinkUserId).toHaveBeenCalledWith(
    "old-password-id",
    "new-authnei-id"
  );
  expect(upsertUser).not.toHaveBeenCalled();
  expect(destination).toBe("/student/S456");
});

test("re-keys an existing password-account employee found by email to the dashboard", async () => {
  vi.mocked(findUserSessionByEmail).mockResolvedValue({
    id: "old-password-id",
    role: "EMPLOYEE",
    isAdmin: false,
    student: null,
    employee: {
      id: "old-password-id",
      name: "Rui",
      companyId: "c1",
      company: {},
    },
  } as never);

  const destination = await completeOAuthSignIn({
    id: "new-authnei-id",
    email,
    fallback: "/signup",
  });

  expect(relinkUserId).toHaveBeenCalledWith(
    "old-password-id",
    "new-authnei-id"
  );
  expect(destination).toBe("/dashboard");
});
