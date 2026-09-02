import { expect, test, type APIRequestContext } from "@playwright/test";

import { e2eEnv } from "../env";
import {
  createRoleContext,
  hasStorageStateFor,
  type Role,
} from "../roleTestUtils";

async function call(
  context: APIRequestContext,
  method: "get" | "post" | "patch",
  path: string
) {
  switch (method) {
    case "get":
      return context.get(path);
    case "post":
      return context.post(path);
    case "patch":
      return context.patch(path);
  }
}

// Auth checks in defineHandler run before any body parsing or params
// lookup (see lib/http/server.ts), so these calls never need a valid
// body or a real resource id: the 401/403 fires before the handler runs,
// making every case here inherently non-destructive and rerun-safe.
const cases: Array<{
  name: string;
  role: Role;
  method: "get" | "post" | "patch";
  path: string;
  expectedStatus: number;
}> = [
  {
    name: "unauthenticated request to a session-only endpoint is rejected",
    role: "anonymous",
    method: "get",
    path: "/api/user",
    expectedStatus: 401,
  },
  {
    name: "unauthenticated request to an employee-only endpoint is rejected",
    role: "anonymous",
    method: "post",
    path: "/api/saved",
    expectedStatus: 401,
  },
  {
    name: "student cannot perform an employee-only scan action",
    role: "student",
    method: "post",
    path: "/api/saved",
    expectedStatus: 403,
  },
  {
    name: "student cannot access admin-only data",
    role: "student",
    method: "get",
    path: "/api/admin/students",
    expectedStatus: 403,
  },
  {
    name: "employee cannot toggle admin-only action state",
    role: "employee",
    method: "patch",
    path: "/api/actions/non-existent-id",
    expectedStatus: 403,
  },
  {
    name: "admin cannot perform super-admin-only account management",
    role: "admin",
    method: "get",
    path: "/api/admin/admins",
    expectedStatus: 403,
  },
];

test.describe("role boundaries", () => {
  test.skip(
    !e2eEnv.confirmNonProduction,
    "Set CONFIRM_NON_PRODUCTION=yes; never run authenticated event tests against production."
  );

  for (const testCase of cases) {
    test(testCase.name, async () => {
      test.skip(
        !hasStorageStateFor(testCase.role),
        `Set the storage-state env var for role "${testCase.role}" to run this check.`
      );

      const context = await createRoleContext(testCase.role);
      try {
        const response = await call(context, testCase.method, testCase.path);
        expect(response.status()).toBe(testCase.expectedStatus);
      } finally {
        await context.dispose();
      }
    });
  }

  // Positive control: confirms the role hierarchy itself, not just
  // rejection — a SUPER_ADMIN account must still pass an "admin" policy
  // check (adminRole !== null covers both ADMIN and SUPER_ADMIN).
  test("super admin retains admin-level access (role hierarchy sanity check)", async () => {
    test.skip(
      !e2eEnv.superAdminStorageState,
      "Set E2E_SUPER_ADMIN_STORAGE_STATE to run this check."
    );

    const context = await createRoleContext("superadmin");
    try {
      const response = await context.get("/api/admin/actions");
      expect(response.status()).toBe(200);
    } finally {
      await context.dispose();
    }
  });
});
