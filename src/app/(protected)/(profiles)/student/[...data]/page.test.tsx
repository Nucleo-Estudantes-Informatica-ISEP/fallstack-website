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
  interests: [],
  user: { email: "ana@isep.ipp.pt" },
};

beforeEach(async () => {
  vi.clearAllMocks();

  const { getStudent } = await import("@/application/services/studentService");
  vi.mocked(getStudent).mockResolvedValue(STUDENT as never);

  const { getStudentActions } =
    await import("@/application/services/actionService");
  vi.mocked(getStudentActions).mockResolvedValue([]);

  const { getCompanies } =
    await import("@/application/services/companyService");
  vi.mocked(getCompanies).mockResolvedValue([]);

  const { getInterests } =
    await import("@/application/services/interestService");
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
  return StudentPage({
    params: Promise.resolve({ data: [code] }),
    searchParams: Promise.resolve({}),
  });
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
  const { isSaved } =
    await import("@/application/services/savedStudentService");
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
  const { isSaved } =
    await import("@/application/services/savedStudentService");
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

// ---------------------------------------------------------------------------
// Which view each employee/admin case renders (pinned before the #516
// restyle, which must not change any of these outcomes).
// ---------------------------------------------------------------------------

const EMPLOYEE_SESSION = {
  id: "u3",
  role: "EMPLOYEE",
  adminRole: null,
  student: null,
  employee: { id: "e1", name: "Rui", companyId: "c1", company: { id: "c1" } },
};

function renderPreviewFor(tokenOrCode: string) {
  return StudentPage({
    params: Promise.resolve({ data: [tokenOrCode, "preview"] }),
    searchParams: Promise.resolve({}),
  });
}

// Depth-first search of the element tree the server component returns.
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

async function views() {
  return {
    Preview: (
      await import("@/components/Profile/PreviewProfileSectionContainer")
    ).default,
    CompanyView: (
      await import("@/components/Companies/CompanyProfile/CompanyViewProfileSectionContainer")
    ).default,
    Public: (await import("@/components/Profile/PublicProfileSectionContainer"))
      .default,
  };
}

async function asEmployee({ saved }: { saved: boolean }) {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(EMPLOYEE_SESSION as never);
  const { isSaved } =
    await import("@/application/services/savedStudentService");
  vi.mocked(isSaved).mockResolvedValue(saved);
}

async function withSignedToken(code: string | null) {
  const { verifyJwt } = await import("@/application/services/authService");
  vi.mocked(verifyJwt).mockReturnValue(code ? ({ code } as never) : null);
}

test("an employee with a valid signed token sees the not-yet-saved preview", async () => {
  await asEmployee({ saved: false });
  await withSignedToken("S123");

  const result = await renderPreviewFor("signed-token");

  const preview = findByType(result, (await views()).Preview);
  assert.ok(preview, "expected the preview view");
  assert.equal(preview.props.isCompanyView, true);
  assert.equal(preview.props.isSavedStudent, false);
  assert.equal(preview.props.token, "signed-token");
  const { getStudent } = await import("@/application/services/studentService");
  assert.deepEqual(vi.mocked(getStudent).mock.calls.at(-1), ["S123"]);
});

test("an employee with a valid signed token sees the saved preview once saved", async () => {
  await asEmployee({ saved: true });
  await withSignedToken("S123");

  const result = await renderPreviewFor("signed-token");

  const preview = findByType(result, (await views()).Preview);
  assert.ok(preview, "expected the preview view");
  assert.equal(preview.props.isSavedStudent, true);
});

test("an employee opening a plain-code preview of a saved student sees the saved preview", async () => {
  await asEmployee({ saved: true });
  await withSignedToken(null);

  const result = await renderPreviewFor("S123");

  const preview = findByType(result, (await views()).Preview);
  assert.ok(preview, "expected the preview view");
  assert.equal(preview.props.isCompanyView, true);
  assert.equal(preview.props.isSavedStudent, true);
});

test("an employee opening a plain-code preview of an unsaved student is blocked", async () => {
  await asEmployee({ saved: false });
  await withSignedToken(null);

  const result = await renderPreviewFor("S123");

  assert.equal(isBlocked(result), true);
});

test("a student opening a plain-code preview of another student is blocked", async () => {
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
  await withSignedToken(null);

  const result = await renderPreviewFor("S123");

  assert.equal(isBlocked(result), true);
});

test("an employee opening an invalid or expired preview token is blocked", async () => {
  await asEmployee({ saved: false });
  await withSignedToken(null);
  const { getStudent } = await import("@/application/services/studentService");
  vi.mocked(getStudent).mockResolvedValue(null as never);

  const result = await renderPreviewFor("expired.or.invalid-token");

  assert.equal(isBlocked(result), true);
});

test("an employee whose company saved the student sees the company view of /student/<code>", async () => {
  await asEmployee({ saved: true });

  const result = await renderFor("S123");

  const view = findByType(result, (await views()).CompanyView);
  assert.ok(view, "expected the company view");
  assert.equal((view.props.student as { code: string }).code, "S123");
  assert.equal(findByType(result, (await views()).Public), null);
});

test("an admin without a profile sees the public view of /student/<code>", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue({
    id: "u5",
    role: null,
    adminRole: "ADMIN",
    student: null,
    employee: null,
  } as never);

  const result = await renderFor("S123");

  const { Public, CompanyView } = await views();
  assert.ok(findByType(result, Public), "expected the public view");
  assert.equal(findByType(result, CompanyView), null);
});
