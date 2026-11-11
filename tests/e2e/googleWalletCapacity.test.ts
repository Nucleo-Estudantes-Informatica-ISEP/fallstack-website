// @vitest-environment node
import { generateKeyPairSync } from "node:crypto";
import { NextRequest } from "next/server";
import { afterAll, afterEach, expect, test, vi } from "vitest";

import { defineHandler } from "@/lib/http/server";
import prisma from "@/application/repositories/database";
import { deleteUserAccount } from "@/application/services/authApplicationService";
import { createGoogleWalletSaveUrl } from "@/application/services/googleWalletService";

import { databaseFixtures } from "./support/databaseFixtures";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "synthetic-session" }) }),
}));
vi.mock(
  "@/application/services/zitadelAuthService",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("@/application/services/zitadelAuthService")
    >()),
    verifyAppSession: () => ({
      sub: "synthetic-user",
      email: "test@example.test",
      employee: false,
      admin: false,
    }),
  })
);

const fixtures = databaseFixtures(prisma);
afterEach(async () => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  await fixtures.cleanup();
});
afterAll(() => prisma.$disconnect());

test("slow different-user Wallet saves leave request capacity and reject excess saves/deletions", async () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  vi.stubEnv("GOOGLE_WALLET_NEVER_ENABLED", "false");
  vi.stubEnv("GOOGLE_WALLET_ISSUER_ID", "123456789");
  vi.stubEnv("GOOGLE_WALLET_CLASS_ID", "123456789.capacity-test");
  vi.stubEnv(
    "GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_B64",
    Buffer.from(
      JSON.stringify({
        client_email: "wallet@example.test",
        private_key: privateKey.export({ type: "pkcs8", format: "pem" }),
      })
    ).toString("base64")
  );
  const limit = Number(process.env.PRISMA_CONNECTION_LIMIT || 3);
  const admitted = Math.min(2, limit - 1);
  const students = await Promise.all(
    Array.from({ length: admitted + 2 }, () => fixtures.student())
  );
  const excessSave = students[admitted];
  const accountToDelete = students[admitted + 1];
  let release!: () => void;
  let started!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const allStarted = new Promise<void>((resolve) => {
    started = resolve;
  });
  let holders = 0;
  const fetchMock = vi.fn<typeof fetch>(async (url, init) => {
    if (String(url) === "https://oauth2.googleapis.com/token")
      return Response.json({
        access_token: "synthetic-token",
        expires_in: 3600,
      });
    if (!init?.method) {
      if (++holders === admitted) started();
      await gate;
      return new Response(null, { status: 404 });
    }
    return Response.json({});
  });
  vi.stubGlobal("fetch", fetchMock);
  const saves = students.slice(0, admitted).map(createGoogleWalletSaveUrl);
  const settled = Promise.all(saves);
  try {
    if (admitted)
      await Promise.race([
        allStarted,
        settled.then(() => {
          throw new Error("Wallet saves ended before Google gate");
        }),
      ]);
    const calls = fetchMock.mock.calls.length;
    await expect(createGoogleWalletSaveUrl(excessSave)).rejects.toMatchObject({
      status: 429,
    });
    if (admitted)
      await expect(deleteUserAccount(accountToDelete.id)).rejects.toMatchObject(
        {
          status: 429,
        }
      );
    expect(fetchMock).toHaveBeenCalledTimes(calls);
    // Same real request pool, while Google I/O keeps the admitted transactions open.
    await expect(
      prisma.user.count({ where: { id: { in: students.map((s) => s.id) } } })
    ).resolves.toBe(students.length);
    await expect(
      prisma.walletPass.count({ where: { studentId: excessSave.id } })
    ).resolves.toBe(0);
  } finally {
    release();
    await settled;
  }
  if (admitted)
    await expect(createGoogleWalletSaveUrl(excessSave)).resolves.toMatch(
      /^https:\/\/pay\.google\.com\/gp\/v\/save\//
    );
  if (
    limit === 1 &&
    process.env.GOOGLE_WALLET_ALLOW_SINGLE_CONNECTION_DELETE !== "true"
  ) {
    await expect(deleteUserAccount(accountToDelete.id)).rejects.toMatchObject({
      status: 429,
    });
    await expect(
      prisma.user.findUnique({ where: { id: accountToDelete.id } })
    ).resolves.not.toBeNull();
  } else {
    await expect(
      deleteUserAccount(accountToDelete.id)
    ).resolves.toBeUndefined();
    await expect(
      prisma.user.findUnique({ where: { id: accountToDelete.id } })
    ).resolves.toBeNull();
  }
});

test.runIf(
  process.env.PRISMA_CONNECTION_LIMIT === "1" &&
    process.env.GOOGLE_WALLET_ALLOW_SINGLE_CONNECTION_DELETE === "true"
)(
  "one-slot deletion holds the pool during Google I/O",
  async () => {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    vi.stubEnv("GOOGLE_WALLET_NEVER_ENABLED", "false");
    vi.stubEnv("GOOGLE_WALLET_ISSUER_ID", "123456789");
    vi.stubEnv("GOOGLE_WALLET_CLASS_ID", "123456789.capacity-test");
    vi.stubEnv(
      "GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_B64",
      Buffer.from(
        JSON.stringify({
          client_email: "wallet@example.test",
          private_key: privateKey.export({ type: "pkcs8", format: "pem" }),
        })
      ).toString("base64")
    );
    const student = await fixtures.student();
    let release!: () => void;
    let started!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const held = new Promise<void>((resolve) => {
      started = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (url) => {
        if (String(url) === "https://oauth2.googleapis.com/token")
          return Response.json({
            access_token: "synthetic-token",
            expires_in: 3600,
          });
        started();
        await gate;
        return Response.json({});
      })
    );
    const pending = deleteUserAccount(student.id);
    void pending.catch(() => undefined);
    try {
      await Promise.race([
        held,
        pending.then(() => {
          throw new Error("Deletion ended before gate");
        }),
      ]);
      await expect(createGoogleWalletSaveUrl(student)).rejects.toMatchObject({
        status: 429,
      });
      await expect(prisma.user.count()).rejects.toMatchObject({
        code: "P2024",
      });
      const handler = defineHandler({
        handler: () => new Response(null, { status: 204 }),
      });
      const response = await handler(new NextRequest("http://localhost/test"), {
        params: Promise.resolve({}),
      });
      expect(response.status).toBe(401);
    } finally {
      release();
      await pending;
    }
    await expect(
      prisma.user.findUnique({ where: { id: student.id } })
    ).resolves.toBeNull();
  },
  15000
);
