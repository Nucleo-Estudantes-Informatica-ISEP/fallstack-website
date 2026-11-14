import { beforeEach, expect, test, vi } from "vitest";

import { getAttendanceExport } from "@/application/services/attendanceExportService";
import getServerSession from "@/application/services/sessionService";

import AttendancePage from "./page";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not found");
  },
}));
vi.mock("@/application/services/sessionService", () => ({ default: vi.fn() }));
vi.mock("@/application/services/attendanceExportService", () => ({
  getAttendanceExport: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/components/AttendanceExport", () => ({ default: () => null }));
beforeEach(() => vi.clearAllMocks());
test.each([null, { adminRole: null, authRoles: ["nei-member"] }])(
  "rejects non-admin before reading attendance",
  async (session) => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    await expect(AttendancePage()).rejects.toThrow("not found");
    expect(getAttendanceExport).not.toHaveBeenCalled();
  }
);
test("loads both days for an admin", async () => {
  vi.mocked(getServerSession).mockResolvedValue({
    adminRole: "ADMIN",
  } as never);
  await AttendancePage();
  expect(vi.mocked(getAttendanceExport).mock.calls).toEqual([[1], [2]]);
});
