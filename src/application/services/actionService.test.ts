import { expect, test, vi } from "vitest";

import { signJwt } from "@/application/services/authService";

import {
  findActionByCompanyId,
  findActionById,
} from "../repositories/actionRepository";
import { findStudentByCode } from "../repositories/studentRepository";
import { completeCompanyBoothAction, getActionQrCode } from "./actionService";

vi.mock("server-only", () => ({}));
vi.mock("@/config", () => ({
  default: { constants: { actionQrCodeRefreshRateMs: 15_000 } },
}));
vi.mock("@/application/services/authService", () => ({ signJwt: vi.fn() }));
vi.mock("../repositories/actionRepository", () => ({
  createActionCompletion: vi.fn(),
  findActionByCompanyId: vi.fn(),
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

test("does nothing for a company with no booth action assigned", async () => {
  vi.mocked(findActionByCompanyId).mockResolvedValue(null);
  vi.mocked(findStudentByCode).mockResolvedValue({
    id: "student-1",
  } as Awaited<ReturnType<typeof findStudentByCode>>);

  await expect(
    completeCompanyBoothAction("student-code", "company-1")
  ).resolves.toBeNull();
});

test("completes the booth action linked to the company", async () => {
  vi.mocked(findActionByCompanyId).mockResolvedValue({
    id: "action-1",
  } as Awaited<ReturnType<typeof findActionByCompanyId>>);
  vi.mocked(findStudentByCode).mockResolvedValue({
    id: "student-1",
  } as Awaited<ReturnType<typeof findStudentByCode>>);

  await completeCompanyBoothAction("student-code", "company-1");

  expect(findActionByCompanyId).toHaveBeenCalledWith(
    "company-1",
    expect.anything()
  );
});
