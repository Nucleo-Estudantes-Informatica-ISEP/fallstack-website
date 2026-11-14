// @vitest-environment node
import { beforeEach, expect, test, vi } from "vitest";

const findMany = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("./database", () => ({ default: { savedStudent: { findMany } } }));

import { findCompanyHistoryPage } from "./savedStudentRepository";

beforeEach(() => findMany.mockReset());

test("first page is scoped, ordered and limited", async () => {
  findMany.mockResolvedValue([]);
  await findCompanyHistoryPage("company");
  expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { companyId: "company" },
    orderBy: [{ createdAt: "desc" }, { studentId: "desc" }],
    take: 16,
  }));
});

test("cursor filters by date and student without requiring a cursor row", async () => {
  findMany.mockResolvedValue([]);
  const cursor = { studentId: "student", createdAt: new Date("2026-11-14T12:00:00.123Z") };
  await findCompanyHistoryPage("company", cursor);
  const args = findMany.mock.calls[0][0];
  expect(args.where).toEqual({
    companyId: "company",
    OR: [
      { createdAt: { lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, studentId: { lt: cursor.studentId } },
    ],
  });
  expect(args).not.toHaveProperty("cursor");
  expect(args).not.toHaveProperty("skip");
  expect(args.take).toBe(16);
});
