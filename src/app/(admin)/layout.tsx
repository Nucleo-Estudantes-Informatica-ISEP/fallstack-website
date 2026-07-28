import { notFound } from "next/navigation";

import AdminSidebar from "@/components/AdminSidebar";
import SessionAuthLayout from "@/components/SessionAuthLayout";
import Topbar from "@/components/TopBar";
import getServerSession from "@/application/services/sessionService";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session || !session.adminRole) {
    notFound();
  }

  return (
    <SessionAuthLayout>
      <Topbar solid />
      {/* The public site's :root sets a global white text color for its
          dark theme (globals.css) - the admin backoffice is a light theme
          on top of the same root, so anything here that doesn't set its
          own text color (e.g. a plain outline button) silently inherits
          that white instead, on a white page, and disappears. Setting the
          light theme's own default here is the fix, not patching every
          individual element that happens to omit a text color. */}
      <div className="flex min-h-screen bg-gray-50 pt-16 text-gray-900">
        <AdminSidebar isSuperAdmin={session.adminRole === "SUPER_ADMIN"} />
        <main id="main-content" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </SessionAuthLayout>
  );
}
