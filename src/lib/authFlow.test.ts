import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "vitest";

const root = process.cwd();
const read = (file: string) => readFile(path.join(root, file), "utf8");

test("authentication and password recovery no longer depend on Supabase Auth", async () => {
  const [schema, loginRoute, passwordResetRoute, confirmPage, legacyConfirmRoute] =
    await Promise.all([
      read("prisma/schema.prisma"),
      read("src/app/api/auth/login/route.ts"),
      read("src/app/api/auth/password-reset/route.ts"),
      read("src/app/(auth)/password-reset/confirm/page.tsx"),
      read("src/app/auth/confirm/route.ts"),
    ]);

  assert.match(schema, /zitadelUserId\s+String\?\s+@unique/);

  assert.match(loginRoute, /createAuthorizationRequest/);
  assert.doesNotMatch(loginRoute, /supabase|signInWithPassword|signInWithOAuth/i);

  assert.match(passwordResetRoute, /Passwords are managed by AuthNEI/);
  assert.match(passwordResetRoute, /\/api\/auth\/login/);
  assert.doesNotMatch(
    passwordResetRoute,
    /resetPasswordForEmail|exchangeCodeForSession|auth\.updateUser/
  );

  assert.match(confirmPage, /AuthNEI/);
  assert.doesNotMatch(confirmPage, /supabase|verifyOtp|auth\.updateUser/i);

  assert.match(legacyConfirmRoute, /NextResponse\.redirect/);
  assert.doesNotMatch(legacyConfirmRoute, /supabase|verifyOtp|exchangeCodeForSession/i);

  for (const legacyPath of [
    "src/app/(admin)/change-password/page.tsx",
    "src/app/api/auth/password-change/route.ts",
    "src/components/ChangePasswordForm/index.tsx",
  ]) {
    await assert.rejects(access(path.join(root, legacyPath)), {
      code: "ENOENT",
    });
  }
});
