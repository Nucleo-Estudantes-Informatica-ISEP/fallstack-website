// @vitest-environment node
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeEach, expect, test, vi } from "vitest";

import { DELETE } from "@/app/api/admin/students/[id]/route";
import prisma from "@/application/repositories/database";
import { deleteUserAccount } from "@/application/services/authApplicationService";
import { createGoogleWalletSaveUrl } from "@/application/services/googleWalletService";

import { databaseFixtures } from "./support/databaseFixtures";

const config = vi.hoisted(() => ({
  GOOGLE_WALLET_NEVER_ENABLED: false,
  GOOGLE_WALLET_ISSUER_ID: "123456789" as string | undefined,
  GOOGLE_WALLET_CLASS_ID: "123456789.old" as string | undefined,
  GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_B64: "" as string | undefined,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/config/env.server", () => ({ serverEnv: config }));
vi.mock("jsonwebtoken", () => ({ default: { sign: () => "test-jwt" } }));
vi.mock("@/application/services/sessionService", () => ({
  default: async () => ({ adminRole: "ADMIN" }),
}));
const fixtures = databaseFixtures(prisma);
let objects: Map<string, Record<string, unknown>>;
let denyRevoke = false;
let denyIssue = false;

beforeEach(() => {
  config.GOOGLE_WALLET_NEVER_ENABLED = false;
  config.GOOGLE_WALLET_ISSUER_ID = "123456789";
  config.GOOGLE_WALLET_CLASS_ID = "123456789.old";
  config.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_B64 = Buffer.from(
    JSON.stringify({
      client_email: "test@example.com",
      private_key: "test-key",
    })
  ).toString("base64");
  objects = new Map();
  denyRevoke = false;
  denyIssue = false;
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>().mockImplementation(async (url, init) => {
      const path = new URL(String(url)).pathname;
      if (path === "/token")
        return Response.json({ access_token: "test-token", expires_in: 3600 });
      if (path.includes("/genericClass/")) return Response.json({});
      const id = decodeURIComponent(path.split("/").at(-1)!);
      if (init?.method === "POST") {
        if (denyIssue) return new Response(null, { status: 503 });
        const body = JSON.parse(String(init.body));
        objects.set(body.id, body);
        return Response.json(body);
      }
      if (init?.method === "PATCH") {
        const body = JSON.parse(String(init.body));
        if (body.state === "EXPIRED" && denyRevoke)
          return new Response(null, { status: 503 });
        if (!objects.has(id)) return new Response(null, { status: 404 });
        objects.set(id, { ...objects.get(id), ...body });
        return Response.json({});
      }
      return objects.has(id)
        ? Response.json(objects.get(id))
        : new Response(null, { status: 404 });
    })
  );
});
afterEach(async () => {
  vi.unstubAllGlobals();
  await fixtures.cleanup();
});
afterAll(() => prisma.$disconnect());

function request(id: string) {
  return DELETE(
    new NextRequest(`http://localhost/api/admin/students/${id}`, {
      method: "DELETE",
    }),
    { params: Promise.resolve({ id }) }
  );
}

test("actual route retains account/pass on Google failure, then revokes recorded old class after rotation", async () => {
  const student = await fixtures.student();
  await createGoogleWalletSaveUrl(student);
  const marker = await prisma.walletPass.findUniqueOrThrow({
    where: { studentId: student.id },
  });
  config.GOOGLE_WALLET_CLASS_ID = "123456789.new";
  denyRevoke = true;
  let response = await request(student.id);
  expect(response.status).toBe(502);
  expect(await response.json()).toEqual({
    error: "Unable to revoke Google Wallet pass. Retry account deletion.",
  });
  expect(await prisma.user.count({ where: { id: student.id } })).toBe(1);
  expect(
    await prisma.walletPass.count({ where: { studentId: student.id } })
  ).toBe(1);
  expect(objects.get(marker.objectId)?.state).toBe("ACTIVE");
  denyRevoke = false;
  response = await request(student.id);
  expect(response.status).toBe(204);
  expect(await response.text()).toBe("");
  expect(objects.get(marker.objectId)).toMatchObject({
    state: "EXPIRED",
    barcode: { value: "REVOKED" },
  });
  expect(await prisma.user.count({ where: { id: student.id } })).toBe(0);
  expect(
    await prisma.walletPass.count({ where: { studentId: student.id } })
  ).toBe(0);
});

test("actual route maps missing configuration and refuses mistaken opt-out after durable issuance", async () => {
  const student = await fixtures.student();
  denyIssue = true;
  await expect(createGoogleWalletSaveUrl(student)).rejects.toMatchObject({
    status: 502,
  });
  expect(
    await prisma.walletPass.count({ where: { studentId: student.id } })
  ).toBe(1);
  config.GOOGLE_WALLET_ISSUER_ID = undefined;
  config.GOOGLE_WALLET_CLASS_ID = undefined;
  config.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_B64 = undefined;
  let response = await request(student.id);
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({
    error: "Google Wallet is not configured",
  });
  config.GOOGLE_WALLET_NEVER_ENABLED = true;
  response = await request(student.id);
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({
    error:
      "Google Wallet has recorded issuance; restore credentials before deleting this account",
  });
  expect(await prisma.user.count({ where: { id: student.id } })).toBe(1);
});

test("real delete FK failure retains account/marker; reissue restores pass and deletion retry succeeds", async () => {
  const student = await fixtures.student();
  await createGoogleWalletSaveUrl(student);
  const marker = await prisma.walletPass.findUniqueOrThrow({
    where: { studentId: student.id },
  });
  await prisma.$executeRaw`CREATE TABLE "WalletDeletionTestGuard" ("userId" UUID REFERENCES "User"(id) ON DELETE RESTRICT)`;
  try {
    await prisma.$executeRaw`INSERT INTO "WalletDeletionTestGuard" VALUES (${student.id}::uuid)`;
    await expect(deleteUserAccount(student.id)).rejects.toMatchObject({
      code: "P2003",
    });
    expect(await prisma.user.count({ where: { id: student.id } })).toBe(1);
    expect(
      await prisma.walletPass.count({ where: { studentId: student.id } })
    ).toBe(1);
    expect(objects.get(marker.objectId)?.state).toBe("EXPIRED");
    await createGoogleWalletSaveUrl(student);
    expect(objects.get(marker.objectId)).toMatchObject({
      state: "ACTIVE",
      barcode: { value: student.code },
    });
    await prisma.$executeRaw`DELETE FROM "WalletDeletionTestGuard"`;
    await deleteUserAccount(student.id);
    expect(objects.get(marker.objectId)?.state).toBe("EXPIRED");
    expect(await prisma.user.count({ where: { id: student.id } })).toBe(0);
  } finally {
    await prisma.$executeRaw`DROP TABLE "WalletDeletionTestGuard"`;
  }
});
