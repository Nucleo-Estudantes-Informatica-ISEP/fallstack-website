import { expect, test, vi } from "vitest";

import {
  databaseEnvSchema,
  runtimeDatabaseUrl,
  singleConnectionDatabaseUrl,
} from "./env.database";

vi.mock("server-only", () => ({}));

const base = "postgresql://runtime:secret@localhost:5432/test?schema=fallstack";

test("runtime settings bound pools without modifying migration identity", () => {
  const env = {
    DATABASE_URL: base,
    DIRECT_URL: "postgresql://migrator:secret@localhost/test",
  };
  const url = new URL(runtimeDatabaseUrl(env)!);
  expect(url.username).toBe("runtime");
  expect(url.searchParams.get("schema")).toBe("fallstack");
  expect(url.searchParams.get("connection_limit")).toBe("3");
  expect(url.searchParams.get("pool_timeout")).toBe("5");
  expect(env.DIRECT_URL).toBe("postgresql://migrator:secret@localhost/test");
});

test("worker override replaces duplicate and stale URL pool settings", () => {
  const url = new URL(
    runtimeDatabaseUrl({
      DATABASE_URL:
        base + "&connection_limit=99&connection_limit=20&pool_timeout=0",
      PRISMA_CONNECTION_LIMIT: "1",
      PRISMA_POOL_TIMEOUT_SECONDS: "2",
    })!
  );
  expect(url.searchParams.getAll("connection_limit")).toEqual(["1"]);
  expect(url.searchParams.getAll("pool_timeout")).toEqual(["2"]);
});

test.each(["0", "4", "1.5", "", "bad"])(
  "rejects unsafe pool size %s",
  (value) => {
    expect(
      databaseEnvSchema.safeParse({ PRISMA_CONNECTION_LIMIT: value }).success
    ).toBe(false);
  }
);

test.each(["0", "11", "bad"])(
  "rejects unbounded or invalid wait %s",
  (value) => {
    expect(
      databaseEnvSchema.safeParse({ PRISMA_POOL_TIMEOUT_SECONDS: value })
        .success
    ).toBe(false);
  }
);

test("build imports need no database; malformed URLs do not leak secrets", () => {
  expect(runtimeDatabaseUrl({})).toBeUndefined();
  expect(() =>
    runtimeDatabaseUrl({
      DATABASE_URL: "https://runtime:secret@localhost/test",
    })
  ).toThrow("Invalid PostgreSQL runtime URL");
});

test("standalone jobs and readiness always use one finite-wait connection", () => {
  const url = new URL(
    singleConnectionDatabaseUrl({
      DATABASE_URL: base + "&connection_limit=99&pool_timeout=0",
      PRISMA_CONNECTION_LIMIT: "3",
      PRISMA_POOL_TIMEOUT_SECONDS: "10",
    })!
  );
  expect(url.searchParams.getAll("connection_limit")).toEqual(["1"]);
  expect(url.searchParams.getAll("pool_timeout")).toEqual(["5"]);
  expect(url.username).toBe("runtime");
  expect(url.searchParams.get("schema")).toBe("fallstack");
});
