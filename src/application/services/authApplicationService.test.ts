import { beforeEach, expect, test, vi } from "vitest";

import { Email } from "@/types/Email";
import { createAdminClient } from "@/utils/supabase/admin";

import {
  deleteUser,
  findUserSessionByEmail,
  findUserSessionById,
  relinkUserId,
  upsertUser,
} from "../repositories/userRepository";
import {
  completeOAuthSignIn,
  deleteUserAccount,
  setAuthUserBanned,
} from "./authApplicationService";

vi.mock("server-only", () => ({}));
vi.mock("../repositories/userRepository", () => ({
  findUserSessionById: vi.fn(),
  findUserSessionByEmail: vi.fn(),
  relinkUserId: vi.fn(),
  deleteUser: vi.fn(),
  upsertUser: vi.fn(),
}));
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

const email = Email.create("student@isep.ipp.pt");
const deleteAuthUser = vi.fn();
const getUserById = vi.fn();
const updateUserById = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findUserSessionById).mockResolvedValue(null);
  vi.mocked(findUserSessionByEmail).mockResolvedValue(null);
  vi.mocked(createAdminClient).mockReturnValue({
    auth: {
      admin: { deleteUser: deleteAuthUser, getUserById, updateUserById },
    },
  } as never);
  deleteAuthUser.mockResolvedValue({ data: {}, error: null });
  updateUserById.mockResolvedValue({ data: {}, error: null });
  // Confirmed by default - individual tests override for the unconfirmed path.
  getUserById.mockResolvedValue({
    data: { user: { email_confirmed_at: "2026-01-01T00:00:00Z" } },
    error: null,
  });
});

test("routes an existing student with a profile to their student page", async () => {
  vi.mocked(findUserSessionById).mockResolvedValue({
    id: "auth-id-1",
    role: "STUDENT",
    adminRole: null,
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
    adminRole: null,
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
    adminRole: null,
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
  expect(deleteUser).not.toHaveBeenCalled();
  expect(destination).toBe("/signup");
});

test("re-keys a confirmed existing password-account student found by email to the new AuthNEI id", async () => {
  vi.mocked(findUserSessionByEmail).mockResolvedValue({
    id: "old-password-id",
    role: "STUDENT",
    adminRole: null,
    student: { id: "old-password-id", code: "S456", name: "Bea" },
    employee: null,
  } as never);

  const destination = await completeOAuthSignIn({
    id: "new-authnei-id",
    email,
    fallback: "/signup",
  });

  expect(findUserSessionByEmail).toHaveBeenCalledWith(email);
  expect(getUserById).toHaveBeenCalledWith("old-password-id");
  expect(relinkUserId).toHaveBeenCalledWith(
    "old-password-id",
    "new-authnei-id"
  );
  expect(deleteUser).not.toHaveBeenCalled();
  expect(upsertUser).not.toHaveBeenCalled();
  expect(destination).toBe("/student/S456");
});

test("re-keys a confirmed existing password-account employee found by email to the dashboard", async () => {
  vi.mocked(findUserSessionByEmail).mockResolvedValue({
    id: "old-password-id",
    role: "EMPLOYEE",
    adminRole: null,
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

test("discards an unconfirmed dangling account found by email instead of relinking onto it", async () => {
  vi.mocked(findUserSessionByEmail).mockResolvedValue({
    id: "spoofed-id",
    role: "STUDENT",
    adminRole: null,
    student: { id: "spoofed-id", code: "S999", name: "Attacker-planted" },
    employee: null,
  } as never);
  getUserById.mockResolvedValue({
    data: { user: { email_confirmed_at: undefined } },
    error: null,
  });

  const destination = await completeOAuthSignIn({
    id: "new-authnei-id",
    email,
    fallback: "/signup",
  });

  expect(deleteAuthUser).toHaveBeenCalledWith("spoofed-id");
  expect(deleteUser).toHaveBeenCalledWith("spoofed-id");
  expect(relinkUserId).not.toHaveBeenCalled();
  expect(upsertUser).toHaveBeenCalledWith({
    id: "new-authnei-id",
    email,
    role: "STUDENT",
  });
  expect(destination).toBe("/signup");
});

test("deletes Supabase Auth before the matching application user", async () => {
  await deleteUserAccount("user-1");

  expect(deleteAuthUser).toHaveBeenCalledWith("user-1");
  expect(deleteUser).toHaveBeenCalledWith("user-1");
  expect(deleteAuthUser.mock.invocationCallOrder[0]).toBeLessThan(
    vi.mocked(deleteUser).mock.invocationCallOrder[0]
  );
});

test("keeps the application user when Supabase Auth deletion fails", async () => {
  deleteAuthUser.mockResolvedValue({
    data: null,
    error: new Error("network error"),
  });

  await expect(deleteUserAccount("user-1")).rejects.toThrow("network error");
  expect(deleteUser).not.toHaveBeenCalled();
});

test("deletes an application user whose Supabase Auth identity is already missing", async () => {
  deleteAuthUser.mockResolvedValue({
    data: null,
    error: Object.assign(new Error("User not found"), {
      code: "user_not_found",
    }),
  });

  await deleteUserAccount("user-1");

  expect(deleteUser).toHaveBeenCalledWith("user-1");
});

test("uses a stable message for opaque Supabase Auth deletion errors", async () => {
  deleteAuthUser.mockResolvedValue({
    data: null,
    error: new Error("{}"),
  });

  await expect(deleteUserAccount("user-1")).rejects.toThrow(
    "Unable to delete account"
  );
});

test("still provisions a verified identity when spoofed Auth cleanup fails", async () => {
  vi.mocked(findUserSessionByEmail).mockResolvedValue({
    id: "spoofed-id",
    role: "STUDENT",
    adminRole: null,
    student: null,
    employee: null,
  } as never);
  getUserById.mockResolvedValue({
    data: { user: { email_confirmed_at: undefined } },
    error: null,
  });
  deleteAuthUser.mockResolvedValue({
    data: null,
    error: new Error("network error"),
  });

  await expect(
    completeOAuthSignIn({
      id: "new-authnei-id",
      email,
      fallback: "/signup",
    })
  ).resolves.toBe("/signup");
  expect(deleteUser).toHaveBeenCalledWith("spoofed-id");
  expect(upsertUser).toHaveBeenCalledWith({
    id: "new-authnei-id",
    email,
    role: "STUDENT",
  });
});

test("fails closed (treats as unconfirmed) when the admin lookup errors", async () => {
  vi.mocked(findUserSessionByEmail).mockResolvedValue({
    id: "old-password-id",
    role: "STUDENT",
    adminRole: null,
    student: null,
    employee: null,
  } as never);
  getUserById.mockResolvedValue({
    data: { user: null },
    error: new Error("network error"),
  });

  await completeOAuthSignIn({
    id: "new-authnei-id",
    email,
    fallback: "/signup",
  });

  expect(deleteUser).toHaveBeenCalledWith("old-password-id");
  expect(relinkUserId).not.toHaveBeenCalled();
});

test("setAuthUserBanned(true) sets a long ban_duration", async () => {
  await setAuthUserBanned("user-1", true);

  expect(updateUserById).toHaveBeenCalledWith("user-1", {
    ban_duration: "876000h",
  });
});

test("setAuthUserBanned(false) clears the ban", async () => {
  await setAuthUserBanned("user-1", false);

  expect(updateUserById).toHaveBeenCalledWith("user-1", {
    ban_duration: "none",
  });
});

test("setAuthUserBanned doesn't throw if the Supabase call errors", async () => {
  updateUserById.mockResolvedValue({
    data: null,
    error: new Error("network error"),
  });

  await expect(setAuthUserBanned("user-1", true)).resolves.toBeUndefined();
});
