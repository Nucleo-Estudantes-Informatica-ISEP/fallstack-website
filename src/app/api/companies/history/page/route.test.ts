// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";

import { getCompanyHistoryPage } from "@/application/services/savedStudentService";
import getSession from "@/application/services/sessionService";

import { GET } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/application/services/sessionService", () => ({ default: vi.fn() }));
vi.mock("@/application/services/savedStudentService", () => ({
  getCompanyHistoryPage: vi.fn(),
}));
const cursor = {
  studentId: "123e4567-e89b-42d3-a456-426614174000",
  createdAt: "2026-11-14T12:00:00.000Z",
};
const employee = {
  role: "EMPLOYEE",
  employee: { company: { id: "own-company" } },
} as Awaited<ReturnType<typeof getSession>>;
const request = (query = new URLSearchParams(cursor).toString()) =>
  GET(new NextRequest(`http://localhost/api/companies/history/page?${query}`), {
    params: Promise.resolve({}),
  });
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSession).mockResolvedValue(employee);
});
test("uses the authenticated company with both cursor values", async () => {
  vi.mocked(getCompanyHistoryPage).mockResolvedValue({
    items: [],
    hasMore: false,
  });
  const response = await request();
  expect(response.status).toBe(200);
  expect(getCompanyHistoryPage).toHaveBeenCalledWith("own-company", cursor);
});
test.each([
  "",
  "studentId=bad",
  `studentId=${cursor.studentId}`,
  `${new URLSearchParams(cursor)}&createdAt=invalid`,
])("rejects malformed cursor %s", async (query) => {
  expect((await request(query)).status).toBe(400);
  expect(getCompanyHistoryPage).not.toHaveBeenCalled();
});
test.each([null, { role: "STUDENT" }])(
  "enforces employee authentication for %j",
  async (session) => {
    vi.mocked(getSession).mockResolvedValue(session as typeof employee);
    expect((await request()).status).toBe(session ? 403 : 401);
    expect(getCompanyHistoryPage).not.toHaveBeenCalled();
  }
);
