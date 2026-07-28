import { beforeEach, expect, test, vi } from "vitest";

import {
  countActionCompletions,
  findActionCompletionTimestampsSince,
  findRecentActionCompletions,
} from "../repositories/actionRepository";
import { countCompaniesForAdmin } from "../repositories/companyRepository";
import { countEmployeesForAdmin } from "../repositories/employeeRepository";
import {
  countAllSavedStudents,
  findRecentSavedStudents,
  findSavedStudentTimestampsSince,
} from "../repositories/savedStudentRepository";
import {
  countStudents,
  findRecentStudents,
  findStudentSignupTimestampsSince,
} from "../repositories/studentRepository";
import { getAdminDashboardSummary } from "./adminDashboardService";

vi.mock("server-only", () => ({}));
vi.mock("../repositories/actionRepository", () => ({
  countActionCompletions: vi.fn(),
  findActionCompletionTimestampsSince: vi.fn(),
  findRecentActionCompletions: vi.fn(),
}));
vi.mock("../repositories/companyRepository", () => ({
  countCompaniesForAdmin: vi.fn(),
}));
vi.mock("../repositories/employeeRepository", () => ({
  countEmployeesForAdmin: vi.fn(),
}));
vi.mock("../repositories/savedStudentRepository", () => ({
  countAllSavedStudents: vi.fn(),
  findRecentSavedStudents: vi.fn(),
  findSavedStudentTimestampsSince: vi.fn(),
}));
vi.mock("../repositories/studentRepository", () => ({
  countStudents: vi.fn(),
  findRecentStudents: vi.fn(),
  findStudentSignupTimestampsSince: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(countStudents).mockResolvedValue(10);
  vi.mocked(countCompaniesForAdmin).mockResolvedValue(3);
  vi.mocked(countEmployeesForAdmin).mockResolvedValue(5);
  vi.mocked(countActionCompletions).mockResolvedValue(20);
  vi.mocked(countAllSavedStudents).mockResolvedValue(7);
  vi.mocked(findRecentStudents).mockResolvedValue([]);
  vi.mocked(findRecentActionCompletions).mockResolvedValue([]);
  vi.mocked(findRecentSavedStudents).mockResolvedValue([]);
  vi.mocked(findStudentSignupTimestampsSince).mockResolvedValue([]);
  vi.mocked(findActionCompletionTimestampsSince).mockResolvedValue([]);
  vi.mocked(findSavedStudentTimestampsSince).mockResolvedValue([]);
});

test("passes the raw counts straight through", async () => {
  const summary = await getAdminDashboardSummary();

  expect(summary.studentCount).toBe(10);
  expect(summary.companyCount).toBe(3);
  expect(summary.employeeCount).toBe(5);
  expect(summary.actionCompletionCount).toBe(20);
  expect(summary.savedStudentCount).toBe(7);
});

test("merges the three activity sources into one feed, newest first", async () => {
  vi.mocked(findRecentStudents).mockResolvedValue([
    { name: "Ana", createdAt: new Date("2026-07-27T10:00:00Z") } as never,
  ]);
  vi.mocked(findRecentActionCompletions).mockResolvedValue([
    {
      completedAt: new Date("2026-07-28T09:00:00Z"),
      student: { name: "Bea" },
      action: { name: "Visit Booth" },
    } as never,
  ]);
  vi.mocked(findRecentSavedStudents).mockResolvedValue([
    {
      createdAt: new Date("2026-07-27T15:00:00Z"),
      student: { name: "Ana" },
      company: { name: "Armis" },
    } as never,
  ]);

  const { recentActivity } = await getAdminDashboardSummary();

  expect(recentActivity).toHaveLength(3);
  expect(recentActivity[0]).toMatchObject({
    type: "scan",
    label: 'Bea completou "Visit Booth"',
  });
  expect(recentActivity[1]).toMatchObject({
    type: "save",
    label: "Armis guardou Ana",
  });
  expect(recentActivity[2]).toMatchObject({
    type: "signup",
    label: "Ana juntou-se à Fallstack",
  });
});

test("fetches at least 15 events per source, so a single busy source can't hide a true top-15 event", async () => {
  await getAdminDashboardSummary();

  expect(findRecentStudents).toHaveBeenCalledWith(15);
  expect(findRecentActionCompletions).toHaveBeenCalledWith(15);
  expect(findRecentSavedStudents).toHaveBeenCalledWith(15);
});

test("doesn't drop the true most-recent events when one source is far busier than the others", async () => {
  // 15 scans, all newer than every signup/save below - the real top 15.
  const scans = Array.from({ length: 15 }, (_, i) => ({
    completedAt: new Date(Date.UTC(2026, 6, 28, 12, i)),
    student: { name: `Scanner ${i}` },
    action: { name: "Visit Booth" },
  }));
  // Older events that must NOT displace any of the scans above.
  const olderSignups = Array.from({ length: 5 }, (_, i) => ({
    name: `Student ${i}`,
    createdAt: new Date(Date.UTC(2026, 6, 27, 12, i)),
  }));
  vi.mocked(findRecentActionCompletions).mockResolvedValue(scans as never);
  vi.mocked(findRecentStudents).mockResolvedValue(olderSignups as never);

  const { recentActivity } = await getAdminDashboardSummary();

  expect(recentActivity).toHaveLength(15);
  expect(recentActivity.every((event) => event.type === "scan")).toBe(true);
});

test("caps the merged feed at 15 events even when more are available", async () => {
  const many = Array.from({ length: 10 }, (_, i) => ({
    name: `Student ${i}`,
    createdAt: new Date(Date.UTC(2026, 6, 28, i)),
  }));
  vi.mocked(findRecentStudents).mockResolvedValue(many as never);
  vi.mocked(findRecentActionCompletions).mockResolvedValue(
    many.map((s) => ({
      completedAt: s.createdAt,
      student: { name: s.name },
      action: { name: "Action" },
    })) as never
  );

  const { recentActivity } = await getAdminDashboardSummary();

  expect(recentActivity).toHaveLength(15);
});

test("buckets weekly activity by day, including days with zero events", async () => {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  vi.mocked(findStudentSignupTimestampsSince).mockResolvedValue([
    { createdAt: today } as never,
    { createdAt: today } as never,
  ]);
  vi.mocked(findActionCompletionTimestampsSince).mockResolvedValue([
    { completedAt: yesterday } as never,
  ]);

  const { weeklyActivity } = await getAdminDashboardSummary();

  expect(weeklyActivity).toHaveLength(7);
  const todayBucket = weeklyActivity.find(
    (day) => day.date === today.toISOString().slice(0, 10)
  );
  const yesterdayBucket = weeklyActivity.find(
    (day) => day.date === yesterday.toISOString().slice(0, 10)
  );
  expect(todayBucket).toMatchObject({ signups: 2, scans: 0, saves: 0 });
  expect(yesterdayBucket).toMatchObject({ signups: 0, scans: 1, saves: 0 });
});
