// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";

import { getCompanyHistoryPage } from "@/application/services/savedStudentService";
import getServerSession from "@/application/services/sessionService";

import { GET } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/application/services/sessionService", () => ({ default: vi.fn() }));
vi.mock("@/application/services/savedStudentService", () => ({
  getCompanyHistoryPage: vi.fn(),
}));

const valid =
  "?studentId=00000000-0000-4000-8000-000000000001&createdAt=2026-11-14T12%3A00%3A00.123Z";
const request = (query: string) =>
  GET(new NextRequest(`http://localhost/api/companies/history/page${query}`), {
    params: Promise.resolve({}),
  });

beforeEach(() => vi.clearAllMocks());

test("rejects unauthenticated requests", async () => {
  vi.mocked(getServerSession).mockResolvedValue(null);
  expect((await request(valid)).status).toBe(401);
});

test("rejects non-employees", async () => {
  vi.mocked(getServerSession).mockResolvedValue({
    role: "STUDENT",
    student: {},
    employee: null,
    adminRole: null,
  } as never);
  expect((await request(valid)).status).toBe(403);
});

test("rejects invalid cursors", async () => {
  vi.mocked(getServerSession).mockResolvedValue({
    role: "EMPLOYEE",
    employee: { company: { id: "company" } },
    adminRole: null,
  } as never);
  const response = await request("?studentId=bad&createdAt=invalid");
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "Invalid cursor" });
  expect(getCompanyHistoryPage).not.toHaveBeenCalled();
});

test("passes a validated cursor and the session company", async () => {
  vi.mocked(getServerSession).mockResolvedValue({
    role: "EMPLOYEE",
    employee: { company: { id: "company" } },
    adminRole: null,
  } as never);
  vi.mocked(getCompanyHistoryPage).mockResolvedValue({
    items: [],
    hasMore: false,
  });
  expect((await request(valid)).status).toBe(200);
  expect(getCompanyHistoryPage).toHaveBeenCalledWith("company", {
    studentId: "00000000-0000-4000-8000-000000000001",
    createdAt: new Date("2026-11-14T12:00:00.123Z"),
  });
});
