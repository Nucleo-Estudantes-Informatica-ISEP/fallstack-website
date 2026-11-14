import DocumentLayout from "@/components/DocumentLayout";
import GuestLayout from "@/components/GuestLayout";
import { branding } from "@/edition/branding";

export const metadata = branding.metadata;
export const revalidate = 60;

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
