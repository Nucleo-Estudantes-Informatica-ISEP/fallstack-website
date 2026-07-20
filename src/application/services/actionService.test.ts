import { expect, test, vi } from "vitest";

import { signJwt } from "@/services/authService";

import { findActionById } from "../repositories/actionRepository";
import { getActionQrCode } from "./actionService";

vi.mock("server-only", () => ({}));
vi.mock("@/config", () => ({
  default: { constants: { actionQrCodeRefreshRateMs: 15_000 } },
}));
vi.mock("@/services/authService", () => ({ signJwt: vi.fn() }));
vi.mock("../repositories/actionRepository", () => ({
  createActionCompletion: vi.fn(),
  findActionById: vi.fn(),
  findActionByName: vi.fn(),
  findActionCompletions: vi.fn(),
  findActions: vi.fn(),
  findVisibleActions: vi.fn(),
  toggleAction: vi.fn(),
  upsertActionCompletion: vi.fn(),
}));
vi.mock("../repositories/studentRepository", () => ({
  findStudentAction: vi.fn(),
  findStudentByCode: vi.fn(),
}));
vi.mock("../repositories/transaction", () => ({ prisma: {} }));

test("does not sign a QR token for a missing action", async () => {
  vi.mocked(findActionById).mockResolvedValue(null);

  await expect(getActionQrCode("missing")).resolves.toBeNull();
  expect(signJwt).not.toHaveBeenCalled();
});

test("signs the QR token with a real ~30s expiry, not 30000 seconds", async () => {
  vi.mocked(findActionById).mockResolvedValue({
    id: "action-1",
  } as Awaited<ReturnType<typeof findActionById>>);

  await getActionQrCode("action-1");

  expect(signJwt).toHaveBeenCalledWith(
    expect.objectContaining({ id: "action-1" }),
    expect.objectContaining({ expiresIn: 30 })
  );
});
