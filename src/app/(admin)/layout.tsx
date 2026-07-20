import { notFound } from "next/navigation";

import getServerSession from "@/application/services/sessionService";
import AdminSidebar from "@/components/AdminSidebar";
import SessionAuthLayout from "@/components/SessionAuthLayout";
import Topbar from "@/components/TopBar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session || !session.isAdmin) {
    notFound();
  }

  return (
    <SessionAuthLayout>
      <Topbar />
      <div className="flex min-h-screen pt-16">
        <AdminSidebar />
        <main id="main-content" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </SessionAuthLayout>
  );
}
