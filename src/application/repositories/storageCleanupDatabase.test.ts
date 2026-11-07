import { expect, test, vi } from "vitest";

const prismaClient = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("@prisma/client", () => ({ PrismaClient: prismaClient }));

test("cleanup client is pinned to one connection even when the env allows more", async () => {
  vi.stubEnv("DATABASE_URL", "postgresql://u:p@db.example:5432/app");
  vi.stubEnv("PRISMA_CONNECTION_LIMIT", "3");

  await import("./storageCleanupDatabase");

  const { datasourceUrl } = prismaClient.mock.calls[0][0];
  expect(new URL(datasourceUrl).searchParams.get("connection_limit")).toBe("1");
});
