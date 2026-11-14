import DocumentLayout from "@/components/DocumentLayout";
import { branding } from "@/edition/branding";

export const dynamic = "force-dynamic";
export const metadata = branding.metadata;

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DocumentLayout>{children}</DocumentLayout>;
}
