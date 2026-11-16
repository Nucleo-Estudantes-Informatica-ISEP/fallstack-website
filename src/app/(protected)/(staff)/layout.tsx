import SessionAuthLayout from "@/components/SessionAuthLayout";
import Topbar from "@/components/TopBar";

export const dynamic = "force-dynamic";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionAuthLayout>
      <Topbar solid />
      {/* Light page on the dark-themed root: set the text colour here so
          nothing inherits the public site's white text. */}
      <main id="main-content" className="bg-gray-50 pt-16 text-gray-900">
        {children}
      </main>
    </SessionAuthLayout>
  );
}
