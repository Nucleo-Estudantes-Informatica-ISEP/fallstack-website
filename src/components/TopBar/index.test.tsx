import { usePathname } from "next/navigation";
import { render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import TopBar from "@/components/TopBar";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));
const { session } = vi.hoisted(() => ({
  session: { user: null as object | null, ready: true },
}));
vi.mock("@/hooks/useSession", () => ({ default: () => session }));
afterEach(() => {
  session.ready = true;
});
vi.mock("@/components/LogoutButton", () => ({ default: () => null }));
vi.mock("@/components/Profile/UserButton", () => ({
  default: () => <span>O meu perfil</span>,
}));

test("shows sign in on the homepage", () => {
  vi.mocked(usePathname).mockReturnValue("/");
  session.user = null;
  render(<TopBar />);
  expect(screen.getByRole("link", { name: "Iniciar sessão" })).toHaveAttribute(
    "href",
    "/login"
  );
});

test("shows profile navigation on the homepage when signed in", () => {
  vi.mocked(usePathname).mockReturnValue("/");
  session.user = {};
  render(<TopBar />);
  expect(screen.getByText("O meu perfil")).toBeInTheDocument();
});

test("keeps account navigation available on other pages", () => {
  vi.mocked(usePathname).mockReturnValue("/privacy-policy");
  session.user = null;
  render(<TopBar />);
  expect(screen.getByRole("navigation")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Iniciar sessão" })).toHaveAttribute(
    "href",
    "/login"
  );
});

test("offers neither sign in nor profile while the session is unresolved", () => {
  // A returning student must not briefly be offered "Iniciar sessão" on the
  // statically generated homepage before their session arrives.
  vi.mocked(usePathname).mockReturnValue("/");
  session.user = null;
  session.ready = false;
  render(<TopBar />);
  expect(screen.getByRole("navigation")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Iniciar sessão" })).toBeNull();
  expect(screen.queryByText("O meu perfil")).toBeNull();
});

test("renders language switcher button", () => {
  vi.mocked(usePathname).mockReturnValue("/");
  render(<TopBar />);
  expect(
    screen.getByRole("button", { name: /selecionar idioma/i })
  ).toBeInTheDocument();
});

test("shows attendance scanner shortcut in topbar for admins", () => {
  vi.mocked(usePathname).mockReturnValue("/");
  session.user = { role: null, adminRole: "ADMIN", student: null };
  render(<TopBar />);
  expect(
    screen.getByRole("link", { name: "Scanner de presenças" })
  ).toHaveAttribute("href", "/attendance/scan");
});

test("does not duplicate attendance scanner shortcut when primary destination is already staff", () => {
  vi.mocked(usePathname).mockReturnValue("/");
  session.user = {
    role: null,
    adminRole: null,
    student: null,
    neiMember: true,
  };
  render(<TopBar />);
  expect(
    screen.queryByRole("link", { name: "Scanner de presenças" })
  ).toBeNull();
});

test.each([null, { code: "ABC123", name: "Admin" }])(
  "admins can reach their own student profile: %j",
  (student) => {
    vi.mocked(usePathname).mockReturnValue("/overview");
    session.user = {
      role: student ? "STUDENT" : null,
      adminRole: "ADMIN",
      student,
    };
    render(<TopBar />);
    expect(
      screen.getByRole("link", { name: "O meu perfil de estudante" })
    ).toHaveAttribute("href", student ? "/student/ABC123" : "/signup");
  }
);
