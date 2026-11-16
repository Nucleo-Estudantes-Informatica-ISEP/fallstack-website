import type { ReactElement } from "react";
import { beforeEach, expect, test, vi } from "vitest";

import { getTodaysAttendanceSessions } from "@/application/services/sessionCheckInService";
import getServerSession from "@/application/services/sessionService";

import ScanPage from "./page";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  forbidden: () => {
    throw new Error("forbidden");
  },
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
vi.mock("@/application/services/sessionService", () => ({ default: vi.fn() }));
vi.mock("@/application/services/sessionCheckInService", () => ({
  getTodaysAttendanceSessions: vi.fn(),
}));
vi.mock("@/components/AttendanceScanner", () => ({ default: () => null }));

const todaySessions = [
  {
    id: "talk",
    title: "Cloud",
    startTime: "10:00",
    endTime: "11:00",
    start: "2026-11-17T10:00:00.000Z",
    end: "2026-11-17T11:00:00.000Z",
    dayTitle: "17 de Novembro",
  },
];

const props = (session?: string) => ({
  searchParams: Promise.resolve(session ? { session } : {}),
});

type ScannerElement = ReactElement<{
  sessions: unknown[];
  staffName: string;
  initialSessionId: string | null;
}>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getTodaysAttendanceSessions).mockResolvedValue(todaySessions);
});

test.each([
  [
    "a student",
    {
      email: "s@isep.ipp.pt",
      role: "STUDENT",
      adminRole: null,
      neiMember: false,
      student: { name: "S" },
      employee: null,
    },
  ],
  [
    "a company employee",
    {
      email: "e@company.pt",
      role: "EMPLOYEE",
      adminRole: null,
      neiMember: false,
      student: null,
      employee: { company: {} },
    },
  ],
])("forbids %s before reading sessions", async (_label, session) => {
  vi.mocked(getServerSession).mockResolvedValue(session as never);
  await expect(ScanPage(props())).rejects.toThrow("forbidden");
  expect(getTodaysAttendanceSessions).not.toHaveBeenCalled();
});

test("redirects an anonymous visitor to AuthNEI login", async () => {
  vi.mocked(getServerSession).mockResolvedValue(null);
  await expect(ScanPage(props())).rejects.toThrow(
    "redirect:/api/auth/login?next=%2Fattendance%2Fscan"
  );
});

test("renders for an NEI member after the five-minute bound", async () => {
  vi.mocked(getServerSession).mockResolvedValue({
    email: "coord@nei-isep.org",
    authName: "Coordenador",
    role: null,
    adminRole: null,
    neiMember: true,
    attendanceExpiresAt: 0,
    student: null,
    employee: null,
  } as never);
  const element = (await ScanPage(props())) as ScannerElement;
  expect(element.props.sessions).toEqual(todaySessions);
  expect(element.props.staffName).toBe("Coordenador");
  expect(element.props.initialSessionId).toBeNull();
});

test("renders for an admin without a student profile", async () => {
  vi.mocked(getServerSession).mockResolvedValue({
    email: "admin@nei-isep.org",
    role: null,
    adminRole: "ADMIN",
    neiMember: false,
    student: null,
    employee: null,
  } as never);
  const element = (await ScanPage(props())) as ScannerElement;
  expect(element.props.staffName).toBe("admin@nei-isep.org");
});

test("ignores a session param that is not today", async () => {
  vi.mocked(getServerSession).mockResolvedValue({
    email: "x",
    adminRole: null,
    neiMember: true,
    student: { name: "Ana" },
  } as never);
  const element = (await ScanPage(props("old"))) as ScannerElement;
  expect(element.props.initialSessionId).toBeNull();
  expect(element.props.staffName).toBe("Ana");
});

test("keeps a session param that is today", async () => {
  vi.mocked(getServerSession).mockResolvedValue({
    email: "x",
    adminRole: null,
    neiMember: true,
    student: { name: "Ana" },
  } as never);
  const element = (await ScanPage(props("talk"))) as ScannerElement;
  expect(element.props.initialSessionId).toBe("talk");
});
