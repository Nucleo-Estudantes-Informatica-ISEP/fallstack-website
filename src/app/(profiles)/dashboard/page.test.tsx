import assert from "node:assert/strict";
import type { ReactElement } from "react";
import { afterAll, beforeAll, beforeEach, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
  headers: vi.fn().mockResolvedValue(new Headers()),
}));
vi.mock("@/application/services/sessionService", () => ({
  default: vi.fn(),
}));
vi.mock("@/application/services/savedStudentService", () => ({
  getCompanyHistory: vi.fn(),
  getCompanyStats: vi.fn(),
}));
vi.mock("@/application/services/studentService", () => ({
  getStudents: vi.fn(),
}));
vi.mock("@/application/services/companyService", () => ({
  getCompanyInterestIds: vi.fn(),
}));
vi.mock("@/application/services/interestService", () => ({
  getInterests: vi.fn(),
}));
vi.mock("@/application/dto/companyDto", () => ({
  toCompanyDto: (company: { id: string; name: string }) => ({
    id: company.id,
    name: company.name,
  }),
}));

let Dashboard: typeof import("./page").default;
let CompanyProfileSectionContainer: unknown;

beforeAll(async () => {
  // The dashboard's client tree reads clientEnv at import time.
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  Dashboard = (await import("./page")).default;
  CompanyProfileSectionContainer = (
    await import("@/components/Companies/CompanyProfile/CompanyProfileSectionContainer")
  ).default;
}, 90_000);

afterAll(() => {
  vi.unstubAllEnvs();
});

beforeEach(async () => {
  vi.clearAllMocks();
  const { getCompanyHistory, getCompanyStats } =
    await import("@/application/services/savedStudentService");
  vi.mocked(getCompanyStats).mockResolvedValue({
    totalScans: 3,
    totalSaves: 2,
  });
  vi.mocked(getCompanyHistory).mockResolvedValue([]);
  const { getStudents } = await import("@/application/services/studentService");
  vi.mocked(getStudents).mockResolvedValue([{}, {}, {}, {}] as never);
  const { getCompanyInterestIds } =
    await import("@/application/services/companyService");
  vi.mocked(getCompanyInterestIds).mockResolvedValue(["i1"]);
  const { getInterests } =
    await import("@/application/services/interestService");
  vi.mocked(getInterests).mockResolvedValue([]);
});

async function asSession(session: unknown) {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(session as never);
}

function render() {
  return Dashboard({ searchParams: Promise.resolve({}) });
}

function isBlocked(element: ReactElement) {
  return (
    (element.props as { "data-testid"?: string })["data-testid"] === "not-found"
  );
}

function findByType(
  node: unknown,
  type: unknown
): ReactElement<Record<string, unknown>> | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findByType(child, type);
      if (found) return found;
    }
    return null;
  }
  if (!node || typeof node !== "object" || !("props" in node)) return null;
  const element = node as ReactElement<{ children?: unknown }>;
  if (element.type === type)
    return element as ReactElement<Record<string, unknown>>;
  return findByType(element.props.children, type);
}

test("no session gets the 404 page", async () => {
  await asSession(null);

  assert.equal(isBlocked(await render()), true);
});

test("a student session gets the 404 page", async () => {
  await asSession({
    id: "u1",
    role: "STUDENT",
    adminRole: null,
    student: { id: "s1", code: "S123", name: "Ana" },
    employee: null,
  });

  assert.equal(isBlocked(await render()), true);
});

test("an admin without an employee profile gets the 404 page", async () => {
  await asSession({
    id: "u5",
    role: null,
    adminRole: "SUPER_ADMIN",
    student: null,
    employee: null,
  });

  assert.equal(isBlocked(await render()), true);
});

test("an employee without a company gets the 404 page", async () => {
  await asSession({
    id: "u3",
    role: "EMPLOYEE",
    adminRole: null,
    student: null,
    employee: { id: "e1", name: "Rui", company: null },
  });

  assert.equal(isBlocked(await render()), true);
});

test("an employee with a company gets their own company dashboard", async () => {
  await asSession({
    id: "u3",
    role: "EMPLOYEE",
    adminRole: null,
    student: null,
    employee: {
      id: "e1",
      name: "Rui",
      company: { id: "c1", name: "Armis" },
    },
  });

  const result = await render();

  assert.equal(isBlocked(result), false);
  const dashboard = findByType(result, CompanyProfileSectionContainer);
  assert.ok(dashboard, "expected the company dashboard");
  assert.deepEqual(dashboard.props.company, { id: "c1", name: "Armis" });
  assert.equal(dashboard.props.employeeName, "Rui");
  assert.equal(dashboard.props.totalStudents, 4);
  const { getCompanyHistory, getCompanyStats } =
    await import("@/application/services/savedStudentService");
  // Data is always scoped to the session's own company.
  assert.deepEqual(vi.mocked(getCompanyStats).mock.calls, [["c1"]]);
  assert.deepEqual(vi.mocked(getCompanyHistory).mock.calls, [["c1"]]);
});
