// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, expect, test, vi } from "vitest";

import prisma from "./database";
import { consumeOidcRestart, saveOidcRestart } from "./oidcRestartRepository";

vi.mock("server-only", () => ({}));

const tokens = [randomUUID(), randomUUID(), randomUUID()];
afterAll(async () => {
  await prisma.oidcRestartDestination.deleteMany({
    where: { token: { in: tokens } },
  });
});

test("stores separate attempts, consumes once, and refuses expired records", async () => {
  const destination = "/event?filter=" + "x".repeat(5000);
  await saveOidcRestart(tokens[0], destination);
  await saveOidcRestart(tokens[1], "/other");
  await prisma.oidcRestartDestination.create({
    data: {
      token: tokens[2],
      destination: "/expired",
      expiresAt: new Date(Date.now() - 1000),
    },
  });
  expect(await consumeOidcRestart(tokens[2])).toBeUndefined();
  expect(await consumeOidcRestart(tokens[0])).toBe(destination);
  expect(await consumeOidcRestart(tokens[0])).toBeUndefined();
  expect(await consumeOidcRestart(tokens[1])).toBe("/other");
});
