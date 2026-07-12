import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => readFile(path.join(root, file), "utf8");

test("password recovery has one Supabase Auth flow", async () => {
  const [schema, requestRoute, confirmPage, migration] = await Promise.all([
    read("prisma/schema.prisma"),
    read("src/app/api/auth/password-reset/route.ts"),
    read("src/app/(auth)/password-reset/confirm/page.tsx"),
    read(
      "prisma/migrations/20260712190000_drop_password_reset_token/migration.sql"
    ),
  ]);

  assert.doesNotMatch(schema, /PasswordResetToken/);
  assert.match(migration, /DROP TABLE IF EXISTS "PasswordResetToken"/);
  assert.match(requestRoute, /auth\.resetPasswordForEmail/);
  assert.doesNotMatch(requestRoute, /exchangeCodeForSession|auth\.updateUser/);
  assert.match(confirmPage, /auth\.updateUser/);
  assert.doesNotMatch(confirmPage, /verifyOtp|exchangeCodeForSession/);
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
