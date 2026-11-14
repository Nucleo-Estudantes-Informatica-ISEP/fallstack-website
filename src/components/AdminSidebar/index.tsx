"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { clientEnv } from "@/config/env.client";

interface AdminNavItem {
  label: string;
  href: string;
}

interface AdminNavSection {
  label: string;
  items: AdminNavItem[];
}

interface AdminSidebarProps {
  isSuperAdmin: boolean;
}

const baseSections: AdminNavSection[] = [
  {
    label: "Users",
    items: [
      { label: "Students", href: "/students" },
      { label: "Employees", href: "/employees" },
    ],
  },
  {
    label: "Domain",
    items: [
      { label: "Actions", href: "/actions" },
      { label: "Interests", href: "/interests" },
    ],
  },
  {
    label: "Edition",
    items: [
      { label: "Sponsors", href: "/sponsors" },
      { label: "Companies", href: "/companies" },
      { label: "Schedule", href: "/schedule" },
      { label: "FAQs", href: "/faqs" },
    ],
  },
  {
    label: "Files",
    items: [{ label: "Storage", href: "/storage" }],
  },
  {
    label: "Statistics",
    items: [{ label: "Overview", href: "/statistics" }],
  },
];

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isSuperAdmin }) => {
  const pathname = usePathname();
  const logsUrl = clientEnv.NEXT_PUBLIC_LOGS_DASHBOARD_URL;

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const sections: AdminNavSection[] = baseSections.map((section) =>
    section.label === "Users" && isSuperAdmin
      ? {
          ...section,
          items: [...section.items, { label: "Admins", href: "/admins" }],
        }
      : section
  );

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
        toggleRef.current?.focus();
      }
    };

    const handleOutsideClick = (event: PointerEvent) => {
      const target = event.target;

      if (
        target instanceof Node &&
        !menuRef.current?.contains(target) &&
        !toggleRef.current?.contains(target)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("pointerdown", handleOutsideClick);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, [isMobileMenuOpen]);

  const navigation = (
    <ul className="flex flex-col gap-6">
      <li>
        <Link
          href="/overview"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-current={pathname?.startsWith("/overview") ? "page" : undefined}
          className={`ui-focus flex min-h-11 items-center rounded-md px-2 py-1.5 text-sm font-semibold transition-colors ${
            pathname?.startsWith("/overview")
              ? "bg-primary/10 text-primary"
              : "text-gray-800 hover:bg-gray-100"
          }`}
        >
          Dashboard
        </Link>
      </li>

      {sections.map((section) => (
        <li key={section.label}>
          <h2 className="mb-2 px-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
            {section.label}
          </h2>

          <ul className="flex flex-col gap-1">
            {section.items.map((item) => {
              const isActive = pathname?.startsWith(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={`ui-focus flex min-h-11 items-center rounded-md px-2 py-1.5 text-sm transition-colors ${
                      isActive
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </li>
      ))}

      {logsUrl && (
        <li>
          <h2 className="mb-2 px-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
            Logs
          </h2>
          <a
            href={logsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsMobileMenuOpen(false)}
            className="ui-focus flex min-h-11 items-center rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            Open dashboard ↗
          </a>
        </li>
      )}
    </ul>
  );

  return (
    <>
      {/* Botão do menu móvel */}
      <button
        ref={toggleRef}
        type="button"
        aria-label={
          isMobileMenuOpen
            ? "Fechar menu de administração"
            : "Abrir menu de administração"
        }
        aria-expanded={isMobileMenuOpen}
        aria-controls="admin-mobile-navigation"
        onClick={() => setIsMobileMenuOpen((open) => !open)}
        className="ui-focus fixed top-2 left-24 z-50 flex min-h-11 min-w-11 items-center justify-center rounded-md border border-white/20 bg-background text-white shadow-sm md:hidden"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="size-6"
        >
          {isMobileMenuOpen ? (
            <path d="M18 6 6 18M6 6l12 12" />
          ) : (
            <path d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Menu móvel */}
      <div
        id="admin-mobile-navigation"
        ref={menuRef}
        className={`fixed top-16 left-0 z-50 max-h-[calc(100dvh-4rem)] w-56 overflow-y-auto rounded-br-lg border border-gray-200 bg-white p-4 shadow-lg md:hidden ${
          isMobileMenuOpen ? "block" : "hidden"
        }`}
      >
        <nav aria-label="Admin móvel">{navigation}</nav>
      </div>

      {/* Menu desktop */}
      <nav
        aria-label="Admin"
        className="sticky top-16 hidden h-[calc(100vh-4rem)] w-56 shrink-0 overflow-y-auto border-r border-gray-200 bg-white p-4 md:block"
      >
        {navigation}
      </nav>
    </>
  );
};

export default AdminSidebar;
