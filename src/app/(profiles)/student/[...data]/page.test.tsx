import assert from "node:assert/strict";
import type { ReactElement } from "react";
import { afterAll, beforeAll, beforeEach, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
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

// clientEnv (src/config/env.client.ts) validates eagerly at import time,
// unlike serverEnv - the container components this page renders pull in
// @/config/api.ts transitively, which reads clientEnv, so these need to be
// in place before ./page (and its tree) is ever imported below.
let StudentPage: typeof import("./page").default;

beforeAll(async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  // page.tsx's own import tree (ProfileSectionContainer and friends) is
  // large enough that transforming it cold exceeds the default per-test
  // timeout - import it once here, outside any single test's budget,
  // instead of dynamically inside each test below.
  StudentPage = (await import("./page")).default;
}, 90_000);

afterAll(() => {
  vi.unstubAllEnvs();
});

const STUDENT = {
  id: "s1",
  code: "S123",
  name: "Ana",
  bio: null,
  year: "LICENCIATURA_1",
  cv: null,
  linkedin: null,
  github: null,
  avatar: null,
  user: { email: "ana@isep.ipp.pt", interests: [] },
};

beforeEach(async () => {
  vi.clearAllMocks();

  const { getStudent } = await import("@/application/services/studentService");
  vi.mocked(getStudent).mockResolvedValue(STUDENT as never);

  const { getStudentActions } = await import(
    "@/application/services/actionService"
  );
  vi.mocked(getStudentActions).mockResolvedValue([]);

  const { getCompanies } = await import(
    "@/application/services/companyService"
  );
  vi.mocked(getCompanies).mockResolvedValue([]);

  const { getInterests } = await import(
    "@/application/services/interestService"
  );
  vi.mocked(getInterests).mockResolvedValue([]);

  const { getStudentHistory, getStudentStats, getTodayStudentStats, isSaved } =
    await import("@/application/services/savedStudentService");
  vi.mocked(getStudentHistory).mockResolvedValue([]);
  vi.mocked(getStudentStats).mockResolvedValue({
    totalScans: 0,
    totalSaves: 0,
  });
  vi.mocked(getTodayStudentStats).mockResolvedValue(0);
  vi.mocked(isSaved).mockResolvedValue(false);
});

// Custom404() (src/app/not-found.tsx) is called directly as a plain
// function and its returned <section> handed straight back - not wrapped
// in <Custom404 />, and not a notFound() throw - so this checks for the
// data-testid on that <section> (a signal not-found.tsx's own return
// shape is free to change around) rather than the element's tag name.
function isBlocked(element: ReactElement) {
  return (
    (element.props as { "data-testid"?: string })["data-testid"] === "not-found"
  );
}

function renderFor(code: string) {
  return StudentPage({ params: Promise.resolve({ data: [code] }) });
}

test("a student viewing their own profile is not blocked", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue({
    id: "u1",
    role: "STUDENT",
    adminRole: null,
    student: { id: "s1", code: "S123", name: "Ana" },
    employee: null,
  } as never);

  const result = await renderFor("S123");

  assert.equal(isBlocked(result), false);
});

// This is the exact #220 fix: `.match()` treated another student's code as
// a regex against the viewer's own code, so some non-identical codes could
// still "match" (e.g. one being a substring/pattern of the other) and
// leak access - `!==` is a real equality check.
test("a different student viewing someone else's profile is blocked", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue({
    id: "u2",
    role: "STUDENT",
    adminRole: null,
    student: { id: "s2", code: "S999", name: "Bea" },
    employee: null,
  } as never);

  const result = await renderFor("S123");

  assert.equal(isBlocked(result), true);
});

test("an employee whose company saved the student is not blocked", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue({
    id: "u3",
    role: "EMPLOYEE",
    adminRole: null,
    student: null,
    employee: { id: "e1", name: "Rui", companyId: "c1", company: { id: "c1" } },
  } as never);
  const { isSaved } = await import(
    "@/application/services/savedStudentService"
  );
  vi.mocked(isSaved).mockResolvedValue(true);

  const result = await renderFor("S123");

  assert.equal(isBlocked(result), false);
});

test("an employee whose company hasn't saved the student is blocked", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue({
    id: "u3",
    role: "EMPLOYEE",
    adminRole: null,
    student: null,
    employee: { id: "e1", name: "Rui", companyId: "c1", company: { id: "c1" } },
  } as never);
  const { isSaved } = await import(
    "@/application/services/savedStudentService"
  );
  vi.mocked(isSaved).mockResolvedValue(false);

  const result = await renderFor("S123");

  assert.equal(isBlocked(result), true);
});

test("no session at all is blocked", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(null);

  const result = await renderFor("S123");

  assert.equal(isBlocked(result), true);
});
