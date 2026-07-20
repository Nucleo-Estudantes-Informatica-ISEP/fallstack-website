"use client";

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

const sections: AdminNavSection[] = [
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

const AdminSidebar: React.FC = () => {
  const pathname = usePathname();
  const logsUrl = clientEnv.NEXT_PUBLIC_LOGS_DASHBOARD_URL;

  return (
    <nav
      aria-label="Admin"
      className="sticky top-16 hidden h-[calc(100vh-4rem)] w-56 shrink-0 overflow-y-auto border-r border-gray-200 bg-white p-4 md:block"
    >
      <ul className="flex flex-col gap-6">
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
                      aria-current={isActive ? "page" : undefined}
                      className={`block rounded-md px-2 py-1.5 text-sm transition-colors ${
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
              className="block rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
            >
              Open dashboard ↗
            </a>
          </li>
        )}
      </ul>
    </nav>
  );
};

export default AdminSidebar;
