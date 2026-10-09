import { NextRequest } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";

import { HttpError } from "@/types/HttpError";
import getServerSession from "@/application/services/sessionService";
import { deleteStudentForAdmin } from "@/application/services/studentService";

import { DELETE } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/application/services/sessionService", () => ({ default: vi.fn() }));
vi.mock("@/application/services/studentService", () => ({
  deleteStudentForAdmin: vi.fn(),
  updateStudentForAdmin: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getServerSession).mockResolvedValue({
    adminRole: "ADMIN",
  } as never);
  vi.mocked(deleteStudentForAdmin).mockReset();
});

const request = () =>
  DELETE(
    new NextRequest("https://fallstack.pt/api/admin/students/student-id", {
      method: "DELETE",
    }),
    { params: Promise.resolve({ id: "student-id" }) }
  );

test.each([
  [404, "Account not found"],
  [429, "A Wallet operation is already in progress. Retry shortly."],
  [502, "Unable to revoke Google Wallet pass. Retry account deletion."],
  [503, "Google Wallet is not configured"],
] as const)(
  "DELETE maps service errors to %s and the JSON error contract",
  async (status, message) => {
    vi.mocked(deleteStudentForAdmin).mockRejectedValue(
      new HttpError(message, status)
    );
    const response = await request();
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({ error: message });
  }
);

test("DELETE returns an empty 204 after successful revocation and deletion", async () => {
  const response = await request();
  expect(deleteStudentForAdmin).toHaveBeenCalledWith("student-id");
  expect(response.status).toBe(204);
  await expect(response.text()).resolves.toBe("");
});

test("DELETE denies unauthenticated requests before deletion", async () => {
  vi.mocked(getServerSession).mockResolvedValue(null);
  const response = await request();
  expect(response.status).toBe(401);
  await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  expect(deleteStudentForAdmin).not.toHaveBeenCalled();
});
