import AuthPageLayout from "@/components/AuthPageLayout";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthPageLayout>{children}</AuthPageLayout>;
}
