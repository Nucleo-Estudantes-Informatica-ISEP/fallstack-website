import { beforeEach, expect, test, vi } from "vitest";

import { consumeCvUpload } from "./cvUploadRepository";
import type { DbClient } from "./database";

vi.mock("server-only", () => ({}));

const now = new Date("2026-11-15T12:00:00Z");

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
});

test("throws 400 when ticket does not exist or status is not ready/attached", async () => {
  const db = {
    cvUpload: { findFirst: vi.fn().mockResolvedValue(null) },
  } as unknown as DbClient;

  await expect(consumeCvUpload("owner", "cv-1", db)).rejects.toMatchObject({
    status: 400,
    message: "Invalid CV upload id",
  });

  const pendingDb = {
    cvUpload: {
      findFirst: vi.fn().mockResolvedValue({ status: "pending" }),
    },
  } as unknown as DbClient;

  await expect(
    consumeCvUpload("owner", "cv-1", pendingDb)
  ).rejects.toMatchObject({
    status: 400,
    message: "Invalid CV upload id",
  });
});

test("locks student row when $queryRaw is supported", async () => {
  const $queryRaw = vi.fn().mockResolvedValue([]);
  const db = {
    $queryRaw,
    cvUpload: {
      findFirst: vi.fn().mockResolvedValue({
        id: "ticket-1",
        status: "ready",
        createdAt: now,
      }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    student: {
      findUnique: vi.fn().mockResolvedValue({ cv: null }),
    },
  } as unknown as DbClient;

  const attached = await consumeCvUpload("owner", "cv-1", db);
  expect(attached).toBe(true);
  expect($queryRaw).toHaveBeenCalled();
});

test("replaying an attached ticket with matching profile CV returns false idempotently", async () => {
  const db = {
    cvUpload: {
      findFirst: vi.fn().mockResolvedValue({
        id: "ticket-1",
        status: "attached",
        createdAt: now,
      }),
    },
    student: {
      findUnique: vi.fn().mockResolvedValue({ cv: "cv-1" }),
    },
  } as unknown as DbClient;

  const result = await consumeCvUpload("owner", "cv-1", db);
  expect(result).toBe(false);
});

test("replaying an attached ticket when profile has a different CV throws 409", async () => {
  const db = {
    cvUpload: {
      findFirst: vi.fn().mockResolvedValue({
        id: "ticket-1",
        status: "attached",
        createdAt: now,
      }),
    },
    student: {
      findUnique: vi.fn().mockResolvedValue({ cv: "other-cv" }),
    },
  } as unknown as DbClient;

  await expect(consumeCvUpload("owner", "cv-1", db)).rejects.toMatchObject({
    status: 409,
    message: "CV upload already consumed",
  });
});

test("throws 410 when ticket createdAt exceeds 24h expiration window", async () => {
  const db = {
    cvUpload: {
      findFirst: vi.fn().mockResolvedValue({
        id: "ticket-1",
        status: "ready",
        createdAt: new Date(now.getTime() - 25 * 60 * 60 * 1000),
      }),
    },
    student: {
      findUnique: vi.fn().mockResolvedValue({ cv: null }),
    },
  } as unknown as DbClient;

  await expect(consumeCvUpload("owner", "cv-1", db)).rejects.toMatchObject({
    status: 410,
    message: "CV upload expired",
  });
});

test("fences out older tickets when student profile already has a newer ticket attached", async () => {
  const ticketA = {
    id: "ticket-A",
    seq: 1,
    status: "ready",
    createdAt: new Date("2026-11-15T10:00:00Z"),
  };
  const ticketB = {
    id: "ticket-B",
    seq: 2,
    status: "attached",
    createdAt: new Date("2026-11-15T10:30:00Z"),
  };

  const updateMany = vi.fn();
  const db = {
    cvUpload: {
      findFirst: vi
        .fn()
        .mockImplementation(async ({ where }: { where: { cvId: string } }) => {
          if (where.cvId === "cv-A") return ticketA;
          if (where.cvId === "cv-B") return ticketB;
          return null;
        }),
      updateMany,
    },
    student: {
      findUnique: vi.fn().mockResolvedValue({ cv: "cv-B" }),
    },
  } as unknown as DbClient;

  // Finalizing older ticket A while profile already holds newer ticket B
  const attached = await consumeCvUpload("owner", "cv-A", db);
  expect(attached).toBe(false);
  expect(updateMany).not.toHaveBeenCalled();
});

test("allows newer ticket to supersede older attached profile CV", async () => {
  const ticketA = {
    id: "ticket-A",
    seq: 1,
    status: "attached",
    createdAt: new Date("2026-11-15T10:00:00Z"),
  };
  const ticketB = {
    id: "ticket-B",
    seq: 2,
    status: "ready",
    createdAt: new Date("2026-11-15T10:30:00Z"),
  };

  const updateMany = vi.fn().mockResolvedValue({ count: 1 });
  const db = {
    cvUpload: {
      findFirst: vi
        .fn()
        .mockImplementation(async ({ where }: { where: { cvId: string } }) => {
          if (where.cvId === "cv-B") return ticketB;
          if (where.cvId === "cv-A") return ticketA;
          return null;
        }),
      updateMany,
    },
    student: {
      findUnique: vi.fn().mockResolvedValue({ cv: "cv-A" }),
    },
  } as unknown as DbClient;

  const attached = await consumeCvUpload("owner", "cv-B", db);
  expect(attached).toBe(true);
  expect(updateMany).toHaveBeenCalledWith({
    where: { id: "ticket-B", status: "ready" },
    data: { status: "attached" },
  });
});

test("allows replacement ticket with equal timestamp and higher sequence to supersede attached ticket", async () => {
  const equalDate = new Date("2026-11-15T10:00:00Z");
  // ticketA has higher string ID ("z-ticket") but lower sequence (1)
  const ticketA = {
    id: "z-ticket",
    seq: 1,
    status: "attached",
    createdAt: equalDate,
  };
  // ticketB has lower string ID ("a-ticket") but higher sequence (2)
  const ticketB = {
    id: "a-ticket",
    seq: 2,
    status: "ready",
    createdAt: equalDate,
  };

  const updateMany = vi.fn().mockResolvedValue({ count: 1 });
  const db = {
    cvUpload: {
      findFirst: vi
        .fn()
        .mockImplementation(async ({ where }: { where: { cvId: string } }) => {
          if (where.cvId === "cv-2") return ticketB;
          if (where.cvId === "cv-1") return ticketA;
          return null;
        }),
      updateMany,
    },
    student: {
      findUnique: vi.fn().mockResolvedValue({ cv: "cv-1" }),
    },
  } as unknown as DbClient;

  const attached = await consumeCvUpload("owner", "cv-2", db);
  expect(attached).toBe(true);
  expect(updateMany).toHaveBeenCalledWith({
    where: { id: "a-ticket", status: "ready" },
    data: { status: "attached" },
  });
});

test("fences out older ticket with equal timestamp and lower sequence when higher sequence is attached", async () => {
  const equalDate = new Date("2026-11-15T10:00:00Z");
  // ticketA has higher string ID ("z-ticket") but lower sequence (1)
  const ticketA = {
    id: "z-ticket",
    seq: 1,
    status: "ready",
    createdAt: equalDate,
  };
  // ticketB has lower string ID ("a-ticket") but higher sequence (2)
  const ticketB = {
    id: "a-ticket",
    seq: 2,
    status: "attached",
    createdAt: equalDate,
  };

  const updateMany = vi.fn();
  const db = {
    cvUpload: {
      findFirst: vi
        .fn()
        .mockImplementation(async ({ where }: { where: { cvId: string } }) => {
          if (where.cvId === "cv-1") return ticketA;
          if (where.cvId === "cv-2") return ticketB;
          return null;
        }),
      updateMany,
    },
    student: {
      findUnique: vi.fn().mockResolvedValue({ cv: "cv-2" }),
    },
  } as unknown as DbClient;

  const attached = await consumeCvUpload("owner", "cv-1", db);
  expect(attached).toBe(false);
  expect(updateMany).not.toHaveBeenCalled();
});

test("attaches ticket when student profile does not have any prior CV", async () => {
  const ticket = {
    id: "ticket-1",
    status: "ready",
    createdAt: now,
  };

  const updateMany = vi.fn().mockResolvedValue({ count: 1 });
  const db = {
    cvUpload: {
      findFirst: vi.fn().mockResolvedValue(ticket),
      updateMany,
    },
    student: {
      findUnique: vi.fn().mockResolvedValue({ cv: null }),
    },
  } as unknown as DbClient;

  const attached = await consumeCvUpload("owner", "cv-1", db);
  expect(attached).toBe(true);
  expect(updateMany).toHaveBeenCalledWith({
    where: { id: "ticket-1", status: "ready" },
    data: { status: "attached" },
  });
});

test("attaches ticket during signup when student record does not exist yet", async () => {
  const ticket = {
    id: "ticket-1",
    status: "ready",
    createdAt: now,
  };

  const updateMany = vi.fn().mockResolvedValue({ count: 1 });
  const db = {
    cvUpload: {
      findFirst: vi.fn().mockResolvedValue(ticket),
      updateMany,
    },
    student: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  } as unknown as DbClient;

  const attached = await consumeCvUpload("owner", "cv-1", db);
  expect(attached).toBe(true);
  expect(updateMany).toHaveBeenCalledWith({
    where: { id: "ticket-1", status: "ready" },
    data: { status: "attached" },
  });
});
