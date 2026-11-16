import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeAll, beforeEach, expect, test, vi } from "vitest";

import ProfileSectionContainer from "@/components/Profile/ProfileSectionContainer";

// What the student's own /student/<code> renders and with which data.
// Access rules (another student, employees, no session) are in page.test.tsx.
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
  headers: vi.fn().mockResolvedValue(new Headers()),
}));
vi.mock("@/application/services/sessionService", () => ({
  default: vi.fn(),
}));
vi.mock("@/application/services/studentService", () => ({
  getStudent: vi.fn(),
}));
vi.mock("@/application/services/actionService", () => ({
  getStudentActions: vi.fn(),
}));
vi.mock("@/application/services/authService", () => ({ verifyJwt: vi.fn() }));
vi.mock("@/application/services/companyService", () => ({
  getCompanies: vi.fn(),
}));
vi.mock("@/application/services/interestService", () => ({
  getInterests: vi.fn(),
}));
vi.mock("@/application/services/savedStudentService", () => ({
  getStudentHistory: vi.fn(),
  getStudentStats: vi.fn(),
  getTodayStudentStats: vi.fn(),
  isSaved: vi.fn(),
}));
vi.mock("@/components/Profile/ProfileSectionContainer", () => ({
  default: () => null,
}));
vi.mock("@/components/Profile/PublicProfileSectionContainer", () => ({
  default: () => null,
}));
vi.mock("@/components/Profile/PreviewProfileSectionContainer", () => ({
  default: () => null,
}));
vi.mock(
  "@/components/Companies/CompanyProfile/CompanyViewProfileSectionContainer",
  () => ({ default: () => null })
);
vi.mock("@/components/Footer", () => ({ default: () => null }));

let StudentPage: typeof import("./page").default;

beforeAll(async () => {
  StudentPage = (await import("./page")).default;
}, 90_000);

const STUDENT = {
  id: "s1",
  code: "Z100",
  name: "Carolina",
  bio: null,
  year: "LICENCIATURA_2",
  course: "Engenharia Informática",
  cv: null,
  cvPurgedAt: null,
  linkedin: null,
  github: null,
  avatar: null,
  interests: [{ id: "i1", name: { PT: "Redes", EN: "Networks" } }],
  user: { email: "carolina@example.com" },
};

const saved = (companyId: string, companyName: string, createdAt: string) => ({
  studentId: "s1",
  createdAt: new Date(createdAt),
  comment: null,
  student: { code: "Z100", name: "Carolina" },
  savedBy: {
    name: `Recrutador ${companyName}`,
    companyId,
    company: { name: companyName },
  },
});

const ACTION = {
  id: "a1",
  name: "Cria o teu Perfil",
  description: "Cria o teu perfil",
  points: 1,
  altText: null,
  isLive: false,
  isVisible: true,
  done: true,
};

function find(
  node: ReactNode,
  type: unknown
): ReactElement<Record<string, unknown>> | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = find(child, type);
      if (found) return found;
    }
    return null;
  }
  if (!isValidElement<{ children?: ReactNode }>(node)) return null;
  if (node.type === type) return node as ReactElement<Record<string, unknown>>;
  return find(node.props.children, type);
}

beforeEach(async () => {
  vi.clearAllMocks();
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue({
    id: "u1",
    role: "STUDENT",
    adminRole: null,
    student: { id: "s1", code: "Z100", name: "Carolina" },
    employee: null,
  } as never);

  const { getStudent } = await import("@/application/services/studentService");
  vi.mocked(getStudent).mockResolvedValue(STUDENT as never);
  const { getStudentActions } =
    await import("@/application/services/actionService");
  vi.mocked(getStudentActions).mockResolvedValue([ACTION] as never);
  const { getCompanies } =
    await import("@/application/services/companyService");
  vi.mocked(getCompanies).mockResolvedValue([
    { id: "c1" },
    { id: "c2" },
    { id: "c3" },
    { id: "c4" },
  ] as never);
  const { getInterests } =
    await import("@/application/services/interestService");
  vi.mocked(getInterests).mockResolvedValue([
    { id: "i1", name: { PT: "Redes", EN: "Networks" } },
  ] as never);
  const { getStudentHistory, getStudentStats, getTodayStudentStats } =
    await import("@/application/services/savedStudentService");
  vi.mocked(getStudentHistory).mockResolvedValue([
    saved("c1", "Alfa", "2026-11-15T09:00:00.000Z"),
    saved("c2", "Beta", "2026-11-14T09:00:00.000Z"),
  ] as never);
  vi.mocked(getStudentStats).mockResolvedValue({
    totalScans: 2,
    totalSaves: 2,
  });
  vi.mocked(getTodayStudentStats).mockResolvedValue(1);
});

test("the student's own code renders the dashboard with their data", async () => {
  const page = await StudentPage({
    params: Promise.resolve({ data: ["Z100"] }),
    searchParams: Promise.resolve({ lang: "pt" }),
  });

  const dashboard = find(page, ProfileSectionContainer);
  expect(dashboard).not.toBeNull();
  const props = dashboard!.props;

  expect(props.globalStats).toEqual({ totalScans: 2, totalSaves: 2 });
  expect(props.todayStats).toBe(1);
  // Four companies in the edition, two of them saved this student.
  expect(props.companiesLeft).toBe(2);
  expect(props.historyData).toEqual([
    expect.objectContaining({
      createdAt: "2026-11-15T09:00:00.000Z",
      savedBy: { name: "Recrutador Alfa", company: { name: "Alfa" } },
    }),
    expect.objectContaining({
      createdAt: "2026-11-14T09:00:00.000Z",
      savedBy: { name: "Recrutador Beta", company: { name: "Beta" } },
    }),
  ]);
  expect(props.actions).toEqual([ACTION]);
  expect(props.interestIds).toEqual(["i1"]);
  expect(props.student).toEqual(
    expect.objectContaining({
      code: "Z100",
      name: "Carolina",
      user: { email: "carolina@example.com" },
    })
  );

  const { getStudentHistory } =
    await import("@/application/services/savedStudentService");
  expect(getStudentHistory).toHaveBeenCalledWith("s1");
});
