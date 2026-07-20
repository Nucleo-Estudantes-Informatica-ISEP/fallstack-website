import { notFound } from "next/navigation";

import getServerSession from "@/application/services/sessionService";
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
      <main id="main-content">{children}</main>
    </SessionAuthLayout>
  );
}
