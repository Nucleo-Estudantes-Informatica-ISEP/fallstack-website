import { expect, test, vi } from "vitest";

import { disconnectDatabase } from "./readinessRepository";

const clients = vi.hoisted(() => ({
  request: { $disconnect: vi.fn().mockResolvedValue(undefined) },
  readiness: { $disconnect: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("server-only", () => ({}));
vi.mock("./database", () => ({ default: clients.request }));
vi.mock("./readinessDatabase", () => ({ default: clients.readiness }));

test("shutdown disconnects both independently budgeted database pools", async () => {
  await disconnectDatabase();
  expect(clients.request.$disconnect).toHaveBeenCalledOnce();
  expect(clients.readiness.$disconnect).toHaveBeenCalledOnce();
});
