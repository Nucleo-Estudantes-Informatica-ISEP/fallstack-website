// @vitest-environment node
import { beforeEach, expect, test, vi } from "vitest";

import { getCompanyHistoryPage } from "./savedStudentService";

const findPage = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("../repositories/savedStudentRepository", () => ({
  findCompanyHistoryPage: findPage,
}));

const record = (index: number) => ({
  studentId: `student-${index}`,
  createdAt: new Date("2026-11-14T12:00:00.000Z"),
  comment: null,
  student: { code: `code-${index}`, name: `Student ${index}` },
  savedBy: { name: "Employee", company: { name: "Company" } },
});

beforeEach(() => findPage.mockReset());

test.each([0, 14, 15, 16])(
  "returns at most 15 records when repository returns %i",
  async (count) => {
    findPage.mockResolvedValue(
      Array.from({ length: count }, (_, i) => record(i))
    );
    const page = await getCompanyHistoryPage("company");
    expect(page.items).toHaveLength(Math.min(count, 15));
    expect(page.hasMore).toBe(count > 15);
    expect(findPage).toHaveBeenCalledWith("company", undefined);
  }
);

test("passes the cursor and company to the repository", async () => {
  findPage.mockResolvedValue([record(15)]);
  const cursor = {
    studentId: "student-14",
    createdAt: record(14).createdAt.toISOString(),
  };
  const page = await getCompanyHistoryPage("company", cursor);
  expect(findPage).toHaveBeenCalledWith("company", cursor);
  expect(page.items[0].student.name).toBe("Student 15");
  expect(page.hasMore).toBe(false);
});
