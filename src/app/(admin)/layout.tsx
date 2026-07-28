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
      <div className="flex min-h-screen pt-16">
        <AdminSidebar isSuperAdmin={session.adminRole === "SUPER_ADMIN"} />
        <main id="main-content" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </SessionAuthLayout>
  );
}
