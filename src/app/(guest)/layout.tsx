import DocumentLayout from "@/components/DocumentLayout";
import GuestLayout from "@/components/GuestLayout";
import { branding } from "@/edition/branding";

export const metadata = branding.metadata;
export const revalidate = 60;
// Fail generation if a server component starts reading request-specific data.
export const dynamic = "error";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DocumentLayout>
      <GuestLayout>{children}</GuestLayout>
    </DocumentLayout>
  );
}
