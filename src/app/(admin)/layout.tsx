import SessionAuthLayout from "@/components/SessionAuthLayout";
import Topbar from "@/components/TopBar";

export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionAuthLayout>
      <Topbar />
      <main id="main-content">{children}</main>
    </SessionAuthLayout>
  );
}
