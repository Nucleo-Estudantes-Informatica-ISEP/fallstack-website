import { usePathname } from "next/navigation";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import TopBar from "@/components/TopBar";
import type { SessionDto } from "@/application/dto/sessionDto";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));
const { session, handleLogout } = vi.hoisted(() => ({
  session: { user: null as SessionDto | null, ready: true },
  handleLogout: vi.fn(),
}));
vi.mock("@/hooks/useSession", () => ({ default: () => session }));
afterEach(() => {
  session.ready = true;
  session.user = null;
  vi.clearAllMocks();
});
vi.mock("@/hooks/useLogout", () => ({
  useLogout: () => ({ handleLogout, ConfirmDialog: null }),
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
  session.user = {
    role: "STUDENT",
    adminRole: null,
    student: { code: "AB12", name: "Ana" },
  };
  render(<TopBar />);
  expect(
    screen.getByRole("link", { name: "O meu perfil" })
  ).toBeInTheDocument();
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
  expect(screen.queryByRole("link", { name: "O meu perfil" })).toBeNull();
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
    screen.getAllByRole("link", { name: "Scanner de presenças" })
  ).toHaveLength(1);
});

const englishSessions: {
  name: string;
  user: SessionDto;
  label: string;
  href: string;
  scanner: boolean;
}[] = [
  {
    name: "student",
    user: {
      role: "STUDENT",
      adminRole: null,
      student: { code: "AB12", name: "Ana" },
    },
    label: "My profile",
    href: "/student/AB12",
    scanner: false,
  },
  {
    name: "employee",
    user: { role: "EMPLOYEE", adminRole: null, student: null },
    label: "My profile",
    href: "/dashboard",
    scanner: false,
  },
  {
    name: "admin",
    user: { role: null, adminRole: "ADMIN", student: null },
    label: "Admin area",
    href: "/overview",
    scanner: true,
  },
  {
    name: "super admin",
    user: { role: null, adminRole: "SUPER_ADMIN", student: null },
    label: "Admin area",
    href: "/overview",
    scanner: true,
  },
  {
    name: "staff without a profile",
    user: { role: null, adminRole: null, student: null, neiMember: true },
    label: "Attendance scanner",
    href: "/attendance/scan",
    scanner: true,
  },
  {
    name: "staff with a profile",
    user: {
      role: "STUDENT",
      adminRole: null,
      student: { code: "AB12", name: "Ana" },
      neiMember: true,
    },
    label: "My profile",
    href: "/student/AB12",
    scanner: true,
  },
  {
    name: "incomplete signup",
    user: { role: "STUDENT", adminRole: null, student: null },
    label: "My profile",
    href: "/signup",
    scanner: false,
  },
];

test.each(englishSessions)(
  "English navigation localizes the real controls for $name",
  ({ user, label, href, scanner }) => {
    vi.mocked(usePathname).mockReturnValue("/event/en");
    session.user = user;
    render(<TopBar />);

    expect(screen.getByRole("navigation")).toHaveAttribute("lang", "en");
    expect(screen.getByRole("link", { name: label })).toHaveAttribute(
      "href",
      href
    );
    const scanners = screen.queryAllByRole("link", {
      name: "Attendance scanner",
    });
    expect(scanners).toHaveLength(scanner ? 1 : 0);
    for (const link of scanners)
      expect(link).toHaveAttribute("href", "/attendance/scan");
    expect(
      screen.queryByRole("link", {
        name: /^(O meu perfil|Área de administração|Scanner de presenças)$/,
      })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Terminar sessão" })
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(handleLogout).toHaveBeenCalledOnce();
  }
);

test("changing an authenticated page back to Portuguese updates names and navigation language", () => {
  session.user = { role: null, adminRole: "ADMIN", student: null };
  vi.mocked(usePathname).mockReturnValue("/event/en");
  const { rerender } = render(<TopBar />);
  expect(screen.getByRole("link", { name: "Admin area" })).toBeInTheDocument();

  vi.mocked(usePathname).mockReturnValue("/event/pt");
  rerender(<TopBar />);
  expect(screen.getByRole("navigation")).toHaveAttribute("lang", "pt");
  expect(
    screen.getByRole("link", { name: "Área de administração" })
  ).toHaveAttribute("href", "/overview");
  expect(
    screen.getByRole("link", { name: "Scanner de presenças" })
  ).toHaveAttribute("title", "Scanner de presenças");
  expect(
    screen.getByRole("button", { name: "Terminar sessão" })
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Sign out" })
  ).not.toBeInTheDocument();
});

test("anonymous English navigation also declares its language", () => {
  vi.mocked(usePathname).mockReturnValue("/event/en");
  render(<TopBar />);
  expect(screen.getByRole("navigation")).toHaveAttribute("lang", "en");
  expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    "/login"
  );
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
      screen.getByRole("link", {
        name: student
          ? "O meu perfil de estudante"
          : "Criar perfil de estudante",
      })
    ).toHaveAttribute("href", student ? "/student/ABC123" : "/signup");
  }
);
